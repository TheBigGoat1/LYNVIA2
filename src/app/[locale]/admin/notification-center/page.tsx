'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Check,
  Bell,
  FileCheck,
  FileUp,
  UserPlus,
  UserPen,
  MessageSquare,
  FileSearch,
  AlertTriangle,
  Trash2,
  Filter,
  Calculator,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useAdminNotifications, type AdminNotification } from '@/hooks/use-admin-notifications';
import type { AdminNotificationType } from '@/lib/admin-notifications';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useLocale } from 'next-intl';

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';
const resolveLocale = (l: string): SupportedLocale => {
  const n = l.toLowerCase().split('-')[0];
  return (n === 'fr' || n === 'de' || n === 'it' || n === 'es') ? n : 'en';
};

const UI: Record<SupportedLocale, Record<string, string>> = {
  en: {
    pageTitle: 'Notification Center',
    pageSubtitle: 'All client interactions and system events in one place.',
    markAllRead: 'Mark all as read',
    unread: 'unread',
    view: 'View',
    markAsRead: 'Mark as Read',
    archive: 'Archive',
    noNotifications: 'No notifications yet',
    noNotificationsDesc: 'Client interactions and system events will appear here.',
    all: 'All',
    documents: 'Documents',
    employees: 'Employees',
    messages: 'Messages',
    reviews: 'Reviews',
    uploads: 'Uploads',
  },
  fr: {
    pageTitle: 'Centre de notifications',
    pageSubtitle: 'Toutes les interactions clients et événements système au même endroit.',
    markAllRead: 'Tout marquer comme lu',
    unread: 'non lues',
    view: 'Voir',
    markAsRead: 'Marquer comme lu',
    archive: 'Archiver',
    noNotifications: 'Aucune notification',
    noNotificationsDesc: 'Les interactions clients et événements système apparaîtront ici.',
    all: 'Tout',
    documents: 'Documents',
    employees: 'Employés',
    messages: 'Messages',
    reviews: 'Revisions',
    uploads: 'Téléversements',
  },
  de: {
    pageTitle: 'Benachrichtigungszentrum',
    pageSubtitle: 'Alle Kundeninteraktionen und Systemereignisse an einem Ort.',
    markAllRead: 'Alle als gelesen markieren',
    unread: 'ungelesen',
    view: 'Anzeigen',
    markAsRead: 'Als gelesen markieren',
    archive: 'Archivieren',
    noNotifications: 'Keine Benachrichtigungen',
    noNotificationsDesc: 'Kundeninteraktionen und Systemereignisse erscheinen hier.',
    all: 'Alle',
    documents: 'Dokumente',
    employees: 'Mitarbeiter',
    messages: 'Nachrichten',
    reviews: 'Prüfungen',
    uploads: 'Uploads',
  },
  it: {
    pageTitle: 'Centro notifiche',
    pageSubtitle: 'Tutte le interazioni con i clienti e gli eventi di sistema in un unico posto.',
    markAllRead: 'Segna tutto come letto',
    unread: 'non lette',
    view: 'Visualizza',
    markAsRead: 'Segna come letto',
    archive: 'Archivia',
    noNotifications: 'Nessuna notifica',
    noNotificationsDesc: 'Le interazioni con i clienti e gli eventi di sistema appariranno qui.',
    all: 'Tutto',
    documents: 'Documenti',
    employees: 'Dipendenti',
    messages: 'Messaggi',
    reviews: 'Revisioni',
    uploads: 'Caricamenti',
  },
  es: {
    pageTitle: 'Centro de notificaciones',
    pageSubtitle: 'Todas las interacciones de clientes y eventos del sistema en un solo lugar.',
    markAllRead: 'Marcar todo como leído',
    unread: 'no leídas',
    view: 'Ver',
    markAsRead: 'Marcar como leído',
    archive: 'Archivar',
    noNotifications: 'Sin notificaciones',
    noNotificationsDesc: 'Las interacciones de clientes y eventos del sistema aparecerán aquí.',
    all: 'Todo',
    documents: 'Documentos',
    employees: 'Empleados',
    messages: 'Mensajes',
    reviews: 'Revisiones',
    uploads: 'Subidas',
  },
};

