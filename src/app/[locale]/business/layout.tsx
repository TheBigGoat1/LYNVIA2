import { DashboardLayout } from "@/components/dashboard-layout";
import { PendingApprovalGate } from "@/components/pending-approval-gate";
import { ProfileCompletionGate } from "@/components/profile-completion-gate";
import { FiduciaryClientAccessGate } from "@/components/fiduciary-client-access-gate";
import { BusinessAccessGuard } from "@/components/auth/role-access-guard";
import { businessNavItems } from "@/lib/constants";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PendingApprovalGate>
      <BusinessAccessGuard>
        <ProfileCompletionGate>
          <FiduciaryClientAccessGate>
            <DashboardLayout navItems={businessNavItems}>
              {children}
            </DashboardLayout>
          </FiduciaryClientAccessGate>
        </ProfileCompletionGate>
      </BusinessAccessGuard>
    </PendingApprovalGate>
  );
}
