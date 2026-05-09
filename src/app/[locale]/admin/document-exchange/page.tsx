'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Send, FileText, Download, Search, Upload,
  Building2, Briefcase, ArrowLeftRight, Clock, CheckCircle2,
  Loader2, X, User, FileUp, Eye, Bell, Users
} from "lucide-react";
import { firestore, storage } from '@/firebase/config';
import {
  collection, addDoc, serverTimestamp, onSnapshot,
  query, orderBy, getDocs, where, doc, updateDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useLocale } from 'next-intl';

// ─── Types ───────────────────────────────────────────────────────────────────

type ExchangeType = 'document_sent' | 'document_request' | 'document_review';
type ExchangeStatus = 'pending' | 'fulfilled' | 'acknowledged' | 'pending_review' | 'approved' | 'rejected';
type RecipientRole = 'individual' | 'business' | 'accounting_firm';

type Exchange = {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: RecipientRole;
  subject: string;
  message: string;
  type: ExchangeType;
  status: ExchangeStatus;
  fileUrl?: string;
  fileName?: string;
  userFileUrl?: string;
  userFileName?: string;
  documentContent?: string;
  documentTitle?: string;
  templateId?: string;
  createdAt: { seconds: number; nanoseconds: number };
};

type UserForSelection = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  company?: string;
};

