'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { IndividualAccessGuard } from '@/components/individual/individual-access-guard';
import { IndividualEntryShell } from '@/components/individual/individual-entry-shell';
import { individualNavItems } from '@/lib/constants';

export default function IndividualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <IndividualAccessGuard>
      <DashboardLayout navItems={individualNavItems}>
        <IndividualEntryShell>{children}</IndividualEntryShell>
      </DashboardLayout>
    </IndividualAccessGuard>
  );
}
