import { PendingApprovalGate } from "@/components/pending-approval-gate";
import { ProfileCompletionGate } from "@/components/profile-completion-gate";
import { AccountingFirmLayoutShell } from "@/components/accounting-firm-layout-shell";

export default function AccountingFirmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PendingApprovalGate>
      <ProfileCompletionGate>
        <AccountingFirmLayoutShell>{children}</AccountingFirmLayoutShell>
      </ProfileCompletionGate>
    </PendingApprovalGate>
  );
}