// ─── Locale ──────────────────────────────────────────────────────────────────

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const n = locale.toLowerCase().split('-')[0];
  if (n === 'fr' || n === 'de' || n === 'it' || n === 'es') return n;
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, {
  pageTitle: string; pageSubtitle: string;
  sendTab: string; requestTab: string; allTab: string;
  recipientType: string; individual: string; business: string; firm: string;
  selectRecipient: string; changeRecipient: string;
  subject: string; subjectPlaceholder: string;
  message: string; messagePlaceholder: string;
  attachFile: string; changeFile: string; removeFile: string;
  sendDocument: string; sendRequest: string;
  requestDesc: string; requestDescPlaceholder: string;
  searchUsers: string; noUsersFound: string; loadingUsers: string;
  sending: string;
  col_type: string; col_recipient: string; col_subject: string; col_date: string; col_status: string; col_actions: string;
  typeSent: string; typeRequest: string;
  statusPending: string; statusFulfilled: string; statusAcknowledged: string;
  viewDetails: string; markAcknowledged: string; download: string;
  noExchanges: string; filterAll: string; filterSent: string; filterRequests: string;
  errorTitle: string; successTitle: string;
  recipientRequired: string; subjectRequired: string; fileRequired: string;
  sentSuccess: string; requestSuccess: string; sendFailed: string;
  detailsTitle: string; detailsFrom: string; detailsTo: string; detailsType: string; detailsDate: string; detailsMsg: string;
  adminFile: string; userResponse: string; noResponse: string;
  acknowledgedSuccess: string; close: string;
  typeReview: string; statusPendingReview: string; statusApproved: string; statusRejected: string;
  approveDoc: string; rejectDoc: string; filterReviews: string; viewDocContent: string;
}> = {
  en: {
    pageTitle: 'Document Exchange',
    pageSubtitle: 'Send documents and request documents from individuals, businesses, and accounting firms.',
    sendTab: 'Send Document', requestTab: 'Request Document', allTab: 'All Exchanges',
    recipientType: 'Recipient Type', individual: 'Individual', business: 'Business', firm: 'Accounting Firm',
    selectRecipient: 'Select Recipient', changeRecipient: 'Change',
    subject: 'Subject', subjectPlaceholder: 'e.g. Your tax documents for 2024',
    message: 'Message / Note', messagePlaceholder: 'Add a message or note for the recipient...',
    attachFile: 'Attach File', changeFile: 'Change File', removeFile: 'Remove',
    sendDocument: 'Send Document', sendRequest: 'Send Request',
    requestDesc: 'Request Description', requestDescPlaceholder: 'Describe the documents you need from the recipient...',
    searchUsers: 'Search by name or email...', noUsersFound: 'No users found.', loadingUsers: 'Loading users...',
    sending: 'Sending...',
    col_type: 'Type', col_recipient: 'Recipient', col_subject: 'Subject', col_date: 'Date', col_status: 'Status', col_actions: 'Actions',
    typeSent: 'Doc Sent', typeRequest: 'Doc Request',
    statusPending: 'Pending', statusFulfilled: 'Fulfilled', statusAcknowledged: 'Acknowledged',
    viewDetails: 'View Details', markAcknowledged: 'Mark Acknowledged', download: 'Download',
    noExchanges: 'No exchanges yet.',
    filterAll: 'All', filterSent: 'Sent', filterRequests: 'Requests',
    errorTitle: 'Error', successTitle: 'Success',
    recipientRequired: 'Please select a recipient.', subjectRequired: 'Please enter a subject.', fileRequired: 'Please attach a file to send.',
    sentSuccess: 'Document sent successfully.', requestSuccess: 'Request sent successfully.', sendFailed: 'Could not send. Please try again.',
    detailsTitle: 'Exchange Details', detailsFrom: 'From', detailsTo: 'To', detailsType: 'Type', detailsDate: 'Date', detailsMsg: 'Message',
    adminFile: 'Attached Document', userResponse: 'User Response', noResponse: 'No response yet.',
    acknowledgedSuccess: 'Marked as acknowledged.', close: 'Close',
    typeReview: 'Doc Review', statusPendingReview: 'Pending Review', statusApproved: 'Approved', statusRejected: 'Rejected',
    approveDoc: 'Approve', rejectDoc: 'Reject', filterReviews: 'Reviews', viewDocContent: 'Document Content',
  },
  fr: {
    pageTitle: 'Echange de documents',
    pageSubtitle: 'Envoyez et demandez des documents aux particuliers, entreprises et cabinets comptables.',
    sendTab: 'Envoyer un document', requestTab: 'Demander un document', allTab: 'Tous les echanges',
    recipientType: 'Type de destinataire', individual: 'Particulier', business: 'Entreprise', firm: 'Cabinet comptable',
    selectRecipient: 'Selectionner un destinataire', changeRecipient: 'Modifier',
    subject: 'Sujet', subjectPlaceholder: 'ex. Vos documents fiscaux 2024',
    message: 'Message / Note', messagePlaceholder: 'Ajoutez un message pour le destinataire...',
    attachFile: 'Joindre un fichier', changeFile: 'Changer', removeFile: 'Supprimer',
    sendDocument: 'Envoyer le document', sendRequest: 'Envoyer la demande',
    requestDesc: 'Description de la demande', requestDescPlaceholder: 'Decrivez les documents necessaires...',
    searchUsers: 'Rechercher par nom ou email...', noUsersFound: 'Aucun utilisateur trouve.', loadingUsers: 'Chargement...',
    sending: 'Envoi en cours...',
    col_type: 'Type', col_recipient: 'Destinataire', col_subject: 'Sujet', col_date: 'Date', col_status: 'Statut', col_actions: 'Actions',
    typeSent: 'Doc envoye', typeRequest: 'Demande doc',
    statusPending: 'En attente', statusFulfilled: 'Traite', statusAcknowledged: 'Accuse',
    viewDetails: 'Voir details', markAcknowledged: 'Marquer accuse', download: 'Telecharger',
    noExchanges: 'Aucun echange pour le moment.',
    filterAll: 'Tous', filterSent: 'Envoyes', filterRequests: 'Demandes',
    errorTitle: 'Erreur', successTitle: 'Succes',
    recipientRequired: 'Veuillez selectionner un destinataire.', subjectRequired: 'Veuillez saisir un sujet.', fileRequired: 'Veuillez joindre un fichier.',
    sentSuccess: 'Document envoye avec succes.', requestSuccess: 'Demande envoyee avec succes.', sendFailed: 'Echec de l envoi.',
    detailsTitle: 'Details de l echange', detailsFrom: 'De', detailsTo: 'A', detailsType: 'Type', detailsDate: 'Date', detailsMsg: 'Message',
    adminFile: 'Document joint', userResponse: 'Reponse utilisateur', noResponse: 'Aucune reponse.',
    acknowledgedSuccess: 'Marque comme accuse.', close: 'Fermer',
    typeReview: 'Revue doc', statusPendingReview: 'En attente de revue', statusApproved: 'Approuve', statusRejected: 'Rejete',
    approveDoc: 'Approuver', rejectDoc: 'Rejeter', filterReviews: 'Revues', viewDocContent: 'Contenu du document',
  },
  de: {
    pageTitle: 'Dokumentenaustausch',
    pageSubtitle: 'Senden und fordern Sie Dokumente von Einzelpersonen, Unternehmen und Buchhaltern an.',
    sendTab: 'Dokument senden', requestTab: 'Dokument anfordern', allTab: 'Alle Austausche',
    recipientType: 'Empfaengertyp', individual: 'Einzelperson', business: 'Unternehmen', firm: 'Buchhalter',
    selectRecipient: 'Empfaenger auswaehlen', changeRecipient: 'Aendern',
    subject: 'Betreff', subjectPlaceholder: 'z.B. Ihre Steuerdokumente 2024',
    message: 'Nachricht / Hinweis', messagePlaceholder: 'Nachricht an den Empfaenger...',
    attachFile: 'Datei anhaengen', changeFile: 'Datei aendern', removeFile: 'Entfernen',
    sendDocument: 'Dokument senden', sendRequest: 'Anfrage senden',
    requestDesc: 'Anfragebeschreibung', requestDescPlaceholder: 'Benoetgte Dokumente beschreiben...',
    searchUsers: 'Nach Name oder E-Mail suchen...', noUsersFound: 'Keine Benutzer gefunden.', loadingUsers: 'Wird geladen...',
    sending: 'Wird gesendet...',
    col_type: 'Typ', col_recipient: 'Empfaenger', col_subject: 'Betreff', col_date: 'Datum', col_status: 'Status', col_actions: 'Aktionen',
    typeSent: 'Dok. gesendet', typeRequest: 'Dok. angefordert',
    statusPending: 'Ausstehend', statusFulfilled: 'Erfuellt', statusAcknowledged: 'Bestaetigt',
    viewDetails: 'Details', markAcknowledged: 'Als bestaetigt markieren', download: 'Herunterladen',
    noExchanges: 'Noch keine Austausche.',
    filterAll: 'Alle', filterSent: 'Gesendet', filterRequests: 'Anfragen',
    errorTitle: 'Fehler', successTitle: 'Erfolg',
    recipientRequired: 'Bitte Empfaenger auswaehlen.', subjectRequired: 'Bitte Betreff eingeben.', fileRequired: 'Bitte Datei anhaengen.',
    sentSuccess: 'Dokument erfolgreich gesendet.', requestSuccess: 'Anfrage erfolgreich gesendet.', sendFailed: 'Senden fehlgeschlagen.',
    detailsTitle: 'Austauschdetails', detailsFrom: 'Von', detailsTo: 'An', detailsType: 'Typ', detailsDate: 'Datum', detailsMsg: 'Nachricht',
    adminFile: 'Angehaengte Datei', userResponse: 'Benutzerantwort', noResponse: 'Noch keine Antwort.',
    acknowledgedSuccess: 'Als bestaetigt markiert.', close: 'Schliessen',
    typeReview: 'Dok. Pruefung', statusPendingReview: 'Pruefung ausstehend', statusApproved: 'Freigegeben', statusRejected: 'Abgelehnt',
    approveDoc: 'Freigeben', rejectDoc: 'Ablehnen', filterReviews: 'Pruefungen', viewDocContent: 'Dokumentinhalt',
  },
  it: {
    pageTitle: 'Scambio di documenti',
    pageSubtitle: 'Invia e richiedi documenti da individui, aziende e studi contabili.',
    sendTab: 'Invia documento', requestTab: 'Richiedi documento', allTab: 'Tutti gli scambi',
    recipientType: 'Tipo destinatario', individual: 'Individuale', business: 'Azienda', firm: 'Studio contabile',
    selectRecipient: 'Seleziona destinatario', changeRecipient: 'Cambia',
    subject: 'Oggetto', subjectPlaceholder: 'es. I tuoi documenti fiscali 2024',
    message: 'Messaggio / Nota', messagePlaceholder: 'Aggiungi un messaggio per il destinatario...',
    attachFile: 'Allega file', changeFile: 'Cambia file', removeFile: 'Rimuovi',
    sendDocument: 'Invia documento', sendRequest: 'Invia richiesta',
    requestDesc: 'Descrizione richiesta', requestDescPlaceholder: 'Descrivi i documenti necessari...',
    searchUsers: 'Cerca per nome o email...', noUsersFound: 'Nessun utente trovato.', loadingUsers: 'Caricamento...',
    sending: 'Invio in corso...',
    col_type: 'Tipo', col_recipient: 'Destinatario', col_subject: 'Oggetto', col_date: 'Data', col_status: 'Stato', col_actions: 'Azioni',
    typeSent: 'Doc inviato', typeRequest: 'Richiesta doc',
    statusPending: 'In attesa', statusFulfilled: 'Evaso', statusAcknowledged: 'Confermato',
    viewDetails: 'Vedi dettagli', markAcknowledged: 'Segna confermato', download: 'Scarica',
    noExchanges: 'Nessuno scambio ancora.',
    filterAll: 'Tutti', filterSent: 'Inviati', filterRequests: 'Richieste',
    errorTitle: 'Errore', successTitle: 'Successo',
    recipientRequired: 'Seleziona un destinatario.', subjectRequired: 'Inserisci un oggetto.', fileRequired: 'Allega un file.',
    sentSuccess: 'Documento inviato con successo.', requestSuccess: 'Richiesta inviata.', sendFailed: 'Invio fallito.',
    detailsTitle: 'Dettagli scambio', detailsFrom: 'Da', detailsTo: 'A', detailsType: 'Tipo', detailsDate: 'Data', detailsMsg: 'Messaggio',
    adminFile: 'Documento allegato', userResponse: 'Risposta utente', noResponse: 'Nessuna risposta.',
    acknowledgedSuccess: 'Confermato.', close: 'Chiudi',
    typeReview: 'Revisione doc', statusPendingReview: 'In attesa di revisione', statusApproved: 'Approvato', statusRejected: 'Rifiutato',
    approveDoc: 'Approva', rejectDoc: 'Rifiuta', filterReviews: 'Revisioni', viewDocContent: 'Contenuto documento',
  },
  es: {
    pageTitle: 'Intercambio de documentos',
    pageSubtitle: 'Envia y solicita documentos a individuos, empresas y firmas contables.',
    sendTab: 'Enviar documento', requestTab: 'Solicitar documento', allTab: 'Todos los intercambios',
    recipientType: 'Tipo de destinatario', individual: 'Individual', business: 'Empresa', firm: 'Firma contable',
    selectRecipient: 'Seleccionar destinatario', changeRecipient: 'Cambiar',
    subject: 'Asunto', subjectPlaceholder: 'ej. Tus documentos fiscales 2024',
    message: 'Mensaje / Nota', messagePlaceholder: 'Agrega un mensaje para el destinatario...',
    attachFile: 'Adjuntar archivo', changeFile: 'Cambiar archivo', removeFile: 'Eliminar',
    sendDocument: 'Enviar documento', sendRequest: 'Enviar solicitud',
    requestDesc: 'Descripcion de la solicitud', requestDescPlaceholder: 'Describe los documentos necesarios...',
    searchUsers: 'Buscar por nombre o email...', noUsersFound: 'No se encontraron usuarios.', loadingUsers: 'Cargando...',
    sending: 'Enviando...',
    col_type: 'Tipo', col_recipient: 'Destinatario', col_subject: 'Asunto', col_date: 'Fecha', col_status: 'Estado', col_actions: 'Acciones',
    typeSent: 'Doc enviado', typeRequest: 'Solicitud doc',
    statusPending: 'Pendiente', statusFulfilled: 'Completado', statusAcknowledged: 'Reconocido',
    viewDetails: 'Ver detalles', markAcknowledged: 'Marcar reconocido', download: 'Descargar',
    noExchanges: 'Sin intercambios aun.',
    filterAll: 'Todos', filterSent: 'Enviados', filterRequests: 'Solicitudes',
    errorTitle: 'Error', successTitle: 'Exito',
    recipientRequired: 'Selecciona un destinatario.', subjectRequired: 'Ingresa un asunto.', fileRequired: 'Adjunta un archivo.',
    sentSuccess: 'Documento enviado correctamente.', requestSuccess: 'Solicitud enviada.', sendFailed: 'Error al enviar.',
    detailsTitle: 'Detalles del intercambio', detailsFrom: 'De', detailsTo: 'Para', detailsType: 'Tipo', detailsDate: 'Fecha', detailsMsg: 'Mensaje',
    adminFile: 'Documento adjunto', userResponse: 'Respuesta del usuario', noResponse: 'Sin respuesta aun.',
    acknowledgedSuccess: 'Marcado como reconocido.', close: 'Cerrar',
    typeReview: 'Revision doc', statusPendingReview: 'Pendiente de revision', statusApproved: 'Aprobado', statusRejected: 'Rechazado',
    approveDoc: 'Aprobar', rejectDoc: 'Rechazar', filterReviews: 'Revisiones', viewDocContent: 'Contenido del documento',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInboxPath = (role: RecipientRole) => {
  if (role === 'individual') return '/individual/my-documents';
  if (role === 'business') return '/business/document-center';
  return '/accounting-firm/document-inbox';
};

const getStatusBadgeVariant = (status: ExchangeStatus): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (status === 'acknowledged' || status === 'approved') return 'default';
  if (status === 'fulfilled') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
};

const getTypeBadgeVariant = (type: ExchangeType): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (type === 'document_review') return 'outline';
  return type === 'document_sent' ? 'default' : 'secondary';
};

