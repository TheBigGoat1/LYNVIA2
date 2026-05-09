'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  Building2,
  Calculator,
  Download,
  FileText,
  FileClock,
  Gavel,
  LineChart as LineChartIcon,
  Package,
  ShoppingCart,
  Users,
  CheckCircle2,
  Circle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Link as IntlLink } from '@/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useFirebase } from '@/firebase/firebase-provider';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  limit,
} from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, es, fr, it } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { usePrivacyMode } from '@/components/privacy-mode-context';
import { isYearlyTaxReturnOrder } from '@/lib/tax-mandatory-documents';
import { computeProfileCompletenessPercent } from '@/lib/profile-completeness';
const Link = IntlLink as any;

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

type ActivityType = 'document' | 'order' | 'legal' | 'payment' | 'notification' | 'system';

interface ActivityItem {
  id: string;
  type: ActivityType;
  text: string;
  timestamp: Date;
  link: string;
  amount?: number;
}

interface Document {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  type?: string;
  size?: number;
}

interface Order {
  id: string;
  serviceTitle: string;
  status: string;
  createdAt: Date;
  amount?: number;
  currency?: string;
  serviceId?: string;
  orderType?: string;
  intakeData?: {
    documentsRequired?: number;
  };
}

interface LegalConversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  lastMessage?: string;
}

interface LatestScenario {
  id: string;
  type: string;
  title?: string;
  createdAt: Date;
  monthlyImpact?: number;
  annualImpact?: number;
}

