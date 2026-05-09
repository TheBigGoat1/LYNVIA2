'use client';

import { useState, useEffect, useRef } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search, CheckCircle, XCircle, FileText, Loader2, View, FileDown, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { collectionGroup, query, onSnapshot, doc, updateDoc, collection, addDoc, serverTimestamp, where, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocale } from 'next-intl';
import { convertHtmlToDocx } from '@/ai/flows/document-converter-flow';

const logSystemEvent = async (level: "INFO" | "WARN" | "ERROR" | "SECURITY", service: string, message: string, details: object = {}) => {
  try {
    await addDoc(collection(firestore, 'system_logs'), {
      timestamp: serverTimestamp(),
      level,
      service,
      message,
      ipAddress: '127.0.0.1', // Placeholder
      details,
    });
  } catch (error) {
    console.error("Failed to log system event:", error);
  }
};


type DocumentForApproval = {
  id: string;
  path: string;
  userId: string;
  name: string;
  userName: string;
  userAvatar?: string | null;
  companyName: string;
  companyId?: string;
  templateType: string;
  createdAt: { seconds: number; nanoseconds: number };
  status: "Pending Review" | "Approved" | "Rejected" | "Draft";
  content?: string;
  finalFileUrl?: string;
  finalFileName?: string;
};

