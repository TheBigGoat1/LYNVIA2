import { PendingApprovalGate } from "@/components/pending-approval-gate";
import { ProfileCompletionGate } from "@/components/profile-completion-gate";
import { AccountingFirmAccessGuard } from "@/components/auth/role-access-guard";
import { AccountingFirmLayoutShell } from "@/components/accounting-firm-layout-shell";

export default function AccountingFirmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PendingApprovalGate>
      <AccountingFirmAccessGuard>
        <ProfileCompletionGate>
          <AccountingFirmLayoutShell>{children}</AccountingFirmLayoutShell>
        </ProfileCompletionGate>
      </AccountingFirmAccessGuard>
    </PendingApprovalGate>
  );
}
