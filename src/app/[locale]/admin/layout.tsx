import { DashboardLayout } from "@/components/dashboard-layout";
import { adminNavItems } from "@/lib/constants";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="admin-workspace relative mx-auto w-full max-w-[1600px] px-0.5 sm:px-0">
        {children}
      </div>
    </DashboardLayout>
  );
}