// ─── UserSelectDialog ─────────────────────────────────────────────────────────

function UserSelectDialog({
  open,
  onClose,
  onSelect,
  recipientRole,
  ui,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (user: UserForSelection) => void;
  recipientRole: RecipientRole;
  ui: typeof UI_BY_LOCALE.en;
}) {
  const [users, setUsers] = useState<UserForSelection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    setSearch('');

    const q = query(collection(firestore, 'users'), where('role', '==', recipientRole));
    getDocs(q).then((snapshot) => {
      const fetched: UserForSelection[] = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name || d.data().displayName || 'Unknown',
        email: d.data().email || '',
        role: d.data().role,
        avatar: d.data().avatar || d.data().photoURL || null,
        company: d.data().company || d.data().companyName || '',
      }));
      setUsers(fetched);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [open, recipientRole]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{ui.selectRecipient}</DialogTitle>
          <DialogDescription>
            {recipientRole === 'individual' ? ui.individual : recipientRole === 'business' ? ui.business : ui.firm}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={ui.searchUsers}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-64 rounded-md border">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
              {ui.noUsersFound}
            </div>
          )}
          {!isLoading && filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => { onSelect(u); onClose(); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left border-b last:border-0"
            >
              <Avatar className="h-9 w-9 shrink-0">
                {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                <AvatarFallback>{u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                {u.company && <p className="text-xs text-muted-foreground truncate">{u.company}</p>}
              </div>
            </button>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── ExchangeDetailsDialog ────────────────────────────────────────────────────

function ExchangeDetailsDialog({
  exchange,
  open,
  onClose,
  onAcknowledge,
  onApprove,
  onReject,
  ui,
}: {
  exchange: Exchange | null;
  open: boolean;
  onClose: () => void;
  onAcknowledge: (id: string) => Promise<void>;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  ui: typeof UI_BY_LOCALE.en;
}) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!exchange) return null;

  const handleAck = async () => {
    setIsAcknowledging(true);
    await onAcknowledge(exchange.id);
    setIsAcknowledging(false);
    onClose();
  };

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove(exchange.id);
    setIsApproving(false);
    onClose();
  };

  const handleReject = async () => {
    setIsRejecting(true);
    await onReject(exchange.id);
    setIsRejecting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{ui.detailsTitle}</DialogTitle>
          <DialogDescription>{exchange.subject}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{ui.col_type}</p>
              <Badge variant={getTypeBadgeVariant(exchange.type)} className="mt-1">
                {exchange.type === 'document_sent' ? ui.typeSent : exchange.type === 'document_review' ? ui.typeReview : ui.typeRequest}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{ui.col_status}</p>
              <Badge variant={getStatusBadgeVariant(exchange.status)} className="mt-1 capitalize">
                {exchange.status === 'pending' ? ui.statusPending
                : exchange.status === 'pending_review' ? ui.statusPendingReview
                : exchange.status === 'fulfilled' ? ui.statusFulfilled
                : exchange.status === 'approved' ? ui.statusApproved
                : exchange.status === 'rejected' ? ui.statusRejected
                : ui.statusAcknowledged}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{ui.detailsFrom}</p>
              <p className="font-medium">{exchange.senderName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{ui.detailsTo}</p>
              <p className="font-medium">{exchange.recipientName}</p>
              <p className="text-xs text-muted-foreground">{exchange.recipientEmail}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">{ui.detailsDate}</p>
              <p>{exchange.createdAt ? format(new Date(exchange.createdAt.seconds * 1000), 'dd MMM yyyy, HH:mm') : '--'}</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1">{ui.detailsMsg}</p>
            <div className="bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{exchange.message}</div>
          </div>
          {exchange.type === 'document_sent' && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{ui.adminFile}</p>
              {exchange.fileUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={exchange.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {exchange.fileName || ui.download}
                  </a>
                </Button>
              ) : <p className="text-muted-foreground text-xs">--</p>}
            </div>
          )}
          {exchange.type === 'document_review' && exchange.documentContent && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{ui.viewDocContent}</p>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {exchange.documentContent}
                </div>
              </ScrollArea>
            </div>
          )}
          {exchange.type === 'document_request' && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{ui.userResponse}</p>
              {exchange.userFileUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={exchange.userFileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    {exchange.userFileName || ui.download}
                  </a>
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs">{ui.noResponse}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{ui.close}</Button>
          {exchange.status === 'fulfilled' && (
            <Button onClick={handleAck} disabled={isAcknowledging}>
              {isAcknowledging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {ui.markAcknowledged}
            </Button>
          )}
          {exchange.type === 'document_review' && exchange.status === 'pending_review' && (
            <>
              <Button variant="destructive" onClick={handleReject} disabled={isRejecting || isApproving}>
                {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {ui.rejectDoc}
              </Button>
              <Button onClick={handleApprove} disabled={isApproving || isRejecting}>
                {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {ui.approveDoc}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ComposeForm (shared by Send & Request tabs) ──────────────────────────────

function ComposeForm({
  mode,
  ui,
  adminUser,
  toast,
}: {
  mode: 'send' | 'request';
  ui: typeof UI_BY_LOCALE.en;
  adminUser: { uid: string; displayName?: string | null; email?: string | null } | null;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [recipientRole, setRecipientRole] = useState<RecipientRole>('individual');
  const [selectedUser, setSelectedUser] = useState<UserForSelection | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleIcons: Record<RecipientRole, React.ReactNode> = {
    individual: <User className="h-4 w-4" />,
    business: <Building2 className="h-4 w-4" />,
    accounting_firm: <Briefcase className="h-4 w-4" />,
  };

  const handleRoleChange = (role: RecipientRole) => {
    setRecipientRole(role);
    setSelectedUser(null);
  };

  const sendNotification = async (recipientId: string, exchangeId: string) => {
    const notifTitle = mode === 'send'
      ? 'Document received from Admin'
      : 'Document requested by Admin';
    const link = getInboxPath(recipientRole);

    await addDoc(collection(firestore, 'users', recipientId, 'notifications'), {
      title: notifTitle,
      description: subject,
      type: 'document',
      read: false,
      link,
      exchangeId,
      createdAt: serverTimestamp(),
    });
  };

  const handleSend = async () => {
    if (!selectedUser) { toast({ title: ui.errorTitle, description: ui.recipientRequired, variant: 'destructive' }); return; }
    if (!subject.trim()) { toast({ title: ui.errorTitle, description: ui.subjectRequired, variant: 'destructive' }); return; }
    if (mode === 'send' && !selectedFile) { toast({ title: ui.errorTitle, description: ui.fileRequired, variant: 'destructive' }); return; }

    setIsSending(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      if (mode === 'send' && selectedFile) {
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const storageRef = ref(storage, `document-exchanges/${fileId}/${selectedFile.name}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        fileUrl = await getDownloadURL(snapshot.ref);
        fileName = selectedFile.name;
      }

      const exchangeData: Record<string, unknown> = {
        senderId: adminUser?.uid ?? 'admin',
        senderName: adminUser?.displayName || adminUser?.email || 'Admin',
        recipientId: selectedUser.id,
        recipientName: selectedUser.name,
        recipientEmail: selectedUser.email,
        recipientRole,
        subject: subject.trim(),
        message: message.trim(),
        type: mode === 'send' ? 'document_sent' : 'document_request',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (fileUrl) exchangeData.fileUrl = fileUrl;
      if (fileName) exchangeData.fileName = fileName;

      const exchangeRef = await addDoc(collection(firestore, 'document_exchanges'), exchangeData);

      // Send notification to recipient
      await sendNotification(selectedUser.id, exchangeRef.id);

      toast({ title: ui.successTitle, description: mode === 'send' ? ui.sentSuccess : ui.requestSuccess });

      // Reset form
      setSelectedUser(null);
      setSubject('');
      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error sending exchange:', err);
      toast({ title: ui.errorTitle, description: ui.sendFailed, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recipient Role */}
      <div className="space-y-2">
        <Label>{ui.recipientType}</Label>
        <div className="flex gap-2 flex-wrap">
          {(['individual', 'business', 'accounting_firm'] as RecipientRole[]).map((role) => (
            <Button
              key={role}
              variant={recipientRole === role ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRoleChange(role)}
              className="gap-2"
            >
              {roleIcons[role]}
              {role === 'individual' ? ui.individual : role === 'business' ? ui.business : ui.firm}
            </Button>
          ))}
        </div>
      </div>

      {/* Select Recipient */}
      <div className="space-y-2">
        <Label>{ui.selectRecipient}</Label>
        {selectedUser ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <Avatar className="h-9 w-9 shrink-0">
              {selectedUser.avatar && <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />}
              <AvatarFallback>{selectedUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{selectedUser.name}</p>
              <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsUserDialogOpen(true)} className="gap-2 w-full justify-start">
            <Users className="h-4 w-4" />
            {ui.selectRecipient}
          </Button>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor={`subject-${mode}`}>{ui.subject}</Label>
        <Input
          id={`subject-${mode}`}
          placeholder={ui.subjectPlaceholder}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor={`msg-${mode}`}>{mode === 'send' ? ui.message : ui.requestDesc}</Label>
        <Textarea
          id={`msg-${mode}`}
          placeholder={mode === 'send' ? ui.messagePlaceholder : ui.requestDescPlaceholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
      </div>

      {/* File Attach (Send mode only) */}
      {mode === 'send' && (
        <div className="space-y-2">
          <Label>{ui.attachFile}</Label>
          {selectedFile ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{ui.attachFile}</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <Button onClick={handleSend} disabled={isSending} className="w-full gap-2">
        {isSending ? (
          <><Loader2 className="h-4 w-4 animate-spin" />{ui.sending}</>
        ) : mode === 'send' ? (
          <><Send className="h-4 w-4" />{ui.sendDocument}</>
        ) : (
          <><Bell className="h-4 w-4" />{ui.sendRequest}</>
        )}
      </Button>

      <UserSelectDialog
        open={isUserDialogOpen}
        onClose={() => setIsUserDialogOpen(false)}
        onSelect={(u) => setSelectedUser(u)}
        recipientRole={recipientRole}
        ui={ui}
      />
    </div>
  );
}

// ─── AllExchangesTab ──────────────────────────────────────────────────────────

function AllExchangesTab({ ui }: { ui: typeof UI_BY_LOCALE.en }) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | ExchangeType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ExchangeStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(firestore, 'document_exchanges'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setExchanges(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exchange)));
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      await updateDoc(doc(firestore, 'document_exchanges', id), {
        status: 'acknowledged',
        updatedAt: serverTimestamp(),
      });
      toast({ title: ui.successTitle, description: ui.acknowledgedSuccess });
    } catch {
      toast({ title: ui.errorTitle, description: ui.sendFailed, variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(firestore, 'document_exchanges', id), {
        status: 'approved',
        updatedAt: serverTimestamp(),
      });
      toast({ title: ui.successTitle, description: ui.statusApproved });
    } catch {
      toast({ title: ui.errorTitle, description: ui.sendFailed, variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(firestore, 'document_exchanges', id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      toast({ title: ui.successTitle, description: ui.statusRejected });
    } catch {
      toast({ title: ui.errorTitle, description: ui.sendFailed, variant: 'destructive' });
    }
  };

  const filtered = exchanges
    .filter((e) => typeFilter === 'all' || e.type === typeFilter)
    .filter((e) => statusFilter === 'all' || e.status === statusFilter)
    .filter((e) =>
      !search ||
      e.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
      e.subject?.toLowerCase().includes(search.toLowerCase()) ||
      e.recipientEmail?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={ui.searchUsers} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['all', 'document_sent', 'document_request', 'document_review'] as const).map((f) => (
            <Button key={f} variant={typeFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setTypeFilter(f)}>
              {f === 'all' ? ui.filterAll : f === 'document_sent' ? ui.filterSent : f === 'document_review' ? ui.filterReviews : ui.filterRequests}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'pending', 'pending_review', 'fulfilled', 'acknowledged', 'approved', 'rejected'] as const).map((s) => (
            <Button key={s} variant={statusFilter === s ? 'secondary' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
              {s === 'all' ? ui.filterAll
                : s === 'pending' ? ui.statusPending
                : s === 'pending_review' ? ui.statusPendingReview
                : s === 'fulfilled' ? ui.statusFulfilled
                : s === 'approved' ? ui.statusApproved
                : s === 'rejected' ? ui.statusRejected
                : ui.statusAcknowledged}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ui.col_type}</TableHead>
              <TableHead>{ui.col_recipient}</TableHead>
              <TableHead className="hidden md:table-cell">{ui.col_subject}</TableHead>
              <TableHead className="hidden lg:table-cell">{ui.col_date}</TableHead>
              <TableHead>{ui.col_status}</TableHead>
              <TableHead className="text-right">{ui.col_actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  {ui.noExchanges}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.map((ex) => (
              <TableRow key={ex.id}>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(ex.type)} className="whitespace-nowrap">
                    {ex.type === 'document_sent' ? ui.typeSent : ex.type === 'document_review' ? ui.typeReview : ui.typeRequest}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{ex.recipientName}</p>
                    <p className="text-xs text-muted-foreground">{ex.recipientEmail}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-[200px] truncate text-sm">
                  {ex.subject}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm whitespace-nowrap">
                  {ex.createdAt ? formatDistanceToNow(new Date(ex.createdAt.seconds * 1000), { addSuffix: true }) : '--'}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(ex.status)}>
                    {ex.status === 'pending' ? ui.statusPending
                      : ex.status === 'pending_review' ? ui.statusPendingReview
                      : ex.status === 'fulfilled' ? ui.statusFulfilled
                      : ex.status === 'approved' ? ui.statusApproved
                      : ex.status === 'rejected' ? ui.statusRejected
                      : ui.statusAcknowledged}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedExchange(ex); setDetailsOpen(true); }}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    {ui.viewDetails}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ExchangeDetailsDialog
        exchange={selectedExchange}
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelectedExchange(null); }}
        onAcknowledge={handleAcknowledge}
        onApprove={handleApprove}
        onReject={handleReject}
        ui={ui}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDocumentExchangePage() {
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];
  const { user } = useFirebase();
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
        <p className="text-muted-foreground">{ui.pageSubtitle}</p>
      </div>

      <Tabs defaultValue="send">
        <TabsList className="mb-4">
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            {ui.sendTab}
          </TabsTrigger>
          <TabsTrigger value="request" className="gap-2">
            <FileUp className="h-4 w-4" />
            {ui.requestTab}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            {ui.allTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {ui.sendTab}
              </CardTitle>
              <CardDescription>{ui.pageSubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <ComposeForm mode="send" ui={ui} adminUser={user} toast={toast} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="request">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                {ui.requestTab}
              </CardTitle>
              <CardDescription>{ui.pageSubtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <ComposeForm mode="request" ui={ui} adminUser={user} toast={toast} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                {ui.allTab}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AllExchangesTab ui={ui} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
