
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCw } from "lucide-react";
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/navigation';
import { Link } from "@/navigation";
import { useLocale } from 'next-intl';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';

export type OrderStatus = 
  | "quote_requested" 
  | "invoice_sent" 
  | "paid" 
  | "in_progress" 
  | "pending_review" 
  | "completed" 
  | "cancelled"
  | "pending_payment";

export type Order = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceType: 'quote' | 'fixed';
  priceAmount: number;
  status: OrderStatus;
  intakeData?: {
    additionalInfo?: string;
  };
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
  userId: string;
  userEmail: string;
  userName: string;
};

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  errorTitle: string;
  fetchOrdersFailed: string;
  pageTitle: string;
  pageSubtitle: string;
  refresh: string;
  orderHistory: string;
  orderHistoryDescription: string;
  service: string;
  date: string;
  price: string;
  status: string;
  actions: string;
  na: string;
  quotePending: string;
  viewOrderDetails: string;
  noOrders: string;
  browseServices: string;
  pleaseLogin: string;
  login: string;
  statusQuoteRequested: string;
  statusInvoiceSent: string;
  statusPaid: string;
  statusInProgress: string;
  statusPendingReview: string;
  statusCompleted: string;
  statusCancelled: string;
  statusPendingPayment: string;
}> = {
  en: {
    errorTitle: 'Error', fetchOrdersFailed: 'Could not fetch your orders. Please try again.',
    pageTitle: 'My Orders', pageSubtitle: 'Track the status of your purchased services.', refresh: 'Refresh',
    orderHistory: 'Order History', orderHistoryDescription: 'A list of all your service requests and their current status.',
    service: 'Service', date: 'Date', price: 'Price', status: 'Status', actions: 'Actions',
    na: 'N/A', quotePending: 'Quote Pending', viewOrderDetails: 'View order details',
    noOrders: "You haven't purchased any services yet.", browseServices: 'Browse Services',
    pleaseLogin: 'Please log in to view your orders.', login: 'Log In',
    statusQuoteRequested: 'Quote Requested', statusInvoiceSent: 'Invoice Sent', statusPaid: 'Paid', statusInProgress: 'In Progress', statusPendingReview: 'Pending Review', statusCompleted: 'Completed', statusCancelled: 'Cancelled', statusPendingPayment: 'Pending Payment'
  },
  fr: { errorTitle: 'Erreur', fetchOrdersFailed: 'Impossible de recuperer vos commandes. Veuillez reessayer.', pageTitle: 'Mes commandes', pageSubtitle: 'Suivez le statut de vos services achetes.', refresh: 'Actualiser', orderHistory: 'Historique des commandes', orderHistoryDescription: 'Liste de toutes vos demandes de service et leur statut actuel.', service: 'Service', date: 'Date', price: 'Prix', status: 'Statut', actions: 'Actions', na: 'N/A', quotePending: 'Devis en attente', viewOrderDetails: 'Voir le detail de la commande', noOrders: "Vous n avez encore achete aucun service.", browseServices: 'Parcourir les services', pleaseLogin: 'Veuillez vous connecter pour voir vos commandes.', login: 'Se connecter', statusQuoteRequested: 'Devis demande', statusInvoiceSent: 'Facture envoyee', statusPaid: 'Paye', statusInProgress: 'En cours', statusPendingReview: 'En attente de revision', statusCompleted: 'Termine', statusCancelled: 'Annule', statusPendingPayment: 'Paiement en attente' },
  de: { errorTitle: 'Fehler', fetchOrdersFailed: 'Ihre Bestellungen konnten nicht geladen werden. Bitte erneut versuchen.', pageTitle: 'Meine Bestellungen', pageSubtitle: 'Verfolgen Sie den Status Ihrer gekauften Services.', refresh: 'Aktualisieren', orderHistory: 'Bestellverlauf', orderHistoryDescription: 'Liste aller Ihrer Serviceanfragen und ihres aktuellen Status.', service: 'Service', date: 'Datum', price: 'Preis', status: 'Status', actions: 'Aktionen', na: 'N/A', quotePending: 'Angebot ausstehend', viewOrderDetails: 'Bestelldetails anzeigen', noOrders: 'Sie haben noch keine Services gekauft.', browseServices: 'Services durchsuchen', pleaseLogin: 'Bitte melden Sie sich an, um Ihre Bestellungen zu sehen.', login: 'Anmelden', statusQuoteRequested: 'Angebot angefragt', statusInvoiceSent: 'Rechnung gesendet', statusPaid: 'Bezahlt', statusInProgress: 'In Bearbeitung', statusPendingReview: 'Pruefung ausstehend', statusCompleted: 'Abgeschlossen', statusCancelled: 'Storniert', statusPendingPayment: 'Zahlung ausstehend' },
  it: { errorTitle: 'Errore', fetchOrdersFailed: 'Impossibile recuperare i tuoi ordini. Riprova.', pageTitle: 'I miei ordini', pageSubtitle: 'Monitora lo stato dei servizi acquistati.', refresh: 'Aggiorna', orderHistory: 'Storico ordini', orderHistoryDescription: 'Elenco di tutte le tue richieste di servizio e del loro stato corrente.', service: 'Servizio', date: 'Data', price: 'Prezzo', status: 'Stato', actions: 'Azioni', na: 'N/A', quotePending: 'Preventivo in attesa', viewOrderDetails: 'Visualizza dettagli ordine', noOrders: 'Non hai ancora acquistato alcun servizio.', browseServices: 'Sfoglia servizi', pleaseLogin: 'Accedi per visualizzare i tuoi ordini.', login: 'Accedi', statusQuoteRequested: 'Preventivo richiesto', statusInvoiceSent: 'Fattura inviata', statusPaid: 'Pagato', statusInProgress: 'In corso', statusPendingReview: 'In attesa di revisione', statusCompleted: 'Completato', statusCancelled: 'Annullato', statusPendingPayment: 'Pagamento in attesa' },
  es: { errorTitle: 'Error', fetchOrdersFailed: 'No se pudieron obtener tus pedidos. Intentalo de nuevo.', pageTitle: 'Mis pedidos', pageSubtitle: 'Sigue el estado de tus servicios comprados.', refresh: 'Actualizar', orderHistory: 'Historial de pedidos', orderHistoryDescription: 'Lista de todas tus solicitudes de servicio y su estado actual.', service: 'Servicio', date: 'Fecha', price: 'Precio', status: 'Estado', actions: 'Acciones', na: 'N/A', quotePending: 'Presupuesto pendiente', viewOrderDetails: 'Ver detalles del pedido', noOrders: 'Todavia no has comprado ningun servicio.', browseServices: 'Explorar servicios', pleaseLogin: 'Inicia sesion para ver tus pedidos.', login: 'Iniciar sesion', statusQuoteRequested: 'Presupuesto solicitado', statusInvoiceSent: 'Factura enviada', statusPaid: 'Pagado', statusInProgress: 'En curso', statusPendingReview: 'Pendiente de revision', statusCompleted: 'Completado', statusCancelled: 'Cancelado', statusPendingPayment: 'Pago pendiente' },
};

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "completed":
      return "default";
    case "paid":
    case "in_progress":
    case "pending_review":
      return "secondary";
    case "quote_requested":
    case "invoice_sent":
    case "pending_payment":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const formatStatus = (status: OrderStatus, ui: (typeof UI_BY_LOCALE)[SupportedLocale]): string => {
  if (status === 'quote_requested') return ui.statusQuoteRequested;
  if (status === 'invoice_sent') return ui.statusInvoiceSent;
  if (status === 'paid') return ui.statusPaid;
  if (status === 'in_progress') return ui.statusInProgress;
  if (status === 'pending_review') return ui.statusPendingReview;
  if (status === 'completed') return ui.statusCompleted;
  if (status === 'cancelled') return ui.statusCancelled;
  return ui.statusPendingPayment;
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];
  const searchParams = useSearchParams();

  // Auto-reconcile payment when returning from Stripe checkout
  const reconcilePayment = useCallback(async (sessionId: string) => {
    if (!user) return;
    if (IS_GLOBAL_TEST_MODE) {
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orders/reconcile-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.updated) {
        toast({ title: ui.statusPaid, description: 'Payment confirmed.' });
      }
    } catch (e) {
      console.error('Reconciliation failed:', e);
    }
    window.history.replaceState({}, '', window.location.pathname);
  }, [user, toast, ui.statusPaid]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && user) {
      reconcilePayment(sessionId);
    }
  }, [searchParams, user, reconcilePayment]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const q = query(
      collection(firestore, 'users', user.uid, 'orders'), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Order, 'id'>)
      }));
      setOrders(userOrders);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      toast({
        title: ui.errorTitle,
        description: ui.fetchOrdersFailed,
        variant: "destructive"
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, ui.errorTitle, ui.fetchOrdersFailed, user]);

  const handleViewOrder = (orderId: string) => {
    router.push(`/individual/my-orders/${orderId}`);
  };

  if (!user && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
          <p className="text-muted-foreground">
            {ui.pageSubtitle}
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {ui.pleaseLogin}
            </p>
            <Button asChild>
              <Link href="/login">{ui.login}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
          <p className="text-muted-foreground">
            {ui.pageSubtitle}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {ui.refresh}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ui.orderHistory}</CardTitle>
          <CardDescription>
            {ui.orderHistoryDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ui.service}</TableHead>
                <TableHead>{ui.date}</TableHead>
                <TableHead>{ui.price}</TableHead>
                <TableHead>{ui.status}</TableHead>
                <TableHead className="text-right">{ui.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.serviceTitle}</TableCell>
                  <TableCell>
                    {order.createdAt 
                      ? format(new Date(order.createdAt.seconds * 1000), 'dd MMM yyyy') 
                      : ui.na}
                  </TableCell>
                  <TableCell>
                    {order.priceAmount 
                      ? `CHF ${(order.priceAmount / 100).toFixed(2)}` 
                      : ui.quotePending}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {formatStatus(order.status, ui)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleViewOrder(order.id)}
                      title={ui.viewOrderDetails}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">
                        {ui.noOrders}
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/individual/tax-services">{ui.browseServices}</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
