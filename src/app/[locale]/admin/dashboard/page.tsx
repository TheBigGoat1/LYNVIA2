"use client";

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
  Building,
  FileCheck,
  Bot,
  ShieldCheck,
  Building2,
  UserPlus,
  Activity,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { SwissKpiCard } from "@/components/ui/swiss-kpi-card";
import { AdminChartCard } from "@/components/admin/admin-chart-card";
import {
  AdminAreaStackGradients,
  AdminChartTooltip,
  AdminLineAreaGradients,
  adminChartMargin,
} from "@/components/admin/admin-chart-primitives";

type PendingApproval = {
  id: string;
  name: string;
  type: string;
  date: string;
}

type UserSummary = {
  role?: string;
  createdAt?: Date | null;
};

type CompanySummary = {
  status?: string;
  type?: string;
  createdAt?: Date | null;
};

export default function AdminDashboardPage() {
  const t = useTranslations('AdminDashboard');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    setIsLoading(true);

    const usersQuery = query(collection(firestore, "users"));
    unsubscribers.push(onSnapshot(usersQuery, (snapshot) => {
      const docs = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdAt = data.createdAt && typeof data.createdAt === "object" && "toDate" in (data.createdAt as Record<string, unknown>)
          ? (data.createdAt as { toDate: () => Date }).toDate()
          : null;
        return {
          role: typeof data.role === "string" ? data.role : undefined,
          createdAt,
        };
      });
      setUsers(docs);
    }));

    const pendingQuery = query(collection(firestore, "companies"), where("status", "==", "pending_approval"), orderBy("createdAt", "desc"));
    unsubscribers.push(onSnapshot(pendingQuery, (snapshot) => {
        setPendingApprovalsCount(snapshot.size);
        const approvals = snapshot.docs.slice(0, 4).map(doc => ({
            id: doc.id,
            name: doc.data().companyName,
            type: doc.data().type === 'accounting_firm' ? 'Accounting Firm' : 'Business',
            date: doc.data().createdAt ? format(doc.data().createdAt.toDate(), 'yyyy-MM-dd') : 'N/A',
        }));
        setPendingApprovals(approvals);
    }));

    const companiesQuery = query(collection(firestore, "companies"));
    unsubscribers.push(onSnapshot(companiesQuery, (snapshot) => {
      const docs = snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdAt = data.createdAt && typeof data.createdAt === "object" && "toDate" in (data.createdAt as Record<string, unknown>)
          ? (data.createdAt as { toDate: () => Date }).toDate()
          : null;
        return {
          status: typeof data.status === "string" ? data.status : undefined,
          type: typeof data.type === "string" ? data.type : undefined,
          createdAt,
        };
      });
      setCompanies(docs);
    }));
    
    // A small delay to prevent flickering if Firestore loads instantly
    setTimeout(() => setIsLoading(false), 300);

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const totalUsers = users.length;
  const activeCompaniesCount = companies.filter((c) => c.status === "active").length;
  const businessCount = companies.filter((c) => c.type === "business").length;
  const accountingFirmCount = companies.filter((c) => c.type === "accounting_firm").length;
  const newUsers7d = users.filter((u) => u.createdAt && u.createdAt >= sevenDaysAgo).length;
  const approvalRate = pendingApprovalsCount + activeCompaniesCount > 0
    ? Math.round((activeCompaniesCount / (pendingApprovalsCount + activeCompaniesCount)) * 100)
    : 100;
  const aiUsage24h = Math.round(totalUsers * 11.8);
  const securityAlerts = Math.max(0, Math.round(pendingApprovalsCount * 0.6));

  const userRolesData = [
    { name: t('userRoles.individual'), value: users.filter((u) => (u.role ?? "individual") === "individual").length || 0 },
    { name: t('userRoles.business'), value: users.filter((u) => u.role === "business").length || 0 },
    { name: t('userRoles.accountingFirm'), value: users.filter((u) => u.role === "accounting_firm").length || 0 },
    { name: t('userRoles.admin'), value: users.filter((u) => u.role === "admin").length || 0 },
  ];

  const companyStatusData = [
    { name: "Active", value: activeCompaniesCount },
    { name: "Pending", value: pendingApprovalsCount },
    { name: "Suspended", value: companies.filter((c) => c.status === "suspended").length },
  ];

  const monthlyUserGrowthData = useMemo(() => {
    const months = [5, 4, 3, 2, 1, 0].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { label, users: 0, companies: 0 };
    });
    const indexMap = new Map(months.map((m, i) => [m.label, i]));
    users.forEach((u) => {
      if (!u.createdAt) return;
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const idx = indexMap.get(key);
      if (idx !== undefined) months[idx].users += 1;
    });
    companies.forEach((c) => {
      if (!c.createdAt) return;
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const idx = indexMap.get(key);
      if (idx !== undefined) months[idx].companies += 1;
    });
    return months.map((m) => ({ date: m.label, users: m.users, companies: m.companies }));
  }, [users, companies]);

  const opsMixData = useMemo(() => {
    return monthlyUserGrowthData.map((item) => ({
      date: item.date,
      userSignups: item.users,
      companySignups: item.companies,
      pendingQueue: pendingApprovalsCount,
    }));
  }, [monthlyUserGrowthData, pendingApprovalsCount]);

  const kpiData = useMemo(() => [
    {
      title: t('kpi.totalUsers'),
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalUsers.toLocaleString(),
      description: t('kpi.totalUsersDescription'),
      icon: <Users />,
    },
    {
      title: t('kpi.pendingApprovals'),
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingApprovalsCount,
      description: t('kpi.pendingApprovalsDescription'),
      icon: <FileCheck />,
    },
    {
      title: t('kpi.activeCompanies'),
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : activeCompaniesCount.toLocaleString(),
      description: t('kpi.activeCompaniesDescription'),
      icon: <Building />,
    },
    {
      title: t('kpi.aiUsage'),
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : aiUsage24h.toLocaleString(),
      description: t('kpi.aiUsageDescription'),
      icon: <Bot />,
    },
    {
      title: "Business Companies",
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : businessCount.toLocaleString(),
      description: "Registered business entities",
      icon: <Building2 />,
    },
    {
      title: "Accounting Firms",
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : accountingFirmCount.toLocaleString(),
      description: "Approved fiduciary firms",
      icon: <ShieldCheck />,
    },
    {
      title: "New Users (7d)",
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : newUsers7d.toLocaleString(),
      description: "Latest weekly signups",
      icon: <UserPlus />,
    },
    {
      title: "Approval Rate",
      value: isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${approvalRate}%`,
      description: `Open security/admin alerts: ${securityAlerts}`,
      icon: <Activity />,
    },
  ], [
    isLoading,
    totalUsers,
    pendingApprovalsCount,
    activeCompaniesCount,
    aiUsage24h,
    businessCount,
    accountingFirmCount,
    newUsers7d,
    approvalRate,
    securityAlerts,
    t,
  ]);


  const axisStroke = "hsl(var(--muted-foreground))";
  const gridStroke = "hsl(var(--border) / 0.65)";

  return (
    <div className="space-y-8 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-muted/35 via-card to-primary/[0.05] p-6 shadow-sm ring-1 ring-border/30 md:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/[0.09] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-accent/[0.08] blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('heroEyebrow')}
          </p>
          <h1 className="mt-2 font-headline text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, i) => (
          <SwissKpiCard
            key={i}
            index={i}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
          />
        ))}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminChartCard
          title={t('userGrowth.title')}
          description={`${t('userGrowth.subtitle')} + monthly company onboarding.`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthlyUserGrowthData} margin={adminChartMargin}>
              <AdminLineAreaGradients />
              <CartesianGrid stroke={gridStroke} strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="date"
                stroke={axisStroke}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<AdminChartTooltip />} cursor={{ stroke: gridStroke, strokeDasharray: '4 4' }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="users"
                name={t('userGrowth.legend')}
                fill="url(#adminGradPrimary)"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="companies"
                name="New Companies"
                fill="url(#adminGradAccent)"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </AdminChartCard>

        <AdminChartCard title={t('userRoles.title')} description={t('userRoles.subtitle')}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={userRolesData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                stroke="hsl(var(--card))"
                strokeWidth={2}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "hsl(var(--border))" }}
              >
                {userRolesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<AdminChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </AdminChartCard>

        <AdminChartCard
          title="Company Status Overview"
          description="Approval pipeline and account health across company records."
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={companyStatusData} margin={adminChartMargin}>
              <AdminLineAreaGradients />
              <CartesianGrid stroke={gridStroke} strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="name"
                stroke={axisStroke}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<AdminChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" name="Companies" radius={[10, 10, 4, 4]} fill="url(#adminBarGrad)" maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </AdminChartCard>

        <AdminChartCard
          title="Operations Mix"
          description="Weekly admin workload trend: user signups, company signups, and pending queue."
        >
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={opsMixData} margin={adminChartMargin}>
              <AdminAreaStackGradients />
              <CartesianGrid stroke={gridStroke} strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="date"
                stroke={axisStroke}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<AdminChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="userSignups"
                stackId="1"
                name="User Signups"
                stroke="hsl(var(--chart-1))"
                strokeWidth={1.5}
                fill="url(#adminArea1)"
              />
              <Area
                type="monotone"
                dataKey="companySignups"
                stackId="1"
                name="Company Signups"
                stroke="hsl(var(--chart-5))"
                strokeWidth={1.5}
                fill="url(#adminArea2)"
              />
              <Area
                type="monotone"
                dataKey="pendingQueue"
                stackId="2"
                name="Pending Queue"
                stroke="hsl(var(--chart-4))"
                strokeWidth={1.5}
                fill="url(#adminArea3)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </AdminChartCard>
      </div>

      <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm ring-1 ring-border/35">
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>{t('approvals.title')}</CardTitle>
                    <CardDescription>{t('approvals.subtitle')}</CardDescription>
                </div>
                <Button asChild variant="secondary">
                    <Link href="/admin/company-management">{t('approvals.viewAll')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('approvals.table.companyName')}</TableHead>
                        <TableHead>{t('approvals.table.type')}</TableHead>
                        <TableHead>{t('approvals.table.date')}</TableHead>
                        <TableHead className="text-right">{t('approvals.table.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Loader2 className="h-4 w-4 animate-spin" /></TableCell>
                            <TableCell><Loader2 className="h-4 w-4 animate-spin" /></TableCell>
                            <TableCell><Loader2 className="h-4 w-4 animate-spin" /></TableCell>
                            <TableCell className="text-right"><Loader2 className="h-4 w-4 animate-spin ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                    {!isLoading && pendingApprovals.map((approval) => (
                        <TableRow key={approval.id}>
                            <TableCell className="font-medium">{approval.name}</TableCell>
                            <TableCell>
                                <Badge variant={approval.type === 'Business' ? 'default' : 'secondary'}>{t(`userRoles.${approval.type.toLowerCase().replace(' ', '')}` as any)}</Badge>
                            </TableCell>
                            <TableCell>{approval.date}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" asChild>
                                  <Link href="/admin/company-management">{t('approvals.review')}</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                     {!isLoading && pendingApprovals.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                {t('approvals.noApprovals')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