type DocumentStatus = DocumentForApproval['status'];

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
  sectionTitle: string;
  sectionSubtitle: string;
  searchPlaceholder: string;
  pending: string;
  approved: string;
  rejected: string;
  all: string;
  documentName: string;
  submittedBy: string;
  company: string;
  dateSubmitted: string;
  status: string;
  actions: string;
  openMenu: string;
  reviewActions: string;
  viewDocument: string;
  download: string;
  pdfDocument: string;
  wordDocument: string;
  approve: string;
  reject: string;
  close: string;
  submittedByOn: string;
  noContentFound: string;
  authErrorTitle: string;
  authErrorDescription: string;
  updateFailed: string;
  updateFailedDescription: string;
  errorTitle: string;
  documentNotFound: string;
  fetchContentFailed: string;
  preparingPdf: string;
  preparingWord: string;
  contentNotFound: string;
  downloadFailed: string;
  downloadFailedDescription: string;
  uploadFinal: string;
  notifStatusUpdated: string;
  notifStatusUpdatedDesc: string;
  notifDocReady: string;
  notifDocReadyDesc: string;
  uploadSuccess: string;
  uploadSuccessDesc: string;
  uploadFailed: string;
  uploadFailedDesc: string;
  uploadDialogTitle: string;
  uploadDialogDescription: string;
  uploadDialogChooseFile: string;
  uploadDialogCancel: string;
  uploadDialogUploading: string;
  uploadDialogUploadApprove: string;
}> = {
  en: {
    pageTitle: 'Document Approvals', pageSubtitle: 'Review and manage user-generated documents that require admin approval.',
    sectionTitle: 'Approval Queue', sectionSubtitle: 'Documents waiting for review are listed below.',
    searchPlaceholder: 'Search documents...', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', all: 'All',
    documentName: 'Document Name', submittedBy: 'Submitted By', company: 'Company', dateSubmitted: 'Date Submitted', status: 'Status', actions: 'Actions',
    openMenu: 'Open menu', reviewActions: 'Review Actions', viewDocument: 'View Document', download: 'Download', pdfDocument: 'PDF Document', wordDocument: 'Word Document (.docx)',
    approve: 'Approve', reject: 'Reject', close: 'Close', submittedByOn: 'Submitted by', noContentFound: 'No content found.',
    authErrorTitle: 'Authentication Error', authErrorDescription: 'You must be logged in to perform this action.',
    updateFailed: 'Update Failed', updateFailedDescription: 'Could not update document status.',
    errorTitle: 'Error', documentNotFound: 'Document not found.', fetchContentFailed: 'Could not fetch document content.',
    preparingPdf: 'Preparing PDF...', preparingWord: 'Preparing Word document...', contentNotFound: 'Document content not found.',
    downloadFailed: 'Download Failed', downloadFailedDescription: 'Could not generate the Word document. Please try again.',
    uploadFinal: 'Upload Final Document',
    notifStatusUpdated: 'Document {status}',
    notifStatusUpdatedDesc: 'Your document "{name}" has been {status}.',
    notifDocReady: 'Your document is ready',
    notifDocReadyDesc: 'Your document "{name}" has been reviewed and the final version is ready to download.',
    uploadSuccess: 'Final document uploaded',
    uploadSuccessDesc: 'The client has been notified.',
    uploadFailed: 'Upload failed',
    uploadFailedDesc: 'Could not upload the document. Please try again.',
    uploadDialogTitle: 'Upload Final Document',
    uploadDialogDescription: 'Upload the reviewed final version for "{name}". The document will be marked as Approved and the client will be notified.',
    uploadDialogChooseFile: 'Click to choose a file (PDF or Word)',
    uploadDialogCancel: 'Cancel',
    uploadDialogUploading: 'Uploading\u2026',
    uploadDialogUploadApprove: 'Upload & Approve',
  },
  fr: {
    pageTitle: 'Approbations de documents', pageSubtitle: 'Examinez et gerez les documents utilisateurs necessitant une approbation admin.',
    sectionTitle: 'File d approbation', sectionSubtitle: 'Les documents en attente de revision sont listes ci-dessous.',
    searchPlaceholder: 'Rechercher des documents...', pending: 'En attente', approved: 'Approuves', rejected: 'Rejetes', all: 'Tous',
    documentName: 'Nom du document', submittedBy: 'Soumis par', company: 'Entreprise', dateSubmitted: 'Date de soumission', status: 'Statut', actions: 'Actions',
    openMenu: 'Ouvrir le menu', reviewActions: 'Actions de revision', viewDocument: 'Voir le document', download: 'Telecharger', pdfDocument: 'Document PDF', wordDocument: 'Document Word (.docx)',
    approve: 'Approuver', reject: 'Rejeter', close: 'Fermer', submittedByOn: 'Soumis par', noContentFound: 'Aucun contenu trouve.',
    authErrorTitle: 'Erreur d authentification', authErrorDescription: 'Vous devez etre connecte pour effectuer cette action.',
    updateFailed: 'Echec de mise a jour', updateFailedDescription: 'Impossible de mettre a jour le statut du document.',
    errorTitle: 'Erreur', documentNotFound: 'Document introuvable.', fetchContentFailed: 'Impossible de recuperer le contenu du document.',
    preparingPdf: 'Preparation du PDF...', preparingWord: 'Preparation du document Word...', contentNotFound: 'Contenu du document introuvable.',
    downloadFailed: 'Echec du telechargement', downloadFailedDescription: 'Impossible de generer le document Word. Veuillez reessayer.',
    uploadFinal: 'FR: Upload Final Document',
    notifStatusUpdated: 'FR: Document {status}',
    notifStatusUpdatedDesc: 'FR: Your document "{name}" has been {status}.',
    notifDocReady: 'FR: Your document is ready',
    notifDocReadyDesc: 'FR: Your document "{name}" has been reviewed and the final version is ready to download.',
    uploadSuccess: 'FR: Final document uploaded',
    uploadSuccessDesc: 'FR: The client has been notified.',
    uploadFailed: 'FR: Upload failed',
    uploadFailedDesc: 'FR: Could not upload the document. Please try again.',
    uploadDialogTitle: 'FR: Upload Final Document',
    uploadDialogDescription: 'FR: Upload the reviewed final version for "{name}". The document will be marked as Approved and the client will be notified.',
    uploadDialogChooseFile: 'FR: Click to choose a file (PDF or Word)',
    uploadDialogCancel: 'FR: Cancel',
    uploadDialogUploading: 'FR: Uploading\u2026',
    uploadDialogUploadApprove: 'FR: Upload & Approve',
  },
  de: { pageTitle: 'Dokumentfreigaben', pageSubtitle: 'Pruefen und verwalten Sie nutzergenerierte Dokumente mit Admin Freigabe.', sectionTitle: 'Freigabewarteschlange', sectionSubtitle: 'Dokumente zur Pruefung sind unten aufgefuehrt.', searchPlaceholder: 'Dokumente suchen...', pending: 'Ausstehend', approved: 'Freigegeben', rejected: 'Abgelehnt', all: 'Alle', documentName: 'Dokumentname', submittedBy: 'Eingereicht von', company: 'Unternehmen', dateSubmitted: 'Eingereicht am', status: 'Status', actions: 'Aktionen', openMenu: 'Menue oeffnen', reviewActions: 'Pruefaktionen', viewDocument: 'Dokument anzeigen', download: 'Herunterladen', pdfDocument: 'PDF Dokument', wordDocument: 'Word Dokument (.docx)', approve: 'Freigeben', reject: 'Ablehnen', close: 'Schliessen', submittedByOn: 'Eingereicht von', noContentFound: 'Kein Inhalt gefunden.', authErrorTitle: 'Authentifizierungsfehler', authErrorDescription: 'Sie muessen angemeldet sein, um diese Aktion auszufuehren.', updateFailed: 'Aktualisierung fehlgeschlagen', updateFailedDescription: 'Dokumentstatus konnte nicht aktualisiert werden.', errorTitle: 'Fehler', documentNotFound: 'Dokument nicht gefunden.', fetchContentFailed: 'Dokumentinhalt konnte nicht geladen werden.', preparingPdf: 'PDF wird vorbereitet...', preparingWord: 'Word Dokument wird vorbereitet...', contentNotFound: 'Dokumentinhalt nicht gefunden.', downloadFailed: 'Download fehlgeschlagen', downloadFailedDescription: 'Word Dokument konnte nicht erstellt werden. Bitte erneut versuchen.', uploadFinal: 'DE: Upload Final Document', notifStatusUpdated: 'DE: Document {status}', notifStatusUpdatedDesc: 'DE: Your document "{name}" has been {status}.', notifDocReady: 'DE: Your document is ready', notifDocReadyDesc: 'DE: Your document "{name}" has been reviewed and the final version is ready to download.', uploadSuccess: 'DE: Final document uploaded', uploadSuccessDesc: 'DE: The client has been notified.', uploadFailed: 'DE: Upload failed', uploadFailedDesc: 'DE: Could not upload the document. Please try again.', uploadDialogTitle: 'DE: Upload Final Document', uploadDialogDescription: 'DE: Upload the reviewed final version for "{name}". The document will be marked as Approved and the client will be notified.', uploadDialogChooseFile: 'DE: Click to choose a file (PDF or Word)', uploadDialogCancel: 'DE: Cancel', uploadDialogUploading: 'DE: Uploading\u2026', uploadDialogUploadApprove: 'DE: Upload & Approve' },
  it: { pageTitle: 'Approvazioni documenti', pageSubtitle: 'Rivedi e gestisci i documenti utente che richiedono approvazione admin.', sectionTitle: 'Coda approvazione', sectionSubtitle: 'I documenti in attesa di revisione sono elencati qui sotto.', searchPlaceholder: 'Cerca documenti...', pending: 'In attesa', approved: 'Approvati', rejected: 'Respinti', all: 'Tutti', documentName: 'Nome documento', submittedBy: 'Inviato da', company: 'Azienda', dateSubmitted: 'Data invio', status: 'Stato', actions: 'Azioni', openMenu: 'Apri menu', reviewActions: 'Azioni revisione', viewDocument: 'Visualizza documento', download: 'Scarica', pdfDocument: 'Documento PDF', wordDocument: 'Documento Word (.docx)', approve: 'Approva', reject: 'Rifiuta', close: 'Chiudi', submittedByOn: 'Inviato da', noContentFound: 'Nessun contenuto trovato.', authErrorTitle: 'Errore di autenticazione', authErrorDescription: 'Devi essere autenticato per eseguire questa azione.', updateFailed: 'Aggiornamento non riuscito', updateFailedDescription: 'Impossibile aggiornare lo stato del documento.', errorTitle: 'Errore', documentNotFound: 'Documento non trovato.', fetchContentFailed: 'Impossibile recuperare il contenuto del documento.', preparingPdf: 'Preparazione PDF...', preparingWord: 'Preparazione documento Word...', contentNotFound: 'Contenuto documento non trovato.', downloadFailed: 'Download non riuscito', downloadFailedDescription: 'Impossibile generare il documento Word. Riprova.', uploadFinal: 'IT: Upload Final Document', notifStatusUpdated: 'IT: Document {status}', notifStatusUpdatedDesc: 'IT: Your document "{name}" has been {status}.', notifDocReady: 'IT: Your document is ready', notifDocReadyDesc: 'IT: Your document "{name}" has been reviewed and the final version is ready to download.', uploadSuccess: 'IT: Final document uploaded', uploadSuccessDesc: 'IT: The client has been notified.', uploadFailed: 'IT: Upload failed', uploadFailedDesc: 'IT: Could not upload the document. Please try again.', uploadDialogTitle: 'IT: Upload Final Document', uploadDialogDescription: 'IT: Upload the reviewed final version for "{name}". The document will be marked as Approved and the client will be notified.', uploadDialogChooseFile: 'IT: Click to choose a file (PDF or Word)', uploadDialogCancel: 'IT: Cancel', uploadDialogUploading: 'IT: Uploading\u2026', uploadDialogUploadApprove: 'IT: Upload & Approve' },
  es: { pageTitle: 'Aprobaciones de documentos', pageSubtitle: 'Revisa y gestiona los documentos de usuarios que requieren aprobacion admin.', sectionTitle: 'Cola de aprobacion', sectionSubtitle: 'Los documentos pendientes de revision se muestran abajo.', searchPlaceholder: 'Buscar documentos...', pending: 'Pendientes', approved: 'Aprobados', rejected: 'Rechazados', all: 'Todas', documentName: 'Nombre del documento', submittedBy: 'Enviado por', company: 'Empresa', dateSubmitted: 'Fecha de envio', status: 'Estado', actions: 'Acciones', openMenu: 'Abrir menu', reviewActions: 'Acciones de revision', viewDocument: 'Ver documento', download: 'Descargar', pdfDocument: 'Documento PDF', wordDocument: 'Documento Word (.docx)', approve: 'Aprobar', reject: 'Rechazar', close: 'Cerrar', submittedByOn: 'Enviado por', noContentFound: 'No se encontro contenido.', authErrorTitle: 'Error de autenticacion', authErrorDescription: 'Debes iniciar sesion para realizar esta accion.', updateFailed: 'Actualizacion fallida', updateFailedDescription: 'No se pudo actualizar el estado del documento.', errorTitle: 'Error', documentNotFound: 'Documento no encontrado.', fetchContentFailed: 'No se pudo obtener el contenido del documento.', preparingPdf: 'Preparando PDF...', preparingWord: 'Preparando documento Word...', contentNotFound: 'Contenido del documento no encontrado.', downloadFailed: 'Descarga fallida', downloadFailedDescription: 'No se pudo generar el documento Word. Intentalo de nuevo.', uploadFinal: 'ES: Upload Final Document', notifStatusUpdated: 'ES: Document {status}', notifStatusUpdatedDesc: 'ES: Your document "{name}" has been {status}.', notifDocReady: 'ES: Your document is ready', notifDocReadyDesc: 'ES: Your document "{name}" has been reviewed and the final version is ready to download.', uploadSuccess: 'ES: Final document uploaded', uploadSuccessDesc: 'ES: The client has been notified.', uploadFailed: 'ES: Upload failed', uploadFailedDesc: 'ES: Could not upload the document. Please try again.', uploadDialogTitle: 'ES: Upload Final Document', uploadDialogDescription: 'ES: Upload the reviewed final version for "{name}". The document will be marked as Approved and the client will be notified.', uploadDialogChooseFile: 'ES: Click to choose a file (PDF or Word)', uploadDialogCancel: 'ES: Cancel', uploadDialogUploading: 'ES: Uploading\u2026', uploadDialogUploadApprove: 'ES: Upload & Approve' },
};

