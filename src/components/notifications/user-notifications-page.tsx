'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Bell, FileCheck, Calculator, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/navigation';
import { useNotifications, type Notification } from '@/hooks/use-notifications';
import { useLocale } from 'next-intl';

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  pageTitle: string;
  pageSubtitle: string;
  yourNotifications: string;
  markAllRead: string;
  unreadCount: string;
  errorTitle: string;
  markAllFailed: string;
  view: string;
  markAsRead: string;
  archive: string;
  noNotificationsTitle: string;
  noNotificationsDescription: string;
}> = {
  en: {
    pageTitle: 'Notifications', pageSubtitle: 'All your important updates, alerts, and reminders in one place.',
    yourNotifications: 'Your Notifications', markAllRead: 'Mark all as read', unreadCount: 'unread notifications',
    errorTitle: 'Error', markAllFailed: 'Could not mark all notifications as read.',
    view: 'View', markAsRead: 'Mark as Read', archive: 'Archive',
    noNotificationsTitle: 'No notifications yet', noNotificationsDescription: 'Important updates will appear here.'
  },
  fr: { pageTitle: 'Notifications', pageSubtitle: 'Toutes vos mises a jour, alertes et rappels importants au meme endroit.', yourNotifications: 'Vos notifications', markAllRead: 'Tout marquer comme lu', unreadCount: 'notifications non lues', errorTitle: 'Erreur', markAllFailed: 'Impossible de tout marquer comme lu.', view: 'Voir', markAsRead: 'Marquer comme lu', archive: 'Archiver', noNotificationsTitle: 'Aucune notification pour le moment', noNotificationsDescription: 'Les mises a jour importantes apparaitront ici.' },
  de: { pageTitle: 'Benachrichtigungen', pageSubtitle: 'Alle wichtigen Updates, Warnungen und Erinnerungen an einem Ort.', yourNotifications: 'Ihre Benachrichtigungen', markAllRead: 'Alle als gelesen markieren', unreadCount: 'ungelesene Benachrichtigungen', errorTitle: 'Fehler', markAllFailed: 'Alle Benachrichtigungen konnten nicht als gelesen markiert werden.', view: 'Anzeigen', markAsRead: 'Als gelesen markieren', archive: 'Archivieren', noNotificationsTitle: 'Noch keine Benachrichtigungen', noNotificationsDescription: 'Wichtige Updates erscheinen hier.' },
  it: { pageTitle: 'Notifiche', pageSubtitle: 'Tutti i tuoi aggiornamenti, avvisi e promemoria importanti in un unico posto.', yourNotifications: 'Le tue notifiche', markAllRead: 'Segna tutto come letto', unreadCount: 'notifiche non lette', errorTitle: 'Errore', markAllFailed: 'Impossibile segnare tutte le notifiche come lette.', view: 'Visualizza', markAsRead: 'Segna come letto', archive: 'Archivia', noNotificationsTitle: 'Nessuna notifica al momento', noNotificationsDescription: 'Gli aggiornamenti importanti appariranno qui.' },
  es: { pageTitle: 'Notificaciones', pageSubtitle: 'Todas tus actualizaciones, alertas y recordatorios importantes en un solo lugar.', yourNotifications: 'Tus notificaciones', markAllRead: 'Marcar todo como leido', unreadCount: 'notificaciones no leidas', errorTitle: 'Error', markAllFailed: 'No se pudieron marcar todas las notificaciones como leidas.', view: 'Ver', markAsRead: 'Marcar como leido', archive: 'Archivar', noNotificationsTitle: 'Aun no hay notificaciones', noNotificationsDescription: 'Las actualizaciones importantes apareceran aqui.' },
};

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'document':
      return <FileCheck className="h-5 w-5 text-blue-500" />;
    case 'scenario':
      return <Calculator className="h-5 w-5 text-green-500" />;
    case 'system':
    default:
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  }
};

export function UserNotificationsPage() {
  const { toast } = useToast();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, archive } = useNotifications();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Error marking all as read: ", error);
      toast({
        title: ui.errorTitle,
        description: ui.markAllFailed,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
        <p className="text-muted-foreground">
          {ui.pageSubtitle}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{ui.yourNotifications}</CardTitle>
            <Button variant="ghost" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>{ui.markAllRead}</Button>
          </div>
          <CardDescription>{`You have ${unreadCount} ${ui.unreadCount}.`}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {isLoading && (
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-start space-x-4 p-4 rounded-lg border">
                  <Skeleton className="h-6 w-6 rounded-full mt-1" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </li>
              ))
            )}
            {!isLoading && notifications.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  "flex items-start space-x-4 p-4 rounded-lg transition-colors",
                  notification.read ? "bg-secondary/50" : "bg-card border"
                )}
              >
                <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <p className={cn("font-medium", notification.read && "text-muted-foreground")}>
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true }) : '...'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {notification.link && <Button asChild variant="secondary" size="sm"><Link href={notification.link}>{ui.view}</Link></Button>}
                  {!notification.read && (
                    <Button variant="outline" size="sm" onClick={() => void markAsRead(notification.id)}>
                      <Check className="mr-2 h-4 w-4" />
                      {ui.markAsRead}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => void archive(notification.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {ui.archive}
                  </Button>
                </div>
              </li>
            ))}
            {!isLoading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Bell className="h-12 w-12 text-muted-foreground mb-4"/>
                <h3 className="text-lg font-semibold">{ui.noNotificationsTitle}</h3>
                <p className="text-muted-foreground">{ui.noNotificationsDescription}</p>
              </div>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}