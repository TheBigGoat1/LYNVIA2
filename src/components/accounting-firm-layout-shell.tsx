'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { accountingNavItems } from '@/lib/constants';
import { useAccountingSubscription } from '@/hooks/use-accounting-subscription';
import { isPlanAtLeast } from '@/lib/accounting-subscriptions';
import type { NavItem } from '@/lib/types';

const ALWAYS_ALLOWED_PATHS = [
  '/accounting-firm/purchase-services',
  '/accounting-firm/legal-assistant',
  '/accounting-firm/billing',
];

function getRequiredPlanForPath(pathname: string): 'basic' | 'pro' {
  if (
    pathname.startsWith('/accounting-firm/client-portfolio') ||
    pathname.startsWith('/accounting-firm/client-documents') ||
    pathname.startsWith('/accounting-firm/notification-tester')
  ) {
    return 'pro';
  }

  if (
    pathname.startsWith('/accounting-firm/scenario-analysis') ||
    pathname.startsWith('/accounting-firm/analytics') ||
    pathname.startsWith('/accounting-firm/financial-reports') ||
    pathname.startsWith('/accounting-firm/document-generator') ||
    pathname.startsWith('/accounting-firm/audit-logs')
  ) {
    return 'pro';
  }

  return 'basic';
}

function filterNavItems(plan: 'basic' | 'pro'): NavItem[] {
  return accountingNavItems;
}

export function AccountingFirmLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const subscription = useAccountingSubscription();

  const navItems = filterNavItems(subscription.plan);
  const requiredPlan = getRequiredPlanForPath(pathname);
  const isAllowedPath =
    ALWAYS_ALLOWED_PATHS.some((allowed) => pathname.startsWith(allowed)) ||
    isPlanAtLeast(subscription.plan, requiredPlan);

  if (!subscription.loading && !isAllowedPath) {
    return (
      <DashboardLayout navItems={navItems}>
        <div className="mx-auto mt-10 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Upgrade Required</CardTitle>
              <CardDescription>
                This feature requires the {requiredPlan.toUpperCase()} subscription plan. Your current plan is {subscription.plan.toUpperCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/accounting-firm/purchase-services">View Subscription Plans</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return <DashboardLayout navItems={navItems}>{children}</DashboardLayout>;
}