const getStatusBadgeVariant = (status: DocumentStatus) => {
  switch (status) {
    case "Approved":
      return "default";
    case "Pending Review":
      return "secondary";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const ApprovalTable = ({
  docs,
  onUpdateStatus,
  isLoading,
  onView,
  onDownloadPdf,
  onDownloadWord,
  onUploadFinal,
  ui,
}: {
  docs: DocumentForApproval[];
  onUpdateStatus: (doc: DocumentForApproval, status: "Approved" | "Rejected") => void;
  isLoading: boolean;
  onView: (doc: DocumentForApproval) => void;
  onDownloadPdf: (doc: DocumentForApproval) => void;
  onDownloadWord: (doc: DocumentForApproval) => void;
  onUploadFinal: (doc: DocumentForApproval) => void;
  ui: (typeof UI_BY_LOCALE)[SupportedLocale];
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{ui.documentName}</TableHead>
        <TableHead className="hidden md:table-cell">{ui.submittedBy}</TableHead>
        <TableHead>{ui.company}</TableHead>
        <TableHead className="hidden lg:table-cell">{ui.dateSubmitted}</TableHead>
        <TableHead>{ui.status}</TableHead>
        <TableHead className="text-right">{ui.actions}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-5 w-48" />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-28" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-8 w-8 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      {!isLoading &&
        docs.map((docItem) => (
          <TableRow key={docItem.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="font-medium">{docItem.name}</div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  {docItem.userAvatar && (
                    <AvatarImage src={docItem.userAvatar} alt={docItem.userName} />
                  )}
                  <AvatarFallback>
                    {docItem.userName.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span>{docItem.userName}</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{docItem.companyName}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">
              {formatDistanceToNow(new Date(docItem.createdAt.seconds * 1000), {
                addSuffix: true,
              })}
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(docItem.status)}>
                {docItem.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">{ui.openMenu}</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{ui.reviewActions}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onView(docItem)}>
                    <View className="mr-2 h-4 w-4" />
                    {ui.viewDocument}
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FileDown className="mr-2 h-4 w-4" />
                      {ui.download}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => onDownloadPdf(docItem)}>{ui.pdfDocument}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDownloadWord(docItem)}>{ui.wordDocument}</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={() => onUploadFinal(docItem)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {ui.uploadFinal}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {docItem.status === 'Pending Review' && (
                    <>
                      <DropdownMenuItem onClick={() => onUpdateStatus(docItem, 'Approved')}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        {ui.approve}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(docItem, 'Rejected')}>
                        <XCircle className="mr-2 h-4 w-4 text-red-500" />
                        {ui.reject}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
    </TableBody>
  </Table>
);

export default function DocumentApprovalsPage() {
  const [documents, setDocuments] = useState<DocumentForApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user: adminUser } = useFirebase();
  const { toast } = useToast();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];
  
  const [selectedDoc, setSelectedDoc] = useState<DocumentForApproval | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [uploadDoc, setUploadDoc] = useState<DocumentForApproval | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    setIsLoading(true);
    const q = query(collectionGroup(firestore, 'documents'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        path: doc.ref.path,
        ...(doc.data() as Omit<DocumentForApproval, 'id' | 'path'>),
      }));
      setDocuments(docs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (docToUpdate: DocumentForApproval, status: "Approved" | "Rejected") => {
    if (!adminUser) {
        toast({ title: ui.authErrorTitle, description: ui.authErrorDescription, variant: "destructive" });
        return;
    }
    const docRef = doc(firestore, docToUpdate.path);
    try {
        await updateDoc(docRef, {
            status: status,
            approvedBy: adminUser.uid,
        });

        // Create notification for the user
        const notificationRef = collection(firestore, 'users', docToUpdate.userId, 'notifications');
        const docLink = docToUpdate.companyId ? '/business/my-documents' : '/individual/my-documents';
        await addDoc(notificationRef, {
            title: ui.notifStatusUpdated.replace('{status}', status),
            description: ui.notifStatusUpdatedDesc.replace('{status}', status.toLowerCase()).replace('{name}', docToUpdate.name),
            type: 'document',
            read: false,
            link: docLink,
            createdAt: serverTimestamp(),
        });

        await logSystemEvent('INFO', 'Documents', `Document '${docToUpdate.name}' has been ${status.toLowerCase()} by admin ${adminUser.email}.`, { documentId: docToUpdate.id, userId: docToUpdate.userId, adminId: adminUser.uid });
        
        toast({ title: ui.notifStatusUpdated.replace('{status}', status) });
    } catch (error) {
        console.error("Error updating document status: ", error);
        toast({ title: ui.updateFailed, description: ui.updateFailedDescription, variant: "destructive" });
        await logSystemEvent('ERROR', 'Documents', `Failed to update document status for docId: ${docToUpdate.id}`, { error: (error as Error).message });
    }
  };

  const handleView = async (docToView: DocumentForApproval) => {
    setIsViewDialogOpen(true);
    setIsContentLoading(true);
    try {
        const docRef = doc(firestore, docToView.path);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setSelectedDoc({ id: docSnap.id, path: docSnap.ref.path, ...docSnap.data() } as DocumentForApproval);
        } else {
            toast({ title: ui.errorTitle, description: ui.documentNotFound, variant: "destructive" });
            setIsViewDialogOpen(false);
        }
    } catch (error) {
          toast({ title: ui.errorTitle, description: ui.fetchContentFailed, variant: "destructive" });
        setIsViewDialogOpen(false);
    } finally {
        setIsContentLoading(false);
    }
  };

  const handleDownloadPdf = async (docItem: DocumentForApproval) => {
    toast({ title: ui.preparingPdf });
    try {
        const docRef = doc(firestore, docItem.path);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists() || !docSnap.data()?.content) {
            toast({ title: ui.errorTitle, description: ui.contentNotFound, variant: "destructive" });
            return;
        }
        const content = docSnap.data()?.content as string;
        const name = docSnap.data()?.name || 'document';

        const { default: jsPDF } = await import('jspdf');
        const pdfDoc = new jsPDF();
        
        // Set font for better readability
        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.setFontSize(11);
        
        const pageWidth = pdfDoc.internal.pageSize.getWidth();
        const pageHeight = pdfDoc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        const lineHeight = 6;
        let yPosition = margin;
        
        // Split content into paragraphs (double newlines)
        const paragraphs = content.split(/\n\n+/);
        
        for (const paragraph of paragraphs) {
          // Handle lines within the paragraph (single newlines)
          const lines = paragraph.split('\n');
          
          for (const line of lines) {
            // Split long lines to fit page width
            const wrappedLines = pdfDoc.splitTextToSize(line.trim(), maxWidth);
            
            for (const wrappedLine of wrappedLines) {
              // Check if we need a new page
              if (yPosition + lineHeight > pageHeight - margin) {
                pdfDoc.addPage();
                yPosition = margin;
              }
              
              pdfDoc.text(wrappedLine, margin, yPosition);
              yPosition += lineHeight;
            }
          }
          
          // Add extra spacing between paragraphs
          yPosition += lineHeight * 0.5;
        }
        
        pdfDoc.save(`${name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
        console.error("Error downloading PDF:", error);
        toast({ title: ui.errorTitle, description: ui.downloadFailedDescription, variant: "destructive" });
    }
  };

  const handleDownloadWord = async (docItem: DocumentForApproval) => {
      toast({ title: ui.preparingWord });
      try {
          const docRef = doc(firestore, docItem.path);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists() || !docSnap.data()?.content) {
              toast({ title: ui.errorTitle, description: ui.contentNotFound, variant: "destructive" });
              return;
          }

          const content = docSnap.data()?.content;
          const name = docSnap.data()?.name || 'document';

          const { saveAs } = await import('file-saver');

          // Properly structure the HTML:
          // - Wrap content in proper <html><body> for valid structure
          // - Double newlines become paragraph breaks
          // - Single newlines become <br/> for soft line-breaks
          // - Escape any existing HTML entities first
          const escapedContent = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          
          // Convert paragraph structure: double newlines = new paragraph
          const paragraphs = escapedContent.split(/\n\n+/);
          const htmlParagraphs = paragraphs
            .map((p: string) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
            .join('');
          
          const htmlString = `<!DOCTYPE html><html><body>${htmlParagraphs}</body></html>`;

          const response = await convertHtmlToDocx({ htmlString });
          
          const byteCharacters = atob(response.docxBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});

          saveAs(blob, `${name.replace(/\s+/g, '_')}.docx`);

        } catch (error) {
          console.error("Error generating Word document:", error);
          toast({
            variant: "destructive",
            title: ui.downloadFailed,
            description: ui.downloadFailedDescription,
          });
        }
  };

  const handleUploadFinalDoc = async () => {
    if (!uploadDoc || !uploadFile) return;
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(
        storage,
        `document-reviews/${uploadDoc.userId}/${uploadDoc.id}/${timestamp}_${uploadFile.name}`
      );
      const snapshot = await uploadBytes(storageRef, uploadFile);
      const finalFileUrl = await getDownloadURL(snapshot.ref);
      const finalFileName = uploadFile.name;

      const docRef = doc(firestore, uploadDoc.path);
      await updateDoc(docRef, {
        status: 'Approved',
        finalFileUrl,
        finalFileName,
        approvedBy: adminUser?.uid,
        finalUploadedAt: serverTimestamp(),
      });

      const docLink = uploadDoc.companyId ? '/business/my-documents' : '/individual/my-documents';
      await addDoc(collection(firestore, 'users', uploadDoc.userId, 'notifications'), {
        title: ui.notifDocReady,
        description: ui.notifDocReadyDesc.replace('{name}', uploadDoc.name),
        type: 'document',
        read: false,
        link: docLink,
        createdAt: serverTimestamp(),
      });

      toast({ title: ui.uploadSuccess, description: ui.uploadSuccessDesc });
      setUploadDoc(null);
      setUploadFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: ui.uploadFailed, description: ui.uploadFailedDesc, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const filterDocs = (docs: DocumentForApproval[], status: DocumentStatus | 'All' = 'All') => {
    let filtered = docs;
    if (status !== 'All') {
      filtered = filtered.filter((d) => d.status === status);
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  const pendingDocs = filterDocs(documents, 'Pending Review');
  const approvedDocs = filterDocs(documents, 'Approved');
  const rejectedDocs = filterDocs(documents, 'Rejected');
  const allDocs = filterDocs(documents, 'All');

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                  <CardTitle>{ui.sectionTitle}</CardTitle>
                 <CardDescription>
                    {ui.sectionSubtitle}
                 </CardDescription>
              </div>
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={ui.searchPlaceholder}
                  className="pl-9 w-full min-w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-4 max-w-lg">
                    <TabsTrigger value="pending">
                        {ui.pending} {pendingDocs.length > 0 && `(${pendingDocs.length})`}
                    </TabsTrigger>
                      <TabsTrigger value="approved">{ui.approved}</TabsTrigger>
                      <TabsTrigger value="rejected">{ui.rejected}</TabsTrigger>
                      <TabsTrigger value="all">{ui.all}</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">
                      <ApprovalTable docs={pendingDocs} onUpdateStatus={handleUpdateStatus} isLoading={isLoading} onView={handleView} onDownloadPdf={handleDownloadPdf} onDownloadWord={handleDownloadWord} onUploadFinal={(d) => setUploadDoc(d)} ui={ui} />
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                      <ApprovalTable docs={approvedDocs} onUpdateStatus={handleUpdateStatus} isLoading={isLoading} onView={handleView} onDownloadPdf={handleDownloadPdf} onDownloadWord={handleDownloadWord} onUploadFinal={(d) => setUploadDoc(d)} ui={ui} />
                </TabsContent>
                <TabsContent value="rejected" className="mt-4">
                      <ApprovalTable docs={rejectedDocs} onUpdateStatus={handleUpdateStatus} isLoading={isLoading} onView={handleView} onDownloadPdf={handleDownloadPdf} onDownloadWord={handleDownloadWord} onUploadFinal={(d) => setUploadDoc(d)} ui={ui} />
                </TabsContent>
                <TabsContent value="all" className="mt-4">
                      <ApprovalTable docs={allDocs} onUpdateStatus={handleUpdateStatus} isLoading={isLoading} onView={handleView} onDownloadPdf={handleDownloadPdf} onDownloadWord={handleDownloadWord} onUploadFinal={(d) => setUploadDoc(d)} ui={ui} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
            <DialogDescription>
              {ui.submittedByOn} {selectedDoc?.userName} on {selectedDoc?.createdAt ? format(new Date(selectedDoc.createdAt.seconds * 1000), 'PPP') : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] rounded-md border">
              {isContentLoading ? (
                 <div className="space-y-4 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <div 
                  className="p-4 text-sm leading-relaxed whitespace-pre-wrap font-sans"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {selectedDoc?.content || ui.noContentFound}
                </div>
              )}
          </ScrollArea>
           <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsViewDialogOpen(false)}>
              {ui.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Final Document Dialog */}
      <Dialog
        open={!!uploadDoc}
        onOpenChange={(open) => {
          if (!open) {
            setUploadDoc(null);
            setUploadFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ui.uploadDialogTitle}</DialogTitle>
            <DialogDescription>
              {ui.uploadDialogDescription.replace('{name}', uploadDoc?.name || '')}
            </DialogDescription>
          </DialogHeader>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => uploadInputRef.current?.click()}
          >
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            {uploadFile ? (
              <p className="text-sm font-medium">{uploadFile.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{ui.uploadDialogChooseFile}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDoc(null);
                setUploadFile(null);
              }}
              disabled={isUploading}
            >
              {ui.uploadDialogCancel}
            </Button>
            <Button
              disabled={!uploadFile || isUploading}
              onClick={() => void handleUploadFinalDoc()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {ui.uploadDialogUploading}
                </>
              ) : (
                ui.uploadDialogUploadApprove
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