const typeIcon: Record<AdminNotificationType, React.ReactNode> = {
  document_uploaded: <FileUp className="h-5 w-5 text-blue-500" />,
  employee_created: <UserPlus className="h-5 w-5 text-green-500" />,
  employee_updated: <UserPen className="h-5 w-5 text-teal-600" />,
  document_request_fulfilled: <FileCheck className="h-5 w-5 text-purple-500" />,
  client_message: <MessageSquare className="h-5 w-5 text-amber-500" />,
  document_review: <FileSearch className="h-5 w-5 text-orange-500" />,
  scenario_review: <Calculator className="h-5 w-5 text-cyan-600" />,
  tax_return_ready: <Receipt className="h-5 w-5 text-indigo-600" />,
  system: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
};

const typeLabel: Record<AdminNotificationType, string> = {
  document_uploaded: 'Upload',
  employee_created: 'Employee',
  employee_updated: 'Employee update',
  document_request_fulfilled: 'Request fulfilled',
  client_message: 'Message',
  document_review: 'Review',
  scenario_review: 'Scenario',
  tax_return_ready: 'Tax return',
  system: 'System',
};

const EMPLOYEE_NOTIFICATION_TYPES: AdminNotificationType[] = ['employee_created', 'employee_updated'];

type FilterKey = 'all' | AdminNotificationType;

const FILTERS: { key: FilterKey; types: AdminNotificationType[]; uiKey: string }[] = [
  { key: 'all', types: [], uiKey: 'all' },
  { key: 'document_uploaded', types: ['document_uploaded'], uiKey: 'uploads' },
  { key: 'employee_created', types: ['employee_created'], uiKey: 'employees' },
  { key: 'document_request_fulfilled', types: ['document_request_fulfilled'], uiKey: 'documents' },
  { key: 'client_message', types: ['client_message'], uiKey: 'messages' },
  { key: 'document_review', types: ['document_review'], uiKey: 'reviews' },
];

export default function AdminNotificationCenterPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, archive } =
    useAdminNotifications();
  const locale = resolveLocale(useLocale());
  const ui = UI[locale];
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filtered =
    activeFilter === 'all'
      ? notifications
      : activeFilter === 'employee_created'
        ? notifications.filter((n) => EMPLOYEE_NOTIFICATION_TYPES.includes(n.type))
        : notifications.filter((n) => n.type === activeFilter);

  const getFilterCount = (key: FilterKey) => {
    if (key === 'all') return notifications.filter((n) => !n.read).length;
    if (key === 'employee_created') {
      return notifications.filter((n) => EMPLOYEE_NOTIFICATION_TYPES.includes(n.type) && !n.read).length;
    }
    return notifications.filter((n) => n.type === key && !n.read).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
        <p className="text-muted-foreground">{ui.pageSubtitle}</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = getFilterCount(f.key);
          return (
            <Button
              key={f.key}
              variant={activeFilter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(f.key)}
              className="gap-1.5"
            >
              {ui[f.uiKey] ?? f.uiKey}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {ui.pageTitle}
            </CardTitle>
            <Button variant="ghost" onClick={markAllAsRead} disabled={unreadCount === 0}>
              {ui.markAllRead}
            </Button>
          </div>
          <CardDescription>
            {unreadCount} {ui.unread}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-start space-x-4 p-4 rounded-lg border">
                  <Skeleton className="h-6 w-6 rounded-full mt-1" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </li>
              ))}

            {!isLoading &&
              filtered.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'flex items-start space-x-4 p-4 rounded-lg transition-colors',
                    n.read ? 'bg-secondary/50' : 'bg-card border border-primary/20',
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    {typeIcon[n.type] ?? typeIcon.system}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('font-medium', n.read && 'text-muted-foreground')}>
                        {n.title}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {typeLabel[n.type] ?? n.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{n.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {n.clientName && <span>{n.clientName}</span>}
                      {n.companyName && <span>· {n.companyName}</span>}
                      {n.createdAt && (
                        <span>
                          ·{' '}
                          {formatDistanceToNow(new Date(n.createdAt.seconds * 1000), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {n.link && (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={n.link}>{ui.view}</Link>
                      </Button>
                    )}
                    {!n.read && (
                      <Button variant="outline" size="sm" onClick={() => markAsRead(n.id)}>
                        <Check className="mr-1 h-3 w-3" />
                        {ui.markAsRead}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => archive(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{ui.noNotifications}</h3>
                <p className="text-muted-foreground">{ui.noNotificationsDesc}</p>
              </div>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
