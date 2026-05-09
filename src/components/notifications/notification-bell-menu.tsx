'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, BarChart2, Calculator, CheckCheck, FileCheck, FileSearch, FileUp, Loader2, MessageSquare, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAdminNotifications } from '@/hooks/use-admin-notifications';
import { useNotifications, type Notification } from '@/hooks/use-notifications';
import type { AdminNotificationType } from '@/lib/admin-notifications';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'individual' | 'business' | 'accounting_firm' | null | undefined;

type UnifiedNotification = {
  id: string;
  title: string;
  description: string;
  read: boolean;
  link?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  icon: React.ReactNode;
};

const getUserNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'document':
      return <FileCheck className="h-4 w-4 text-blue-500" />;
    case 'scenario':
      return <Calculator className="h-4 w-4 text-emerald-500" />;
    case 'cfo_analysis_ready':
      return <BarChart2 className="h-4 w-4 text-violet-500" />;
    case 'system':
    default:
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
};

const getAdminNotificationIcon = (type: AdminNotificationType) => {
  switch (type) {
    case 'document_uploaded':
      return <FileUp className="h-4 w-4 text-blue-500" />;
    case 'employee_created':
      return <UserPlus className="h-4 w-4 text-emerald-500" />;
    case 'employee_updated':
      return <UserPlus className="h-4 w-4 text-teal-500" />;
    case 'scenario_review':
      return <FileSearch className="h-4 w-4 text-cyan-500" />;
    case 'tax_return_ready':
      return <FileCheck className="h-4 w-4 text-indigo-500" />;
    case 'document_request_fulfilled':
      return <FileCheck className="h-4 w-4 text-violet-500" />;
    case 'client_message':
      return <MessageSquare className="h-4 w-4 text-amber-500" />;
    case 'document_review':
      return <FileSearch className="h-4 w-4 text-orange-500" />;
    case 'system':
    default:
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
};

export function NotificationBellMenu({ userRole }: { userRole: UserRole }) {
  const router = useRouter();
  const t = useTranslations('Header');
  const [open, setOpen] = useState(false);
  const isAdmin = userRole === 'admin';
  const isUserNotificationRole = userRole === 'individual' || userRole === 'business' || userRole === 'accounting_firm';

  const userNotifications = useNotifications(isUserNotificationRole, 5);
  const adminNotifications = useAdminNotifications(5, isAdmin);

  const notificationCenterLink =
    userRole === 'admin'
      ? '/admin/notification-center'
      : userRole === 'business'
        ? '/business/notifications'
        : userRole === 'accounting_firm'
          ? '/accounting-firm/notifications'
          : '/individual/notifications';

  const notifications = useMemo<UnifiedNotification[]>(() => {
    if (isAdmin) {
      return adminNotifications.notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        description: notification.description,
        read: notification.read,
        link: notification.link,
        createdAt: notification.createdAt,
        icon: getAdminNotificationIcon(notification.type),
      }));
    }

    return userNotifications.notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      description: notification.description,
      read: notification.read,
      link: notification.link,
      createdAt: notification.createdAt,
      icon: getUserNotificationIcon(notification.type),
    }));
  }, [adminNotifications.notifications, isAdmin, userNotifications.notifications]);

  const isLoading = isAdmin ? adminNotifications.isLoading : userNotifications.isLoading;
  const unreadCount = isAdmin ? adminNotifications.unreadCount : userNotifications.unreadCount;
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const handleMarkAllAsRead = async () => {
    if (isAdmin) {
      await adminNotifications.markAllAsRead();
      return;
    }

    await userNotifications.markAllAsRead();
  };

  const handleNotificationClick = async (notification: UnifiedNotification) => {
    if (!notification.read) {
      if (isAdmin) {
        await adminNotifications.markAsRead(notification.id);
      } else {
        await userNotifications.markAsRead(notification.id);
      }
    }

    setOpen(false);
    router.push(notification.link || notificationCenterLink);
  };

  const handleViewAll = () => {
    setOpen(false);
    router.push(notificationCenterLink);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('openNotifications')}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {badgeLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{t('notificationsTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('unreadSummary', { count: unreadCount })}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void handleMarkAllAsRead()} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" />
            {t('markAllRead')}
          </Button>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loadingNotifications')}
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium">{t('noNotificationsTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('noNotificationsDescription')}</p>
            </div>
          )}

          {!isLoading && notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => void handleNotificationClick(notification)}
              className={cn(
                'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50',
                !notification.read && 'bg-primary/5'
              )}
            >
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                {notification.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn('truncate text-sm font-medium', notification.read && 'text-muted-foreground')}>
                    {notification.title}
                  </span>
                  {!notification.read && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{t('newBadge')}</Badge>}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{notification.description}</span>
                <span className="mt-2 block text-[11px] text-muted-foreground">
                  {notification.createdAt
                    ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true })
                    : t('justNow')}
                </span>
              </span>
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="outline" className="w-full" onClick={handleViewAll}>
            {t('viewAllNotifications')}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}