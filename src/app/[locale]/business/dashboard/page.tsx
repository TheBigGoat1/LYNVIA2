
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Banknote,
  CalendarClock,
  Wallet,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  FilePlus,
  UserPlus,
  Loader2,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { useFirebase } from "@/firebase/firebase-provider";
import { collection, query, where, onSnapshot, getDoc, getDocs, doc, collectionGroup, orderBy, limit } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { useTranslations, useLocale } from "next-intl";
import { fetchLatestCFOSummary, type CFOSummary } from "@/lib/cfo-summary";
import { SwissKpiCard } from "@/components/ui/swiss-kpi-card";
import { resolveSwissLocale } from "@/lib/format";

const FALLBACK_TREND = [
  { month: "Jan", cost: 0 },
  { month: "Feb", cost: 0 },
  { month: "Mar", cost: 0 },
];

const employeeDistData = [
  { name: "Engineering", value: 45 },
  { name: "Sales", value: 30 },
  { name: "Marketing", value: 20 },
  { name: "Support", value: 15 },
  { name: "HR", value: 10 },
  { name: "Admin", value: 5 },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const relativeTime = (dateLike: unknown, t?: (key: string, params?: Record<string, any>) => string): string => {
  if (!dateLike) return t ? t('timeAgo.unknown') : 'some time ago';
  const date = (dateLike as any)?.toDate ? (dateLike as any).toDate() : new Date(dateLike as any);
  if (isNaN(date.getTime())) return t ? t('timeAgo.invalid') : 'a while ago';

  const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return t ? t('timeAgo.minutes', { count: diffMinutes }) : `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t ? t('timeAgo.hours', { count: diffHours }) : `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return t ? t('timeAgo.days', { count: diffDays }) : `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

type ActivityItem = {
    id: string;
    text: string;
    time: string;
    icon: React.ReactNode;
    link: string;
    timestamp: number;
};

export default function BusinessDashboardPage() {
    const { user } = useFirebase();
    const t = useTranslations('BusinessDashboard');
    const locale = useLocale();
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [employeeCount, setEmployeeCount] = useState(0);
    const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
    const [cfoSummary, setCfoSummary] = useState<CFOSummary | null>(null);
    const [cfoHistory, setCfoHistory] = useState<{ month: string; cost: number }[]>([]);
    const [pendingDocRequests, setPendingDocRequests] = useState<{ id: string; subject: string; message: string }[]>([]);

    useEffect(() => {
        if (user) {
            const userDocRef = doc(firestore, 'users', user.uid);
            getDoc(userDocRef).then(async (docSnap) => {
                if (docSnap.exists()) {
                    const id = docSnap.data().companyId as string | undefined;
                    setCompanyId(id ?? null);
                    // Load CFO summary and history for dashboard KPIs
                    if (id) {
                        try {
                            const summary = await fetchLatestCFOSummary(id);
                            setCfoSummary(summary);
                            // Load up to 6 CFO periods for trend chart
                            const histSnap = await getDocs(
                                query(
                                    collection(firestore, 'companies', id, 'cfo_summaries'),
                                    orderBy('updatedAt', 'desc'),
                                    limit(7)
                                )
                            );
                            const periods = histSnap.docs
                                .filter((d) => d.id !== 'latest')
                                .slice(0, 6)
                                .reverse()
                                .map((d) => ({
                                    month: d.id,
                                    cost: Number((d.data() as Record<string, unknown>).turnover ?? 0),
                                }));
                            setCfoHistory(periods.length > 0 ? periods : FALLBACK_TREND);
                        } catch (e) {
                            setCfoHistory(FALLBACK_TREND);
                        }
                    }
                } else {
                    setIsLoading(false);
                }
            });
        } else {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(firestore, 'document_exchanges'),
            where('recipientId', '==', user.uid),
            where('type', '==', 'document_request'),
            where('status', '==', 'pending')
        );
        return onSnapshot(q, (snap) => {
            setPendingDocRequests(snap.docs.map(d => ({
                id: d.id,
                subject: d.data().subject || '',
                message: d.data().message || '',
            })));
        });
    }, [user]);

    useEffect(() => {
        if (!companyId) return;

        setIsLoading(true);
        const allUnsubscribes: (() => void)[] = [];

        // Employee and leave counts
        const employeeQuery = query(collection(firestore, 'companies', companyId, 'employees'));
        const unsubEmployees = onSnapshot(employeeQuery, (snapshot) => setEmployeeCount(snapshot.size));
        allUnsubscribes.push(unsubEmployees);

        const leaveQuery = query(collection(firestore, 'companies', companyId, 'leave_requests'), where('status', '==', 'Pending'));
        const unsubLeaves = onSnapshot(leaveQuery, (snapshot) => setPendingLeaveCount(snapshot.size));
        allUnsubscribes.push(unsubLeaves);

        // Activity Feed
        let combinedActivities: ActivityItem[] = [];
        const updateActivities = (newActivities: ActivityItem[], type: string) => {
            combinedActivities = [
                ...combinedActivities.filter(a => !a.id.startsWith(type)),
                ...newActivities
            ];
            combinedActivities.sort((a, b) => b.timestamp - a.timestamp);
            setRecentActivities(combinedActivities.slice(0, 5));
        };

        const payrollRunsQuery = query(collection(firestore, 'companies', companyId, 'payroll_runs'), orderBy('createdAt', 'desc'), limit(3));
        const unsubPayroll = onSnapshot(payrollRunsQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: `payroll-${doc.id}`,
                    text: t('recentActivity.payrollProcessed', {monthLabel: data.monthLabel}),
                    time: relativeTime(data.createdAt, t),
                    icon: <CheckCircle className="h-5 w-5 text-primary" />,
                    link: '/business/payroll-processing',
                    timestamp: data.createdAt?.seconds || 0
                };
            });
            updateActivities(activities, 'payroll');
        });
        allUnsubscribes.push(unsubPayroll);

        const leaveRequestsQuery = query(collection(firestore, 'companies', companyId, 'leave_requests'), orderBy('requestedAt', 'desc'), limit(3));
        const unsubLeaveActivity = onSnapshot(leaveRequestsQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: `leave-${doc.id}`,
                    text: t('recentActivity.leaveRequest', {employeeName: data.employeeName, leaveType: data.leaveType, status: data.status}),
                    time: relativeTime(data.requestedAt, t),
                    icon: <CalendarClock className="h-5 w-5 text-primary" />,
                    link: '/business/leave-management',
                    timestamp: data.requestedAt?.seconds || 0
                };
            });
            updateActivities(activities, 'leave');
        });
        allUnsubscribes.push(unsubLeaveActivity);
        
        const docsQuery = query(collectionGroup(firestore, 'documents'), where('companyId', '==', companyId), orderBy('createdAt', 'desc'), limit(3));
        const unsubDocs = onSnapshot(docsQuery, snapshot => {
            const activities = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    id: `doc-${doc.id}`,
                    text: t('recentActivity.documentCreated', {documentName: data.name}),
                    time: relativeTime(data.createdAt, t),
                    icon: <FilePlus className="h-5 w-5 text-primary" />,
                    link: '/business/document-center',
                    timestamp: data.createdAt?.seconds || 0
                };
            });
             updateActivities(activities, 'doc');
        });
        allUnsubscribes.push(unsubDocs);


        setIsLoading(false);
        return () => {
            allUnsubscribes.forEach(unsub => unsub());
        };

    }, [companyId, t]);

    const kpiData = [
      {
        titleKey: "totalEmployees",
        value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : employeeCount,
        trendKey: "employeesTrend",
        icon: <Users className="h-8 w-8 text-muted-foreground" />,
      },
      {
        titleKey: "pendingPayroll",
        value: cfoSummary
          ? cfoSummary.turnover.toLocaleString(resolveSwissLocale(locale), { maximumFractionDigits: 0 }) + ' CHF'
          : isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : '—',
        trendKey: "payrollTrend",
        icon: <Banknote className="h-8 w-8 text-muted-foreground" />,
      },
      {
        titleKey: "activeLeaveRequests",
        value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingLeaveCount,
        trendKey: pendingLeaveCount > 0 ? 'leaveTrend.action' : 'leaveTrend.clear',
        icon: <CalendarClock className="h-8 w-8 text-muted-foreground" />,
      },
      {
        titleKey: "monthlyPayrollCost",
        value: cfoSummary
          ? (cfoSummary.profitOrLoss >= 0 ? '+' : '') +
            cfoSummary.profitOrLoss.toLocaleString(resolveSwissLocale(locale), { maximumFractionDigits: 0 }) + ' CHF'
          : isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : '—',
        trendKey: "costTrend",
        icon: <Wallet className="h-8 w-8 text-muted-foreground" />,
      },
    ];

    const alerts = [
        { textKey: "alerts.payrollDeadline", link: "/business/payroll-processing", icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />, show: true },
        { textKey: "alerts.leaveRequests", link: "/business/leave-management", icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />, show: pendingLeaveCount > 0 },
        { textKey: "alerts.taxDeadline", link: "/business/reports", icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />, show: true },
        { textKey: "alerts.newDocument", link: "/business/document-center", icon: <CheckCircle className="h-5 w-5 text-green-500" />, show: true }
    ]

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
         <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/business/employee-management">
                    <UserPlus className="mr-2 h-4 w-4" /> {t('addEmployee')}
                </Link>
            </Button>
            <Button asChild>
                <Link href="/business/payroll-processing">
                    <Banknote className="mr-2 h-4 w-4" /> {t('processPayroll')}
                </Link>
            </Button>
        </div>
      </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, i) => (
          <SwissKpiCard
            key={i}
            index={i}
            title={t(`kpi.${kpi.titleKey}`)}
            value={kpi.value}
            description={t(`kpi.${kpi.trendKey}`)}
            icon={kpi.icon}
          />
        ))}
      </div>

      {pendingDocRequests.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              {t('docRequests.title')}
              <Badge variant="destructive">{pendingDocRequests.length}</Badge>
            </CardTitle>
            <CardDescription>{t('docRequests.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingDocRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-700">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{req.subject}</p>
                  {req.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{req.message}</p>}
                </div>
                <Button size="sm" variant="default" asChild className="shrink-0 ml-3">
                  <Link href="/business/document-center">{t('docRequests.uploadNow')}</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>{t('payrollTrend.title')}</CardTitle>
                <CardDescription>{t('payrollTrend.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cfoHistory.length > 0 ? cfoHistory : FALLBACK_TREND}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `CHF ${value / 1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                        <Legend />
                        <Line type="monotone" dataKey="cost" name={t('payrollTrend.legend')} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
           <CardHeader>
                <CardTitle>{t('employeeDistribution.title')}</CardTitle>
                <CardDescription>{t('employeeDistribution.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={employeeDistData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {employeeDistData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                         <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>{t('alerts.title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {alerts.filter(a => a.show).map((alert, i) => (
                        <li key={i} className="flex items-center space-x-3">
                            {alert.icon}
                            <p className="text-sm text-muted-foreground flex-1">{t(alert.textKey, {count: pendingLeaveCount})}</p>
                            {alert.link && (
                                <Button variant="secondary" size="sm" asChild>
                                    <Link href={alert.link}>{t('alerts.view')}</Link>
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
              <CardTitle>{t('recentActivity.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.text}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={activity.link}><ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                  </li>
                ))}
                {isLoading && (
                    <li className="text-sm text-muted-foreground">{t('recentActivity.loading')}</li>
                )}
                 {!isLoading && recentActivities.length === 0 && (
                    <li className="text-sm text-muted-foreground">{t('recentActivity.noActivity')}</li>
                )}
              </ul>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    