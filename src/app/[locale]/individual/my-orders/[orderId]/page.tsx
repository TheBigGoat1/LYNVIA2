
'use client';

import { useState, useEffect } from 'react';
import { useRouter, Link } from '@/navigation';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, FileText, CreditCard, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderStatus } from '../page';
import { useLocale } from 'next-intl';

interface OrderDetailPageProps {
  params: { orderId: string };
}

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') {
    return normalized;
  }
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  orderNotFound: string;
  requestedOrderNotFound: string;
  errorTitle: string;
  fetchOrderFailed: string;
  backToOrders: string;
  orderId: string;
  orderDate: string;
  lastUpdated: string;
  serviceType: string;
  amount: string;
  na: string;
  quotePending: string;
  additionalInfo: string;
  needHelp: string;
  contactSupport: string;
  browseMoreServices: string;
  statusQuoteRequested: string;
  statusInvoiceSent: string;
  statusPaid: string;
  statusInProgress: string;
  statusPendingReview: string;
  statusCompleted: string;
  statusCancelled: string;
  statusPendingPayment: string;
  descQuoteRequested: string;
  descInvoiceSent: string;
  descPendingPayment: string;
  descPaid: string;
  descInProgress: string;
  descPendingReview: string;
  descCompleted: string;
  descCancelled: string;
  descDefault: string;
}> = {
  en: {
    orderNotFound: 'Order Not Found', requestedOrderNotFound: 'The requested order could not be found.', errorTitle: 'Error', fetchOrderFailed: 'Could not fetch order details.',
    backToOrders: 'Back to Orders', orderId: 'Order ID', orderDate: 'Order Date', lastUpdated: 'Last Updated', serviceType: 'Service Type', amount: 'Amount', na: 'N/A', quotePending: 'Quote Pending',
    additionalInfo: 'Additional Information Provided', needHelp: 'Need Help?', contactSupport: 'Contact Support', browseMoreServices: 'Browse More Services',
    statusQuoteRequested: 'Quote Requested', statusInvoiceSent: 'Invoice Sent', statusPaid: 'Paid', statusInProgress: 'In Progress', statusPendingReview: 'Pending Review', statusCompleted: 'Completed', statusCancelled: 'Cancelled', statusPendingPayment: 'Pending Payment',
    descQuoteRequested: 'Your quote request is being reviewed by our team.', descInvoiceSent: 'An invoice has been sent to your email. Please complete the payment.', descPendingPayment: 'Awaiting payment. Please complete your payment to proceed.', descPaid: 'Payment received. Your service will begin shortly.', descInProgress: 'Our team is actively working on your service.', descPendingReview: 'Your documents are ready for your review.', descCompleted: 'Service completed. Thank you for your business!', descCancelled: 'This order has been cancelled.', descDefault: 'Processing your request.'
  },
  fr: { orderNotFound: 'Commande introuvable', requestedOrderNotFound: 'La commande demandee est introuvable.', errorTitle: 'Erreur', fetchOrderFailed: 'Impossible de recuperer les details de la commande.', backToOrders: 'Retour aux commandes', orderId: 'ID de commande', orderDate: 'Date de commande', lastUpdated: 'Derniere mise a jour', serviceType: 'Type de service', amount: 'Montant', na: 'N/A', quotePending: 'Devis en attente', additionalInfo: 'Informations supplementaires fournies', needHelp: 'Besoin d aide ?', contactSupport: 'Contacter le support', browseMoreServices: 'Voir plus de services', statusQuoteRequested: 'Devis demande', statusInvoiceSent: 'Facture envoyee', statusPaid: 'Paye', statusInProgress: 'En cours', statusPendingReview: 'En attente de revision', statusCompleted: 'Termine', statusCancelled: 'Annule', statusPendingPayment: 'Paiement en attente', descQuoteRequested: 'Votre demande de devis est en cours de revision.', descInvoiceSent: 'Une facture a ete envoyee a votre email. Veuillez effectuer le paiement.', descPendingPayment: 'Paiement en attente. Veuillez regler pour continuer.', descPaid: 'Paiement recu. Votre service commencera bientot.', descInProgress: 'Notre equipe travaille activement sur votre service.', descPendingReview: 'Vos documents sont prets pour votre revision.', descCompleted: 'Service termine. Merci pour votre confiance.', descCancelled: 'Cette commande a ete annulee.', descDefault: 'Traitement de votre demande.' },
  de: { orderNotFound: 'Bestellung nicht gefunden', requestedOrderNotFound: 'Die angeforderte Bestellung wurde nicht gefunden.', errorTitle: 'Fehler', fetchOrderFailed: 'Bestelldetails konnten nicht geladen werden.', backToOrders: 'Zurueck zu Bestellungen', orderId: 'Bestellnummer', orderDate: 'Bestelldatum', lastUpdated: 'Zuletzt aktualisiert', serviceType: 'Servicetyp', amount: 'Betrag', na: 'N/A', quotePending: 'Angebot ausstehend', additionalInfo: 'Zusaetzliche Angaben', needHelp: 'Brauchen Sie Hilfe?', contactSupport: 'Support kontaktieren', browseMoreServices: 'Weitere Services durchsuchen', statusQuoteRequested: 'Angebot angefragt', statusInvoiceSent: 'Rechnung gesendet', statusPaid: 'Bezahlt', statusInProgress: 'In Bearbeitung', statusPendingReview: 'Pruefung ausstehend', statusCompleted: 'Abgeschlossen', statusCancelled: 'Storniert', statusPendingPayment: 'Zahlung ausstehend', descQuoteRequested: 'Ihre Angebotsanfrage wird von unserem Team geprueft.', descInvoiceSent: 'Eine Rechnung wurde an Ihre E-Mail gesendet. Bitte bezahlen Sie.', descPendingPayment: 'Zahlung ausstehend. Bitte Zahlung abschliessen.', descPaid: 'Zahlung erhalten. Ihr Service beginnt in Kuerze.', descInProgress: 'Unser Team arbeitet aktiv an Ihrem Service.', descPendingReview: 'Ihre Dokumente sind zur Pruefung bereit.', descCompleted: 'Service abgeschlossen. Vielen Dank.', descCancelled: 'Diese Bestellung wurde storniert.', descDefault: 'Ihre Anfrage wird bearbeitet.' },
  it: { orderNotFound: 'Ordine non trovato', requestedOrderNotFound: 'L ordine richiesto non e stato trovato.', errorTitle: 'Errore', fetchOrderFailed: 'Impossibile recuperare i dettagli dell ordine.', backToOrders: 'Torna agli ordini', orderId: 'ID ordine', orderDate: 'Data ordine', lastUpdated: 'Ultimo aggiornamento', serviceType: 'Tipo servizio', amount: 'Importo', na: 'N/A', quotePending: 'Preventivo in attesa', additionalInfo: 'Informazioni aggiuntive fornite', needHelp: 'Hai bisogno di aiuto?', contactSupport: 'Contatta il supporto', browseMoreServices: 'Sfoglia altri servizi', statusQuoteRequested: 'Preventivo richiesto', statusInvoiceSent: 'Fattura inviata', statusPaid: 'Pagato', statusInProgress: 'In corso', statusPendingReview: 'In attesa di revisione', statusCompleted: 'Completato', statusCancelled: 'Annullato', statusPendingPayment: 'Pagamento in attesa', descQuoteRequested: 'La tua richiesta di preventivo e in revisione.', descInvoiceSent: 'Una fattura e stata inviata via email. Completa il pagamento.', descPendingPayment: 'In attesa di pagamento. Completa il pagamento per procedere.', descPaid: 'Pagamento ricevuto. Il tuo servizio iniziera a breve.', descInProgress: 'Il nostro team sta lavorando attivamente al tuo servizio.', descPendingReview: 'I tuoi documenti sono pronti per la revisione.', descCompleted: 'Servizio completato. Grazie per la fiducia.', descCancelled: 'Questo ordine e stato annullato.', descDefault: 'Elaborazione della tua richiesta.' },
  es: { orderNotFound: 'Pedido no encontrado', requestedOrderNotFound: 'No se pudo encontrar el pedido solicitado.', errorTitle: 'Error', fetchOrderFailed: 'No se pudieron obtener los detalles del pedido.', backToOrders: 'Volver a pedidos', orderId: 'ID de pedido', orderDate: 'Fecha de pedido', lastUpdated: 'Ultima actualizacion', serviceType: 'Tipo de servicio', amount: 'Importe', na: 'N/A', quotePending: 'Presupuesto pendiente', additionalInfo: 'Informacion adicional proporcionada', needHelp: 'Necesitas ayuda?', contactSupport: 'Contactar soporte', browseMoreServices: 'Explorar mas servicios', statusQuoteRequested: 'Presupuesto solicitado', statusInvoiceSent: 'Factura enviada', statusPaid: 'Pagado', statusInProgress: 'En curso', statusPendingReview: 'Pendiente de revision', statusCompleted: 'Completado', statusCancelled: 'Cancelado', statusPendingPayment: 'Pago pendiente', descQuoteRequested: 'Tu solicitud de presupuesto esta siendo revisada por nuestro equipo.', descInvoiceSent: 'Se envio una factura a tu correo. Completa el pago.', descPendingPayment: 'Pago pendiente. Completa el pago para continuar.', descPaid: 'Pago recibido. Tu servicio comenzara en breve.', descInProgress: 'Nuestro equipo esta trabajando activamente en tu servicio.', descPendingReview: 'Tus documentos estan listos para tu revision.', descCompleted: 'Servicio completado. Gracias por tu confianza.', descCancelled: 'Este pedido ha sido cancelado.', descDefault: 'Procesando tu solicitud.' },
};