interface ActiveTaxOrder {
  id: string;
  serviceTitle: string;
  status: string;
  createdAt: Date;
  documentsUploaded?: number;
  documentsRequired?: number;
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

const getActivityIcon = (type: ActivityType) => {
  const iconMap: Record<ActivityType, React.ReactNode> = {
    document: <FileText className="h-4 w-4 text-indigo-500" />,
    order: <Package className="h-4 w-4 text-teal-500" />,
    legal: <Gavel className="h-4 w-4 text-amber-500" />,
    payment: <FileText className="h-4 w-4 text-green-500" />,
    notification: <Bell className="h-4 w-4 text-blue-500" />,
    system: <AlertCircle className="h-4 w-4 text-slate-500" />,
  };
  return iconMap[type] || <FileText className="h-4 w-4 text-gray-400" />;
};

const kpiIcons = {
  FileText,
  FileClock,
  Calculator,
  Bell,
  Gavel,
  Award,
  AlertCircle,
} as const;

const KPI_ACCENT: readonly string[] = [
  'var(--swiss-laurel-olive)',
  'var(--swiss-deep-amethyst)',
  'var(--swiss-alpine-slate)',
  'var(--swiss-deep-amethyst)',
];

const getDateFnsLocale = (locale: string) => {
  if (locale.startsWith('fr')) return fr;
  if (locale.startsWith('de')) return de;
  if (locale.startsWith('es')) return es;
  if (locale.startsWith('it')) return it;
  return enUS;
};

// ────────────────────────────────────────────────
// StatCard
// Mobile: nearly-square, one visible at a time via horizontal snap scroll
// Desktop: compact card in a 4-col grid
// ────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  accentColor,
  change,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
  change?: number | null;
  trend: 'up' | 'down' | 'neutral';
}) {
  const changeClass =
    trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400';

  return (
    <div
      className={cn(
        'group swiss-card-tilt relative flex min-h-[5.25rem] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-3 shadow-sm ring-1 ring-border/30 transition-shadow duration-200 hover:shadow-md sm:min-h-[5.75rem] sm:p-3.5',
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <div className="pointer-events-none absolute right-2.5 top-2.5 text-muted-foreground/30 transition-opacity group-hover:text-muted-foreground/45 [&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-5 sm:[&_svg]:w-5">
        {icon}
      </div>
      <div className="flex h-full min-w-0 flex-col justify-between pr-7">
        <p className="line-clamp-2 text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted-foreground sm:text-[10px]">
          {title}
        </p>
        <div className="min-w-0 pt-1">
          <p className="truncate text-lg font-bold tabular-nums leading-none text-foreground sm:text-xl">{value}</p>
          {typeof change === 'number' && (
            <p className={cn('mt-1 flex items-center gap-0.5 text-[9px] font-semibold sm:text-[10px]', changeClass)}>
              {change.toFixed(1)}%
              {trend === 'down' ? <ArrowDownRight className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type FeatureHubItem = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  href: string;
};

function FeatureHubSection({ features }: { features: FeatureHubItem[] }) {
  const t = useTranslations('IndividualDashboard');
  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-sm ring-1 ring-border/40">
      <CardHeader className="space-y-1.5 border-b border-border/40 bg-muted/15 px-3 pb-3 pt-3.5 sm:px-5 sm:pb-4 sm:pt-5">
        <CardTitle className="font-headline text-base font-semibold leading-tight tracking-tight sm:text-lg">
          {t('featureHub.title')}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {t('featureHub.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-2.5 pb-3 pt-3 sm:space-y-2.5 sm:px-4 sm:pb-5 sm:pt-4">
        {features.map((feature) => (
          <Button
            key={feature.title}
            variant="ghost"
            asChild
            className="h-auto w-full items-start justify-start gap-3 rounded-xl border border-border/70 bg-card/80 px-2.5 py-3 text-left shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/50 active:bg-muted/70 sm:gap-3.5 sm:px-4 sm:py-3.5"
          >
            <Link href={feature.href as any} className="flex w-full min-w-0 gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <feature.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2 sm:text-[0.95rem]">
                  {feature.title}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-2 sm:text-sm">
                  {feature.subtitle}
                </p>
              </div>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────

export default function IndividualDashboardPage() {
  const t = useTranslations('IndividualDashboard');
  const locale = useLocale();
  const dateFnsLocale = useMemo(() => getDateFnsLocale(locale), [locale]);
  const { user, userStatus, userProfile, loading: userLoading } = useFirebase();
  const [showAllKpis, setShowAllKpis] = useState(false);
  const { isPrivacyMode } = usePrivacyMode();
  const { unreadCount } = useNotifications();

  const [companyName, setCompanyName] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [legalConversations, setLegalConversations] = useState<LegalConversation[]>([]);
  const [scenariosCount, setScenariosCount] = useState(0);
  const [latestScenario, setLatestScenario] = useState<LatestScenario | null>(null);
  const [activeTaxOrder, setActiveTaxOrder] = useState<ActiveTaxOrder | null>(null);
  const [taxDocsUploaded, setTaxDocsUploaded] = useState(0);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const countInLastDays = <T extends { createdAt: Date }>(items: T[], days: number) => {
    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    return {
      current: items.filter((i) => i.createdAt.getTime() >= now - windowMs).length,
      previous: items.filter(
        (i) =>
          i.createdAt.getTime() < now - windowMs &&
          i.createdAt.getTime() >= now - windowMs * 2,
      ).length,
    };
  };

  const getDocumentStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      approved: t('status.approved'),
      rejected: t('status.rejected'),
      draft: t('status.draft'),
      pending_review: t('status.pendingReview'),
      pending: t('status.pending'),
    };
    return statusMap[status.toLowerCase().replace(/\s+/g, '_')] ?? status;
  };

  const getOrderStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      paid: t('status.paid'),
      in_progress: t('status.inProgress'),
      pending: t('status.pending'),
      cancelled: t('status.cancelled'),
      completed: t('status.completed'),
    };
    return statusMap[status.toLowerCase()] ?? status.replace(/_/g, ' ');
  };

  const getAccountStatusLabel = (status: string | null | undefined) => {
    if (!status) return t('status.active');
    const key = status.toLowerCase().replace(/\s+/g, '_');
    const statusMap: Record<string, string> = {
      active: t('status.active'),
      pending_approval: t('status.pendingApproval'),
      suspended: t('status.suspended'),
    };
    return statusMap[key] ?? status;
  };

  const getScenarioTypeLabel = (scenarioType: string) => {
    const normalized = (scenarioType || 'income_change')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');
    const aliasMap: Record<string, string> = {
      salary_change: 'income_change',
      incomechange: 'income_change',
      jobloss: 'job_loss',
      childbirth: 'child_birth',
      new_kid: 'child_birth',
      supplementarybenefits: 'supplementary_benefits',
      vatcomparison: 'vat_comparison',
    };
    const key = aliasMap[normalized] ?? normalized;
    const labelMap: Record<string, string> = {
      income_change: t('latestScenario.types.income_change'),
      job_loss: t('latestScenario.types.job_loss'),
      child_birth: t('latestScenario.types.child_birth'),
      marriage: t('latestScenario.types.marriage'),
      pillar_3a: t('latestScenario.types.pillar_3a'),
      pillar_2_buyback: t('latestScenario.types.pillar_2_buyback'),
      supplementary_benefits: t('latestScenario.types.supplementary_benefits'),
      vat_comparison: t('latestScenario.types.vat_comparison'),
    };
    return labelMap[key] ?? scenarioType.replace(/[_-]/g, ' ');
  };

  const maskSensitiveText = (value: string | null | undefined) => {
    if (!value) return '';
    return isPrivacyMode ? '••••••' : value;
  };

  // ── Data Fetching ──
  useEffect(() => {
    if (!user) {
      if (!userLoading) setIsLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    let allActs: ActivityItem[] = [];

    const userRef = doc(firestore, 'users', user.uid);
    unsubs.push(
      onSnapshot(userRef, async (snap) => {
        if (snap.exists() && snap.data()?.companyId) {
          const cid = snap.data().companyId;
          const companySnap = await getDoc(doc(firestore, 'companies', cid));
          if (companySnap.exists()) setCompanyName(companySnap.data().companyName);
        }
      }),
    );

    const updateActs = (newItems: ActivityItem[], typ: ActivityType) => {
      allActs = [...allActs.filter((a) => a.type !== typ), ...newItems];
      allActs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActs.slice(0, 5));
    };

    unsubs.push(
      onSnapshot(
        query(collection(firestore, 'users', user.uid, 'documents'), orderBy('createdAt', 'desc')),
        (snap) => {
          const docs = snap.docs.map(
            (d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt.toDate() } as Document),
          );
          setDocuments(docs);
          const acts = docs.slice(0, 3).map((d) => ({
            id: `doc-${d.id}`,
            type: 'document' as ActivityType,
            text: t('recentActivity.templates.documentStatus', {
              name: d.name,
              status: getDocumentStatusLabel(d.status),
            }),
            timestamp: d.createdAt,
            link: '/individual/my-documents',
          }));
          updateActs(acts, 'document');
          setIsLoading(false);
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc')),
        (snap) => {
          const ordersData = snap.docs.map(
            (d) => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt.toDate() } as Order),
          );
          setOrders(ordersData);
          const activeOrder = ordersData.find(
            (o) =>
              isYearlyTaxReturnOrder(o) && ['paid', 'in_progress', 'pending_review'].includes(o.status),
          );
          if (activeOrder) {
            setActiveTaxOrder({
              id: activeOrder.id,
              serviceTitle: activeOrder.serviceTitle,
              status: activeOrder.status,
              createdAt: activeOrder.createdAt,
              documentsUploaded: 0,
              documentsRequired: activeOrder.intakeData?.documentsRequired,
            });
          } else {
            setActiveTaxOrder(null);
          }
          const acts = ordersData.slice(0, 2).map((o) => ({
            id: `order-${o.id}`,
            type: 'order' as ActivityType,
            text: t('recentActivity.templates.orderStatus', {
              service: o.serviceTitle,
              status: getOrderStatusLabel(o.status),
            }),
            timestamp: o.createdAt,
            link: `/individual/my-orders/${o.id}`,
          }));
          updateActs(acts, 'order');
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(firestore, 'users', user.uid, 'scenarios'), orderBy('createdAt', 'desc')),
        (snap) => {
          setScenariosCount(snap.size);
          if (snap.docs.length > 0) {
            const latestDoc = snap.docs[0];
            const data = latestDoc.data();
            const scenarioType =
              data.metadata?.scenarioType || data.metadata?.scenarioId || 'scenario';
            const netDelta = data.comparison?.netIncomeChange;
            const taxDelta = data.comparison?.taxDifference;
            const annualForDisplay =
              typeof netDelta === 'number'
                ? netDelta
                : typeof taxDelta === 'number'
                  ? -taxDelta
                  : undefined;
            const monthlyChange =
              typeof annualForDisplay === 'number' ? Math.round(annualForDisplay / 12) : null;
            setLatestScenario({
              id: latestDoc.id,
              type: scenarioType,
              createdAt: data.createdAt?.toDate() || new Date(),
              monthlyImpact: monthlyChange ?? undefined,
              annualImpact: annualForDisplay,
            });
          } else {
            setLatestScenario(null);
          }
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(
          collection(firestore, 'users', user.uid, 'legalConversations'),
          orderBy('createdAt', 'desc'),
        ),
        (snap) => {
          const convos = snap.docs.map(
            (d) =>
              ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt.toDate(),
                messageCount: d.data().messages.length,
              } as LegalConversation),
          );
          setLegalConversations(convos);
          const acts = convos.slice(0, 2).map((c) => ({
            id: `legal-${c.id}`,
            type: 'legal' as ActivityType,
            text: t('recentActivity.templates.legalStarted', { title: c.title }),
            timestamp: c.createdAt,
            link: '/individual/legal-assistant',
          }));
          updateActs(acts, 'legal');
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(
          collection(firestore, 'users', user.uid, 'notifications'),
          orderBy('createdAt', 'desc'),
          limit(3),
        ),
        (snap) => {
          const acts = snap.docs.map((d) => {
            const data = d.data() as {
              title?: string;
              description?: string;
              link?: string;
              createdAt?: { toDate?: () => Date };
            };
            const raw = data.createdAt;
            const timestamp =
              raw && typeof raw === 'object' && typeof raw.toDate === 'function'
                ? raw.toDate()
                : new Date();
            const title = typeof data.title === 'string' ? data.title : '';
            const desc = typeof data.description === 'string' ? data.description : '';
            const text =
              title && desc ? `${title} — ${desc}` : title || desc || t('recentActivity.notificationFallback');
            return {
              id: `notification-${d.id}`,
              type: 'notification' as ActivityType,
              text,
              timestamp,
              link: typeof data.link === 'string' && data.link.length > 0 ? data.link : '/individual/notifications',
            };
          });
          updateActs(acts, 'notification');
        },
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [user, userLoading, t]);

  // ── KPI data ──
  const kpiData = useMemo(() => {
    const docsWindow = countInLastDays(documents, 30);
    const legalWindow = countInLastDays(legalConversations, 30);

    const docsChange = getPercentChange(docsWindow.current, docsWindow.previous);
    const legalChange = getPercentChange(legalWindow.current, legalWindow.previous);
    const docsTrend: 'up' | 'down' = docsChange < 0 ? 'down' : 'up';
    const legalTrend: 'up' | 'down' = legalChange < 0 ? 'down' : 'up';

    const pendingApprovals = documents.filter(
      (d) => d.status.toLowerCase().replace(/\s+/g, '_') === 'pending_review',
    ).length;

    const baseData = [
      {
        title: t('kpi.documentsGenerated'),
        value: documents.length,
        icon: 'FileText',
        change: Math.abs(docsChange),
        trend: docsTrend,
      },
      {
        title: t('kpi.pendingApprovals'),
        value: pendingApprovals,
        icon: 'FileClock',
        change: null,
        trend: 'neutral' as const,
      },
      {
        title: t('kpi.scenariosRun'),
        value: scenariosCount,
        icon: 'Calculator',
        change: null,
        trend: 'neutral' as const,
      },
      {
        title: t('kpi.legalChats'),
        value: legalConversations.length,
        icon: 'Gavel',
        change: Math.abs(legalChange),
        trend: legalTrend,
      },
      {
        title: t('kpi.unreadNotifications'),
        value: unreadCount,
        icon: 'Bell',
        change: null,
        trend: 'neutral' as const,
      },
      {
        title: t('kpi.profileStrength'),
        value: `${computeProfileCompletenessPercent(userProfile)}%`,
        icon: 'Award',
        change: null,
        trend: 'neutral' as const,
      },
      {
        title: t('kpi.accountStatus'),
        value: getAccountStatusLabel(userStatus),
        icon: 'AlertCircle',
        change: null,
        trend: 'neutral' as const,
      },
    ];

    return baseData.map((item, index) => ({
      ...item,
      accentColor: KPI_ACCENT[index % KPI_ACCENT.length],
    }));
  }, [documents, scenariosCount, unreadCount, t, orders, legalConversations, userStatus, userProfile]);

  useEffect(() => {
    if (!user || !activeTaxOrder?.id) {
      setTaxDocsUploaded(0);
      return;
    }
    const unsub = onSnapshot(
      collection(firestore, 'users', user.uid, 'orders', activeTaxOrder.id, 'taxDocuments'),
      (snap) => {
        setTaxDocsUploaded(snap.size);
      },
    );
    return () => unsub();
  }, [user, activeTaxOrder?.id]);

  const taxDocumentsUploaded = taxDocsUploaded;

  const mandateProgress = useMemo(() => {
    if (!activeTaxOrder) return 0;
    switch (activeTaxOrder.status) {
      case 'paid':
        return 25;
      case 'in_progress':
        return 65;
      case 'pending_review':
        return 90;
      case 'completed':
        return 100;
      default:
        return 10;
    }
  }, [activeTaxOrder]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const fromProfile = userProfile?.firstName?.trim();
    const nameSource =
      fromProfile && fromProfile.length > 0 && fromProfile.toLowerCase() !== 'there'
        ? fromProfile
        : t('fallbackUserName');
    const name = isPrivacyMode ? '••••' : nameSource;
    if (hour < 12) return t('greetingMorning', { name });
    if (hour < 17) return t('greetingAfternoon', { name });
    return t('greetingEvening', { name });
  };

  const quickActions = [
    { title: t('quickActions.askLegalQuestion'), icon: Gavel, href: '/individual/legal-assistant' },
    { title: t('quickActions.generateDocument'), icon: FileText, href: '/individual/document-generator' },
    { title: t('quickActions.calculateTaxScenario'), icon: Calculator, href: '/individual/scenario-calculator' },
    { title: t('quickActions.browseServices'), icon: ShoppingCart, href: '/individual/tax-services' },
  ];

  const featureModules: FeatureHubItem[] = [
    {
      title: t('featureHub.modules.myDocuments.title'),
      subtitle: t('featureHub.modules.myDocuments.subtitle'),
      icon: FileText,
      href: '/individual/my-documents',
    },
    {
      title: t('featureHub.modules.myOrders.title'),
      subtitle: t('featureHub.modules.myOrders.subtitle'),
      icon: Package,
      href: '/individual/my-orders',
    },
    {
      title: t('featureHub.modules.notifications.title'),
      subtitle: t('featureHub.modules.notifications.subtitle'),
      icon: Bell,
      href: '/individual/notifications',
    },
    {
      title: t('featureHub.modules.scenarioCenter.title'),
      subtitle: t('featureHub.modules.scenarioCenter.subtitle'),
      icon: LineChartIcon,
      href: '/individual/scenario-calculator',
    },
    {
      title: t('featureHub.modules.settings.title'),
      subtitle: t('featureHub.modules.settings.subtitle'),
      icon: Users,
      href: '/individual/settings',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 sm:space-y-8">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.07] via-background to-muted/35 p-5 shadow-sm ring-1 ring-border/40 sm:p-7">
        <div
          className="pointer-events-none absolute -right-12 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl sm:h-52 sm:w-52"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-[var(--swiss-deep-amethyst)]/12 blur-2xl sm:h-40 sm:w-40"
          aria-hidden
        />
        <div className="relative min-w-0 space-y-2">
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {getGreeting()}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{t('subtitle')}</p>
        </div>
      </div>

      {/* ── KPI Cards (full set) ── */}
      <section className="space-y-3" aria-labelledby="dash-overview-heading">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="dash-overview-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t('sectionOverview')}
          </h2>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="min-h-[5.25rem] rounded-2xl sm:min-h-[5.75rem]" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
              {(showAllKpis ? kpiData : kpiData.slice(0, 4)).map((kpi, i) => (
                <StatCard
                  key={`${kpi.title}-${i}`}
                  title={kpi.title}
                  value={kpi.value}
                  icon={React.createElement(kpiIcons[kpi.icon as keyof typeof kpiIcons])}
                  accentColor={kpi.accentColor}
                  change={kpi.change}
                  trend={kpi.trend}
                />
              ))}
            </div>
            {kpiData.length > 4 ? (
              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowAllKpis((v) => !v)}
                >
                  {showAllKpis ? t('kpiToggleShowLess') : t('kpiToggleShowAll')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Feature hub first on small screens so tools are not buried below tax cards */}
      <div className="lg:hidden">
        <FeatureHubSection features={featureModules} />
      </div>

      {/* ── Bento main grid: activity feed (wide) + command column ── */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column */}
        <div className="min-w-0 w-full space-y-5 lg:col-span-7">
          {/* Recent Activity */}
          <section className="space-y-3" aria-labelledby="dash-activity-heading">
            <h2 id="dash-activity-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t('sectionActivity')}
            </h2>
            <Card className="border-border/60 shadow-sm ring-1 ring-border/30">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-3 pt-4 sm:px-5">
                <CardTitle className="font-headline text-base font-semibold sm:text-[1.05rem]">{t('recentActivity.title')}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-4 pt-3 sm:px-5 sm:pb-5">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/20 px-2 py-2">
                          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-4/5" />
                            <Skeleton className="h-2.5 w-1/4" />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : activities.length > 0 ? (
                  <ul className="space-y-1">
                    {activities.map((act) => (
                      <li
                        key={act.id}
                        className="flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-muted/35 sm:gap-3 sm:px-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60 [&_svg]:h-4 [&_svg]:w-4">
                          {getActivityIcon(act.type)}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-xs font-medium leading-snug sm:text-[13px]">
                            {maskSensitiveText(act.text)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
                            {formatDistanceToNow(act.timestamp, {
                              addSuffix: true,
                              locale: dateFnsLocale,
                            })}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
                          <Link href={act.link as any} className="touch-manipulation">
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('recentActivity.empty')}</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Feature Hub (desktop — left column) */}
          <div className="hidden lg:block">
            <FeatureHubSection features={featureModules} />
          </div>
        </div>

        {/* Right column — tax-first bento stack */}
        <div className="min-w-0 space-y-5 lg:col-span-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:mt-0">
            {t('sectionPlanning')}
          </h2>
          {activeTaxOrder ? (
            <Card className="swiss-card-tilt border border-[var(--swiss-laurel-olive)]/30 bg-gradient-to-b from-background via-background to-muted/30 shadow-md ring-1 ring-[var(--swiss-laurel-olive)]/15 lg:min-h-[240px]">
              <CardHeader className="pb-1 pt-2 px-3 sm:px-4">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  {t('mandateTracking.title')}
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-[11px] truncate">
                  {maskSensitiveText(activeTaxOrder.serviceTitle)}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 sm:px-4 sm:pb-3">
                <div className="space-y-2">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${mandateProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right">{mandateProgress}%</p>
                  </div>

                  {/* Progress Steps */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4 sm:gap-1 sm:text-[10px]">
                    {[
                      { key: 'paid', label: t('mandateTracking.steps.paymentReceived') },
                      { key: 'documents', label: t('mandateTracking.steps.documentsUploaded') },
                      { key: 'in_progress', label: t('mandateTracking.steps.expertReview') },
                      { key: 'completed', label: t('mandateTracking.steps.finalSubmission') },
                    ].map((step) => {
                      const isCompleted =
                        step.key === 'paid' ||
                        (step.key === 'documents' &&
                          ['in_progress', 'pending_review', 'completed'].includes(activeTaxOrder.status)) ||
                        (step.key === 'in_progress' &&
                          ['pending_review', 'completed'].includes(activeTaxOrder.status)) ||
                        (step.key === 'completed' && activeTaxOrder.status === 'completed');
                      const isActive =
                        (step.key === 'paid' && activeTaxOrder.status === 'paid') ||
                        (step.key === 'documents' && activeTaxOrder.status === 'paid') ||
                        (step.key === 'in_progress' && activeTaxOrder.status === 'in_progress') ||
                        (step.key === 'completed' && activeTaxOrder.status === 'pending_review');

                      return (
                        <div key={step.key} className="flex min-h-[4.25rem] flex-col items-center justify-start gap-1 text-center sm:min-h-0 sm:gap-0">
                          <div
                            className={cn(
                              'mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-5 sm:w-5',
                              isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-muted',
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 sm:h-3 sm:w-3" />
                            ) : isActive ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-2.5 sm:w-2.5" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
                            )}
                          </div>
                          <span
                            className={cn(
                              'max-w-[9.5rem] leading-snug sm:max-w-none sm:leading-tight',
                              isCompleted || isActive ? 'font-medium' : 'text-muted-foreground',
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Document progress: only show mandatory ratio when the order defines a required count */}
                  {(activeTaxOrder.documentsRequired ?? 0) > 0 ? (
                    <div className="rounded bg-muted/40 px-2 py-1 text-center text-[10px] text-muted-foreground sm:px-3 sm:py-1.5 sm:text-[11px]">
                      {t('mandateTracking.documentsProgress', {
                        uploaded: taxDocumentsUploaded,
                        required: activeTaxOrder.documentsRequired ?? 0,
                      })}
                    </div>
                  ) : taxDocumentsUploaded > 0 ? (
                    <div className="rounded bg-muted/40 px-2 py-1 text-center text-[10px] text-muted-foreground sm:px-3 sm:py-1.5 sm:text-[11px]">
                      {t('mandateTracking.documentsProgressApprox', { count: taxDocumentsUploaded })}
                    </div>
                  ) : null}

                  {/* Status text */}
                  {activeTaxOrder.status === 'paid' && (
                    <p className="text-[10px] italic text-muted-foreground">
                      {t('mandateTracking.statusText.paid')}
                    </p>
                  )}
                  {activeTaxOrder.status === 'in_progress' && (
                    <p className="text-[10px] italic text-muted-foreground">
                      {t('mandateTracking.statusText.in_progress')}
                    </p>
                  )}
                  {activeTaxOrder.status === 'pending_review' && (
                    <p className="text-[10px] italic text-muted-foreground">
                      {t('mandateTracking.statusText.pending_review')}
                    </p>
                  )}
                  {activeTaxOrder.status === 'completed' && (
                    <p className="text-[10px] italic text-muted-foreground">
                      {t('mandateTracking.statusText.completed')}
                    </p>
                  )}

                  {/* CTA */}
                  {['pending_review', 'completed'].includes(activeTaxOrder.status) ? (
                    <Button variant="default" size="sm" asChild className="h-7 w-full text-[11px]">
                      <Link href="/individual/my-documents">
                        <Download className="mr-1 h-3 w-3" />
                        {t('mandateTracking.downloadDocuments')}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild className="h-7 w-full text-[11px]">
                      <Link href="/individual/tax-services">
                        {t('mandateTracking.viewDetails')}
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="swiss-card-tilt border border-dashed border-border/60 bg-gradient-to-b from-muted/20 to-muted/5 lg:min-h-[200px] ring-1 ring-border/30">
              <CardHeader className="space-y-2 sm:pb-2">
                <CardTitle className="font-headline text-lg tracking-tight sm:text-xl">{t('taxGlance.emptyTitle')}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{t('taxGlance.emptyDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <Button
                  asChild
                  className="w-full shadow-sm sm:w-auto bg-[var(--swiss-alpine-slate)] text-white hover:bg-[var(--swiss-deep-amethyst)]"
                >
                  <Link href="/individual/tax-services">{t('taxGlance.cta')}</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {latestScenario && (
            <Card className="swiss-card-tilt border-l-4 border-l-[var(--swiss-deep-amethyst)] rounded-l-none">
              <CardHeader className="pb-1 pt-2 px-3 sm:px-4">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                  <Calculator className="h-3.5 w-3.5 text-[var(--swiss-deep-amethyst)]" />
                  {t('latestScenario.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 sm:px-4">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                  {getScenarioTypeLabel(latestScenario.type)}
                </p>
                {(latestScenario.monthlyImpact !== undefined ||
                  latestScenario.annualImpact !== undefined) && (
                  <p
                    className={cn(
                      'mt-0.5 text-lg font-bold sm:text-xl',
                      (latestScenario.annualImpact ?? (latestScenario.monthlyImpact ?? 0) * 12) >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600',
                    )}
                  >
                    {(() => {
                      const annual =
                        latestScenario.annualImpact ??
                        (latestScenario.monthlyImpact !== undefined
                          ? latestScenario.monthlyImpact * 12
                          : undefined);
                      if (annual === undefined) return null;
                      const sign = annual >= 0 ? '+' : '';
                      return isPrivacyMode
                        ? `${sign}•••• CHF/year`
                        : `${sign}${Math.round(annual).toLocaleString()} CHF/year`;
                    })()}
                  </p>
                )}
                {latestScenario.monthlyImpact !== undefined && !isPrivacyMode && (
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {latestScenario.monthlyImpact >= 0 ? '+' : ''}
                    {latestScenario.monthlyImpact.toLocaleString()} CHF/month
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(latestScenario.createdAt, {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  })}
                </p>
                <Button variant="outline" size="sm" asChild className="mt-2 h-7 w-full text-[11px]">
                  <Link href="/individual/scenario-calculator">{t('latestScenario.viewAll')}</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {companyName && (
            <Card className="swiss-card-tilt">
              <CardHeader className="pb-1 pt-2 px-3 sm:px-4">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('companyAffiliation.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 sm:px-4">
                <p className="truncate text-xs font-medium sm:text-sm">{maskSensitiveText(companyName)}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border-border/60 shadow-sm ring-1 ring-border/30">
            <CardHeader className="border-b border-border/40 bg-muted/10 pb-3 pt-4 sm:px-5">
              <CardTitle className="font-headline text-base font-semibold sm:text-[1.05rem]">{t('quickActions.title')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5 px-3 pb-4 pt-4 sm:gap-3 sm:px-5 sm:pb-5">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  variant="outline"
                  asChild
                  className="flex min-h-[4rem] flex-col gap-1.5 rounded-xl border-border/70 bg-card/80 px-2 py-3 text-[10px] shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/40 touch-manipulation sm:min-h-[4.25rem] sm:text-[11px]"
                >
                  <Link href={action.href as any} className="flex flex-col items-center justify-center gap-1.5 text-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <action.icon className="h-4 w-4 flex-shrink-0" />
                    </span>
                    <span className="line-clamp-2 leading-tight">{action.title}</span>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}