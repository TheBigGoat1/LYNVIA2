"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileCheck,
  CalendarClock,
  Briefcase,
  ArrowRight,
  UserPlus,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "@/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { firestore } from "@/firebase/config";
import { useFirebase } from "@/firebase/firebase-provider";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';
import { SwissKpiCard } from '@/components/ui/swiss-kpi-card';
import {
  collection,
  getDoc,
  getDocs,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

type ClientCompany = {
  id: string;
  companyName: string;
  status: string;
};

type DashboardActivity = {
  client: string;
  document: string;
  time: string;
  avatar: string;
  clientId: string;
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const relativeTime = (dateLike: unknown, t: (key: string) => string): string => {
  const date =
    typeof dateLike === "object" && dateLike && "toDate" in (dateLike as any)
      ? (dateLike as any).toDate()
      : dateLike instanceof Date
        ? dateLike
        : new Date();
  const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} ${t('minAgo')}`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t('hoursAgo') : t('hourAgo')}`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${diffDays > 1 ? t('daysAgo') : t('dayAgo')}`;
};

const safeInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || "C";

export default function AccountingFirmDashboardPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('AccountingDashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [pendingDocumentReviews, setPendingDocumentReviews] = useState(0);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState(0);
  const [teamWorkloadPercent, setTeamWorkloadPercent] = useState(0);
  const [recentActivities, setRecentActivities] = useState<DashboardActivity[]>([]);
  const [clientTaskData, setClientTaskData] = useState<Array<{ name: string; activity: number }>>([]);
  const [serviceDistribution, setServiceDistribution] = useState<Array<{ name: string; value: number }>>([
    { name: "Payroll", value: 0 },
    { name: "Tax Filing", value: 0 },
    { name: "Advisory", value: 0 },
    { name: "Compliance", value: 0 },
    { name: "Other", value: 0 },
  ]);

  useEffect(() => {
    if (!user) return;

    let unsubscribeLogs: (() => void) | null = null;

    const setup = async () => {
      setIsLoading(true);
      try {
        const userSnap = await getDoc(doc(firestore, "users", user.uid));
        if (!userSnap.exists()) {
          setIsLoading(false);
          return;
        }

        const companiesQuery = query(
          collection(firestore, "companies"),
          where("type", "==", "business")
        );

        const unsubCompanies = onSnapshot(companiesQuery, async (companiesSnapshot) => {
          const allClients = companiesSnapshot.docs.map((companyDoc) => ({
            id: companyDoc.id,
            companyName: String(companyDoc.data().companyName ?? "Unnamed Client"),
            status: String(companyDoc.data().status ?? "pending_approval"),
          }));

          const activeClients = allClients.filter((client) => client.status === "active");
          setClientCompanies(activeClients);

          const pendingCounts = await Promise.all(
            activeClients.map(async (client) => {
              const pendingLeaveQuery = query(
                collection(firestore, "companies", client.id, "leave_requests"),
                where("status", "==", "Pending")
              );
              const payrollRunsQuery = query(collection(firestore, "companies", client.id, "payroll_runs"));
              const [pendingLeaves, payrollRuns] = await Promise.all([
                getDocs(pendingLeaveQuery),
                getDocs(payrollRunsQuery),
              ]);
              return {
                client,
                pendingLeaves: pendingLeaves.size,
                payrollRuns: payrollRuns.size,
              };
            })
          );

          const totalPendingLeaves = pendingCounts.reduce((sum, row) => sum + row.pendingLeaves, 0);
          const totalRuns = pendingCounts.reduce((sum, row) => sum + row.payrollRuns, 0);
          const pendingReviews = pendingCounts.reduce(
            (sum, row) => sum + Math.max(0, row.pendingLeaves + (row.payrollRuns === 0 ? 1 : 0)),
            0
          );

          setPendingDocumentReviews(pendingReviews);
          setUpcomingDeadlines(totalPendingLeaves);
          setTeamWorkloadPercent(
            Math.min(100, activeClients.length === 0 ? 0 : Math.round((pendingReviews / (activeClients.length * 5)) * 100))
          );

          const taskRows = pendingCounts
            .map((row) => ({ name: row.client.companyName, activity: row.pendingLeaves + (row.payrollRuns === 0 ? 1 : 0) }))
            .sort((a, b) => b.activity - a.activity)
            .slice(0, 8);
          setClientTaskData(taskRows);

          if (unsubscribeLogs) {
            unsubscribeLogs();
            unsubscribeLogs = null;
          }

          const activeClientIds = new Set(activeClients.map((client) => client.id));
          const logsQuery = query(collection(firestore, "system_logs"), orderBy("timestamp", "desc"));
          unsubscribeLogs = onSnapshot(logsQuery, (logsSnapshot) => {
            const mappedActivities: DashboardActivity[] = [];
            const counters = {
              payroll: 0,
              tax: 0,
              advisory: 0,
              compliance: 0,
              other: 0,
            };

            logsSnapshot.docs.forEach((logDoc) => {
              const data = logDoc.data() as Record<string, any>;
              const details = (data.details ?? {}) as Record<string, any>;
              const companyId = typeof details.companyId === "string" ? details.companyId : "";
              const message = String(data.message ?? "");
              const messageLower = message.toLowerCase();

              if (!companyId || !activeClientIds.has(companyId)) {
                return;
              }

              const clientName =
                activeClients.find((client) => client.id === companyId)?.companyName ??
                String(details.companyName ?? "Client");

              if (mappedActivities.length < 6) {
                mappedActivities.push({
                  client: clientName,
                  document: message,
                  time: relativeTime(data.timestamp, t),
                  avatar: String(details.clientAvatar ?? ""),
                  clientId: companyId,
                });
              }

              if (messageLower.includes("payroll")) counters.payroll += 1;
              else if (messageLower.includes("tax")) counters.tax += 1;
              else if (messageLower.includes("advis")) counters.advisory += 1;
              else if (messageLower.includes("compliance") || messageLower.includes("approval")) counters.compliance += 1;
              else counters.other += 1;
            });

            setRecentActivities(mappedActivities);
            setServiceDistribution([
              { name: "Payroll", value: counters.payroll },
              { name: "Tax Filing", value: counters.tax },
              { name: "Advisory", value: counters.advisory },
              { name: "Compliance", value: counters.compliance },
              { name: "Other", value: counters.other },
            ]);
            setIsLoading(false);
          });
        });

        return () => {
          unsubCompanies();
          if (unsubscribeLogs) unsubscribeLogs();
        };
      } catch (error) {
        console.error("Accounting dashboard load error:", error);
        toast({
          title: t('errorTitle'),
          description: t('loadFailed'),
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    let cleanup: (() => void) | undefined;
    setup().then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      if (cleanup) cleanup();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [toast, t, user]);

  const kpiData = useMemo(
    () => [
      {
        title: t('totalClients'),
        value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : clientCompanies.length,
        trend: t('totalClientsTrend'),
        icon: <Users className="h-8 w-8 text-muted-foreground" />,
      },
      {
        title: t('pendingReviews'),
        value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingDocumentReviews,
        trend: t('pendingReviewsTrend'),
        icon: <FileCheck className="h-8 w-8 text-muted-foreground" />,
      },
      {
        title: t('upcomingDeadlines'),
        value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : upcomingDeadlines,
        trend: t('upcomingDeadlinesTrend'),
        icon: <CalendarClock className="h-8 w-8 text-muted-foreground" />,
      },
      {
        title: t('teamWorkload'),
        value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${teamWorkloadPercent}% ${t('capacity')}`,
        trend: t('teamWorkloadTrend'),
        icon: <Briefcase className="h-8 w-8 text-muted-foreground" />,
      },
    ],
    [clientCompanies.length, isLoading, pendingDocumentReviews, teamWorkloadPercent, t, upcomingDeadlines]
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-foreground">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">
            {t('pageSubtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/accounting-firm/client-portfolio">
              <UserPlus className="mr-2 h-4 w-4" /> {t('onboardClient')}
            </Link>
          </Button>
        </div>
      </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, i) => (
          <SwissKpiCard
            key={kpi.title}
            index={i}
            title={kpi.title}
            value={kpi.value}
            description={kpi.trend}
            icon={kpi.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('recentTitle')}</CardTitle>
            <CardDescription>{t('recentDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {recentActivities.map((activity) => (
                <li key={`${activity.clientId}-${activity.document}`} className="flex items-center space-x-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={activity.avatar} alt={activity.client} />
                    <AvatarFallback>{safeInitial(activity.client)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.document}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">{activity.client}</span> - {activity.time}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/accounting-firm/client-documents">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </li>
              ))}
              {!isLoading && recentActivities.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t('noRecent')}</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('serviceTitle')}</CardTitle>
            <CardDescription>{t('serviceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('priorityTitle')}</CardTitle>
          <CardDescription>{t('priorityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientTaskData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="name" type="category" width={130} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="activity" name={t('pendingTasks')} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