const getStatusInfo = (status: OrderStatus, ui: (typeof UI_BY_LOCALE)[SupportedLocale]) => {
  switch (status) {
    case 'quote_requested':
      return { 
        icon: Clock, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-100',
        description: ui.descQuoteRequested
      };
    case 'invoice_sent':
      return { 
        icon: FileText, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100',
        description: ui.descInvoiceSent
      };
    case 'pending_payment':
      return { 
        icon: CreditCard, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-100',
        description: ui.descPendingPayment
      };
    case 'paid':
      return { 
        icon: CheckCircle2, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        description: ui.descPaid
      };
    case 'in_progress':
      return { 
        icon: Clock, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100',
        description: ui.descInProgress
      };
    case 'pending_review':
      return { 
        icon: AlertCircle, 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-100',
        description: ui.descPendingReview
      };
    case 'completed':
      return { 
        icon: CheckCircle2, 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        description: ui.descCompleted
      };
    case 'cancelled':
      return { 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        description: ui.descCancelled
      };
    default:
      return { 
        icon: Clock, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100',
        description: ui.descDefault
      };
  }
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

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      router.push('/login');
      return;
    }

    const orderRef = doc(firestore, 'users', user.uid, 'orders', params.orderId);
    
    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() } as Order;
        setOrder(orderData);
      } else {
        toast({
          title: ui.orderNotFound,
          description: ui.requestedOrderNotFound,
          variant: "destructive"
        });
        router.push('/individual/my-orders');
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching order: ", error);
      toast({
        title: ui.errorTitle,
        description: ui.fetchOrderFailed,
        variant: "destructive"
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [params.orderId, router, toast, ui.errorTitle, ui.fetchOrderFailed, ui.orderNotFound, ui.requestedOrderNotFound, user]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-40" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const statusInfo = getStatusInfo(order.status, ui);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {ui.backToOrders}
      </Button>

      {/* Status Banner */}
      <Card className={`${statusInfo.bgColor} border-0`}>
        <CardContent className="flex items-center gap-4 py-6">
          <StatusIcon className={`h-10 w-10 ${statusInfo.color}`} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{formatStatus(order.status, ui)}</h2>
            <p className="text-muted-foreground">{statusInfo.description}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm">
            {formatStatus(order.status, ui)}
          </Badge>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>{order.serviceTitle}</CardTitle>
          <CardDescription>
            {ui.orderId}: {order.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{ui.orderDate}</p>
              <p className="font-medium">
                {order.createdAt 
                  ? format(new Date(order.createdAt.seconds * 1000), 'dd MMMM yyyy, HH:mm') 
                  : ui.na}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{ui.lastUpdated}</p>
              <p className="font-medium">
                {order.updatedAt 
                  ? format(new Date(order.updatedAt.seconds * 1000), 'dd MMMM yyyy, HH:mm') 
                  : ui.na}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{ui.serviceType}</p>
              <p className="font-medium capitalize">{order.serviceType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{ui.amount}</p>
              <p className="font-medium text-lg">
                {order.priceAmount 
                  ? `CHF ${(order.priceAmount / 100).toFixed(2)}` 
                  : ui.quotePending}
              </p>
            </div>
          </div>

          {order.intakeData?.additionalInfo && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">{ui.additionalInfo}</p>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{order.intakeData.additionalInfo}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{ui.needHelp}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" asChild>
            <Link href="/contact">{ui.contactSupport}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/individual/tax-services">{ui.browseMoreServices}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
