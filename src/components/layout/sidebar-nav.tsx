
"use client";

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname, Link } from "@/navigation";
import * as Icons from "lucide-react";
import type { NavItem } from "@/lib/types";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslations } from "next-intl";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useFirebase } from "@/firebase/firebase-provider";
import { usePendingApprovals } from "@/hooks/use-pending-approvals";
import { useCommUnread } from "@/hooks/use-comm-unread";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { BrandLogo } from "@/components/brand/brand-logo";

interface SidebarNavProps {
    navItems: NavItem[];
}

export default function SidebarNav({ navItems }: SidebarNavProps) {
  const pathname = usePathname();
  const tNav = useTranslations("Sidebar");
  const { userRole } = useFirebase();
  const isUserRole = userRole === 'individual' || userRole === 'business' || userRole === 'accounting_firm';
  const { unreadCount } = useNotifications(isUserRole);
  const { unreadCount: adminUnreadCount } = useAdminNotifications(200, userRole === 'admin');
  const { pendingApprovalsCount } = usePendingApprovals();
  const { unreadCount: commUnreadCount } = useCommUnread();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const navCollapsed = state === "collapsed" && !isMobile;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isNavItemActive = (href: string) => {
    return pathname === href;
  };
  
  const Icon = ({ name, ...props }: { name: keyof typeof Icons } & React.ComponentProps<typeof Icons.Icon>) => {
    const LucideIcon = Icons[name] as React.FC<any>;
    return <LucideIcon {...props} />;
  }

  const getBadgeCount = (item: NavItem) => {
    if (userRole === 'admin' && item.href === '/admin/document-approvals') {
      return pendingApprovalsCount;
    }

    if (userRole === 'admin' && item.href === '/admin/notification-center') {
      return adminUnreadCount;
    }

    if (userRole === 'admin' && item.href === '/admin/communications') {
      return commUnreadCount;
    }
    
    if ((userRole === 'individual' || userRole === 'business' || userRole === 'accounting_firm')
      && (item.href === '/individual/notifications' || item.href === '/business/notifications' || item.href === '/accounting-firm/notifications')) {
      return unreadCount;
    }

    if ((userRole === 'business' || userRole === 'accounting_firm')
      && (item.href === '/business/announcements' || item.href === '/accounting-firm/announcements')) {
      return commUnreadCount;
    }
    
    return item.badge;
  }

  return (
    <>
      <SidebarHeader className="group-data-[collapsible=icon]:border-b-0 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2">
        <Link
          href="/"
          className="block min-w-0 rounded-md font-bold tracking-tight text-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent/50 focus-visible:ring-2"
          onClick={handleNavClick}
        >
          {navCollapsed ? (
            <span className="flex justify-center py-0.5">
              <BrandLogo size={30} tone="theme" decorative />
            </span>
          ) : (
            <BrandWordmark tone="dashboard" className="min-w-0" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const badgeCount = getBadgeCount(item);
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isNavItemActive(item.href)}
                  tooltip={{ children: item.tKey ? tNav(item.tKey) : item.title }}
                >
                  <Link href={item.href} onClick={handleNavClick}>
                    <Icon name={item.icon as keyof typeof Icons} />
                    <span>{item.tKey ? tNav(item.tKey) : item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {badgeCount && badgeCount > 0 ? <SidebarMenuBadge>{badgeCount}</SidebarMenuBadge> : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
