
"use client";

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
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileDown, Share2, Trash2, View, PlusCircle, Search, Upload, Bell, AlertCircle, CheckCircle, Loader2, Download, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, getDoc, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocale } from 'next-intl';
import { convertHtmlToDocx } from '@/ai/flows/document-converter-flow';
import { storage } from '@/firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notifyAdmin } from '@/lib/admin-notifications';
import { plainTextToDocxHtml } from '@/lib/document-export-html';

type Document = {
  id: string;
  name: string;
  templateType: string;
  status: "Approved" | "Pending Review" | "Draft" | "Rejected";
  createdAt: { seconds: number; nanoseconds: number };
  content?: string;
};

type DocumentStatus = Document['status'];

type SavedScenario = {
  id: string;
  scenarioType: string;
  location: string;
  netIncomeChange: number;
  taxDifference: number;
  createdAt: { seconds: number; nanoseconds: number } | null;
  reviewStatus?: 'pending' | 'reviewed';
};

type TaxReturnDoc = {
  docType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt?: { seconds: number; nanoseconds: number } | null;
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
  fetchDocumentsFailed: string;
  documentNotFound: string;
  fetchContentFailed: string;
  documentDeletedTitle: string;
  documentDeletedDescription: string;
  deleteFailed: string;
  preparingPdf: string;
  contentNotFound: string;
  downloadPdfFailed: string;
  preparingWord: string;
  downloadFailed: string;
  downloadFailedDescription: string;
  pageTitle: string;
  pageSubtitle: string;
  pricingNote: string;
  centerTitle: string;
  centerDescription: string;
  searchPlaceholder: string;
  uploadDocument: string;
  name: string;
  type: string;
  status: string;
  date: string;
  actions: string;
  na: string;
  openMenu: string;
  view: string;
  download: string;
  pdfDocument: string;
  wordDocument: string;
  share: string;
  delete: string;
  noSearchResults: string;
  noDocuments: string;
  createdOn: string;
  noContentFound: string;
  close: string;
  statusApproved: string;
  statusPendingReview: string;
  statusDraft: string;
  statusRejected: string;
  tabGenerated: string;
  tabScenarios: string;
  tabTaxReturn: string;
  tabScenariosDescription: string;
  tabTaxReturnDescription: string;
  noScenarios: string;
  noTaxDocs: string;
  viewFile: string;
  reviewPending: string;
  reviewReviewed: string;
  scenarioTypeLabel: string;
  taxDocTypeLabel: string;
}> = {
  en: {
    errorTitle: 'Error', fetchDocumentsFailed: 'Could not fetch your documents.', documentNotFound: 'Document not found.', fetchContentFailed: 'Could not fetch document content.',
    documentDeletedTitle: 'Document Deleted', documentDeletedDescription: 'Your document has been successfully deleted.', deleteFailed: 'Could not delete the document.',
    preparingPdf: 'Preparing PDF...', contentNotFound: 'Document content not found.', downloadPdfFailed: 'Could not download PDF.',
    preparingWord: 'Preparing Word document...', downloadFailed: 'Download Failed', downloadFailedDescription: 'Could not generate the Word document. Please try again.',
    pageTitle: 'My Documents', pageSubtitle: 'Manage your generated and uploaded documents.', pricingNote: 'Pricing: CHF 20 for reviewed/corrected/approved documents, CHF 5 for instant non-reviewed PDF downloads. Documents are generated based on Swiss law and comply with legal requirements.',
    centerTitle: 'Document Center', centerDescription: 'All your secure documents in one place.', searchPlaceholder: 'Search documents...', uploadDocument: 'Upload Document',
    name: 'Name', type: 'Type', status: 'Status', date: 'Date', actions: 'Actions', na: 'N/A', openMenu: 'Open menu', view: 'View', download: 'Download', pdfDocument: 'PDF Document', wordDocument: 'Word Document (.docx)', share: 'Share', delete: 'Delete',
    noSearchResults: 'No documents match your search.', noDocuments: 'No documents found.', createdOn: 'Created on', noContentFound: 'No content found.', close: 'Close',
    statusApproved: 'Approved', statusPendingReview: 'Pending Review', statusDraft: 'Draft', statusRejected: 'Rejected',
    tabGenerated: 'Generated Documents', tabScenarios: 'Generated Scenarios', tabTaxReturn: 'My Tax Return Documents',
    tabScenariosDescription: 'Scenarios submitted for expert review.', tabTaxReturnDescription: 'Documents uploaded for your yearly tax return.',
    noScenarios: 'No scenario reviews submitted yet.', noTaxDocs: 'No tax return documents uploaded yet.',
    viewFile: 'View', reviewPending: 'Pending', reviewReviewed: 'Reviewed', scenarioTypeLabel: 'Scenario', taxDocTypeLabel: 'Document Type',
  },
  fr: { errorTitle: 'Erreur', fetchDocumentsFailed: 'Impossible de recuperer vos documents.', documentNotFound: 'Document introuvable.', fetchContentFailed: 'Impossible de recuperer le contenu du document.', documentDeletedTitle: 'Document supprime', documentDeletedDescription: 'Votre document a ete supprime avec succes.', deleteFailed: 'Impossible de supprimer le document.', preparingPdf: 'Preparation du PDF...', contentNotFound: 'Contenu du document introuvable.', downloadPdfFailed: 'Impossible de telecharger le PDF.', preparingWord: 'Preparation du document Word...', downloadFailed: 'Echec du telechargement', downloadFailedDescription: 'Impossible de generer le document Word. Veuillez reessayer.', pageTitle: 'Mes documents', pageSubtitle: 'Gerez vos documents generes et televerses.', pricingNote: 'Tarification : CHF 20 pour les documents revus/corriges/approuves, CHF 5 pour les telechargements PDF instantanes non revus. Les documents sont generes selon le droit suisse et conformes aux exigences legales.', centerTitle: 'Centre de documents', centerDescription: 'Tous vos documents securises en un seul endroit.', searchPlaceholder: 'Rechercher des documents...', uploadDocument: 'Televerser un document', name: 'Nom', type: 'Type', status: 'Statut', date: 'Date', actions: 'Actions', na: 'N/A', openMenu: 'Ouvrir le menu', view: 'Voir', download: 'Telecharger', pdfDocument: 'Document PDF', wordDocument: 'Document Word (.docx)', share: 'Partager', delete: 'Supprimer', noSearchResults: 'Aucun document ne correspond a votre recherche.', noDocuments: 'Aucun document trouve.', createdOn: 'Cree le', noContentFound: 'Aucun contenu trouve.', close: 'Fermer', statusApproved: 'Approuve', statusPendingReview: 'En attente de revision', statusDraft: 'Brouillon', statusRejected: 'Rejete', tabGenerated: 'Documents générés', tabScenarios: 'Scénarios générés', tabTaxReturn: 'Mes documents fiscaux', tabScenariosDescription: 'Scénarios soumis pour révision par un expert.', tabTaxReturnDescription: 'Documents téléversés pour votre déclaration annuelle.', noScenarios: 'Aucun scénario soumis pour révision.', noTaxDocs: 'Aucun document fiscal téléversé.', viewFile: 'Voir', reviewPending: 'En attente', reviewReviewed: 'Révisé', scenarioTypeLabel: 'Scénario', taxDocTypeLabel: 'Type de document' },
  de: { errorTitle: 'Fehler', fetchDocumentsFailed: 'Ihre Dokumente konnten nicht geladen werden.', documentNotFound: 'Dokument nicht gefunden.', fetchContentFailed: 'Dokumentinhalt konnte nicht geladen werden.', documentDeletedTitle: 'Dokument geloescht', documentDeletedDescription: 'Ihr Dokument wurde erfolgreich geloescht.', deleteFailed: 'Dokument konnte nicht geloescht werden.', preparingPdf: 'PDF wird vorbereitet...', contentNotFound: 'Dokumentinhalt nicht gefunden.', downloadPdfFailed: 'PDF konnte nicht heruntergeladen werden.', preparingWord: 'Word Dokument wird vorbereitet...', downloadFailed: 'Download fehlgeschlagen', downloadFailedDescription: 'Word Dokument konnte nicht erstellt werden. Bitte erneut versuchen.', pageTitle: 'Meine Dokumente', pageSubtitle: 'Verwalten Sie Ihre generierten und hochgeladenen Dokumente.', pricingNote: 'Preise: CHF 20 fuer gepruefte/korrigierte/freigegebene Dokumente, CHF 5 fuer sofortige nicht gepruefte PDF Downloads. Dokumente werden nach Schweizer Recht erstellt und entsprechen den rechtlichen Anforderungen.', centerTitle: 'Dokumentenzentrum', centerDescription: 'Alle Ihre sicheren Dokumente an einem Ort.', searchPlaceholder: 'Dokumente suchen...', uploadDocument: 'Dokument hochladen', name: 'Name', type: 'Typ', status: 'Status', date: 'Datum', actions: 'Aktionen', na: 'N/A', openMenu: 'Menue oeffnen', view: 'Anzeigen', download: 'Herunterladen', pdfDocument: 'PDF Dokument', wordDocument: 'Word Dokument (.docx)', share: 'Teilen', delete: 'Loeschen', noSearchResults: 'Keine Dokumente entsprechen Ihrer Suche.', noDocuments: 'Keine Dokumente gefunden.', createdOn: 'Erstellt am', noContentFound: 'Kein Inhalt gefunden.', close: 'Schliessen', statusApproved: 'Freigegeben', statusPendingReview: 'Pruefung ausstehend', statusDraft: 'Entwurf', statusRejected: 'Abgelehnt', tabGenerated: 'Generierte Dokumente', tabScenarios: 'Generierte Szenarien', tabTaxReturn: 'Meine Steuerdokumente', tabScenariosDescription: 'Szenarien zur Expertenbewertung eingereicht.', tabTaxReturnDescription: 'Dokumente für Ihre jährliche Steuererklärung hochgeladen.', noScenarios: 'Noch keine Szenarien zur Überprüfung eingereicht.', noTaxDocs: 'Noch keine Steuerdokumente hochgeladen.', viewFile: 'Anzeigen', reviewPending: 'Ausstehend', reviewReviewed: 'Geprüft', scenarioTypeLabel: 'Szenario', taxDocTypeLabel: 'Dokumenttyp' },
  it: { errorTitle: 'Errore', fetchDocumentsFailed: 'Impossibile recuperare i tuoi documenti.', documentNotFound: 'Documento non trovato.', fetchContentFailed: 'Impossibile recuperare il contenuto del documento.', documentDeletedTitle: 'Documento eliminato', documentDeletedDescription: 'Il tuo documento e stato eliminato con successo.', deleteFailed: 'Impossibile eliminare il documento.', preparingPdf: 'Preparazione PDF...', contentNotFound: 'Contenuto del documento non trovato.', downloadPdfFailed: 'Impossibile scaricare il PDF.', preparingWord: 'Preparazione documento Word...', downloadFailed: 'Download non riuscito', downloadFailedDescription: 'Impossibile generare il documento Word. Riprova.', pageTitle: 'I miei documenti', pageSubtitle: 'Gestisci i tuoi documenti generati e caricati.', pricingNote: 'Prezzi: CHF 20 per documenti revisionati/corretti/approvati, CHF 5 per download PDF istantanei non revisionati. I documenti sono generati secondo il diritto svizzero e conformi ai requisiti legali.', centerTitle: 'Centro documenti', centerDescription: 'Tutti i tuoi documenti sicuri in un unico posto.', searchPlaceholder: 'Cerca documenti...', uploadDocument: 'Carica documento', name: 'Nome', type: 'Tipo', status: 'Stato', date: 'Data', actions: 'Azioni', na: 'N/A', openMenu: 'Apri menu', view: 'Visualizza', download: 'Scarica', pdfDocument: 'Documento PDF', wordDocument: 'Documento Word (.docx)', share: 'Condividi', delete: 'Elimina', noSearchResults: 'Nessun documento corrisponde alla tua ricerca.', noDocuments: 'Nessun documento trovato.', createdOn: 'Creato il', noContentFound: 'Nessun contenuto trovato.', close: 'Chiudi', statusApproved: 'Approvato', statusPendingReview: 'In attesa di revisione', statusDraft: 'Bozza', statusRejected: 'Respinto', tabGenerated: 'Documenti generati', tabScenarios: 'Scenari generati', tabTaxReturn: 'I miei documenti fiscali', tabScenariosDescription: 'Scenari inviati per revisione da un esperto.', tabTaxReturnDescription: 'Documenti caricati per la dichiarazione dei redditi annuale.', noScenarios: 'Nessuno scenario inviato per revisione.', noTaxDocs: 'Nessun documento fiscale caricato.', viewFile: 'Visualizza', reviewPending: 'In attesa', reviewReviewed: 'Revisionato', scenarioTypeLabel: 'Scenario', taxDocTypeLabel: 'Tipo di documento' },
  es: { errorTitle: 'Error', fetchDocumentsFailed: 'No se pudieron obtener tus documentos.', documentNotFound: 'Documento no encontrado.', fetchContentFailed: 'No se pudo obtener el contenido del documento.', documentDeletedTitle: 'Documento eliminado', documentDeletedDescription: 'Tu documento se elimino correctamente.', deleteFailed: 'No se pudo eliminar el documento.', preparingPdf: 'Preparando PDF...', contentNotFound: 'Contenido del documento no encontrado.', downloadPdfFailed: 'No se pudo descargar el PDF.', preparingWord: 'Preparando documento Word...', downloadFailed: 'Descarga fallida', downloadFailedDescription: 'No se pudo generar el documento Word. Intentalo de nuevo.', pageTitle: 'Mis documentos', pageSubtitle: 'Gestiona tus documentos generados y subidos.', pricingNote: 'Precios: CHF 20 para documentos revisados/corregidos/aprobados, CHF 5 para descargas PDF instantaneas no revisadas. Los documentos se generan segun la ley suiza y cumplen los requisitos legales.', centerTitle: 'Centro de documentos', centerDescription: 'Todos tus documentos seguros en un solo lugar.', searchPlaceholder: 'Buscar documentos...', uploadDocument: 'Subir documento', name: 'Nombre', type: 'Tipo', status: 'Estado', date: 'Fecha', actions: 'Acciones', na: 'N/A', openMenu: 'Abrir menu', view: 'Ver', download: 'Descargar', pdfDocument: 'Documento PDF', wordDocument: 'Documento Word (.docx)', share: 'Compartir', delete: 'Eliminar', noSearchResults: 'Ningun documento coincide con tu busqueda.', noDocuments: 'No se encontraron documentos.', createdOn: 'Creado el', noContentFound: 'No se encontro contenido.', close: 'Cerrar', statusApproved: 'Aprobado', statusPendingReview: 'Pendiente de revision', statusDraft: 'Borrador', statusRejected: 'Rechazado', tabGenerated: 'Documentos generados', tabScenarios: 'Escenarios generados', tabTaxReturn: 'Mis documentos fiscales', tabScenariosDescription: 'Escenarios enviados para revisión por un experto.', tabTaxReturnDescription: 'Documentos subidos para tu declaración de impuestos anual.', noScenarios: 'No hay revisiones de escenarios enviadas aún.', noTaxDocs: 'No hay documentos fiscales subidos aún.', viewFile: 'Ver', reviewPending: 'Pendiente', reviewReviewed: 'Revisado', scenarioTypeLabel: 'Escenario', taxDocTypeLabel: 'Tipo de documento' },
};

const getStatusBadgeVariant = (status: DocumentStatus) => {
  switch (status) {
    case "Approved":
      return "default";
    case "Pending Review":
      return "secondary";
    case "Rejected":
      return "destructive";
    case "Draft":
      return "outline";
    default:
      return "outline";
  }
};


export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useFirebase();
  const { toast } = useToast();

  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  // ── Pending Document Requests from Admin ──
  type PendingRequest = {
    id: string;
    subject: string;
    message: string;
    senderName: string;
    status: 'pending' | 'fulfilled' | 'acknowledged';
    createdAt: { seconds: number; nanoseconds: number } | null;
  };
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [requestUploadOpen, setRequestUploadOpen] = useState<string | null>(null);
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [isUploadingRequest, setIsUploadingRequest] = useState(false);
  const requestFileRef = useRef<HTMLInputElement>(null);

  // ── Documents sent freely by Admin (ad-hoc transfers) ──
  type ReceivedDocument = {
    id: string;
    subject: string;
    message: string;
    senderName: string;
    fileUrl: string;
    fileName: string;
    createdAt: { seconds: number; nanoseconds: number } | null;
  };
  const [receivedDocuments, setReceivedDocuments] = useState<ReceivedDocument[]>([]);

  // Real-time listener for document_exchanges targeting this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'document_exchanges'),
      where('recipientId', '==', user.uid),
      where('type', '==', 'document_request')
    );
    const unsub = onSnapshot(q, (snap) => {
      const reqs: PendingRequest[] = snap.docs.map(d => ({
        id: d.id,
        subject: d.data().subject || '',
        message: d.data().message || '',
        senderName: d.data().senderName || 'Admin',
        status: d.data().status || 'pending',
        createdAt: d.data().createdAt || null,
      }));
      reqs.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
      });
      setPendingRequests(reqs);
    });
    return () => unsub();
  }, [user]);

  // Upload a file to fulfill a document request
  const handleRequestUpload = async (requestId: string) => {
    if (!requestFile || !user) return;
    setIsUploadingRequest(true);
    try {
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fileRef = storageRef(storage, `document-exchanges/${fileId}/${requestFile.name}`);
      const snapshot = await uploadBytes(fileRef, requestFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(firestore, 'document_exchanges', requestId), {
        status: 'fulfilled',
        userFileUrl: downloadUrl,
        userFileName: requestFile.name,
        updatedAt: serverTimestamp(),
      });
      // Notify admin
      notifyAdmin({
        title: 'Document uploaded by client',
        description: `${user.displayName || user.email} uploaded "${requestFile.name}" in response to a document request.`,
        type: 'document_request_fulfilled',
        link: '/admin/document-exchange',
        clientId: user.uid,
        clientName: user.displayName || user.email || 'Unknown',
      });
      toast({ title: 'Document Uploaded', description: 'Your document has been submitted successfully.' });
      setRequestUploadOpen(null);
      setRequestFile(null);
    } catch (err) {
      console.error('Error uploading request document:', err);
      toast({ title: ui.errorTitle, description: 'Could not upload document.', variant: 'destructive' });
    } finally {
      setIsUploadingRequest(false);
    }
  };

  // Real-time listener for ad-hoc documents freely sent by admin
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'document_exchanges'),
      where('recipientId', '==', user.uid),
      where('type', '==', 'document_sent')
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs: ReceivedDocument[] = snap.docs
        .filter(d => d.data().fileUrl)
        .map(d => ({
          id: d.id,
          subject: d.data().subject || '',
          message: d.data().message || '',
          senderName: d.data().senderName || 'Admin',
          fileUrl: d.data().fileUrl || '',
          fileName: d.data().fileName || 'document',
          createdAt: d.data().createdAt || null,
        }));
      docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setReceivedDocuments(docs);
    });
    return () => unsub();
  }, [user]);

  // ── All Saved Scenario Calculations ──
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  // Map of scenarioType -> review status from document_exchanges
  const [reviewStatusMap, setReviewStatusMap] = useState<Map<string, 'pending' | 'reviewed'>>(new Map());

  // Load review statuses for cross-referencing
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'document_exchanges'),
      where('requesterId', '==', user.uid),
      where('type', '==', 'scenario_review')
    );
    const unsub = onSnapshot(q, (snap) => {
      const map = new Map<string, 'pending' | 'reviewed'>();
      snap.docs.forEach(d => {
        const st = d.data().scenarioType || '';
        map.set(st, d.data().status === 'pending' ? 'pending' : 'reviewed');
      });
      setReviewStatusMap(map);
    });
    return () => unsub();
  }, [user]);

  // Load all saved scenario calculation results
  useEffect(() => {
    if (!user) { setIsLoadingScenarios(false); return; }
    const q = query(
      collection(firestore, 'users', user.uid, 'scenarios'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const scenarios: SavedScenario[] = snap.docs.map(d => ({
        id: d.id,
        scenarioType: d.data().metadata?.scenarioType || d.data().metadata?.scenarioId || '',
        location: d.data().metadata?.location || '',
        netIncomeChange: d.data().comparison?.netIncomeChange ?? 0,
        taxDifference: d.data().comparison?.taxDifference ?? 0,
        createdAt: d.data().createdAt || null,
      }));
      setSavedScenarios(scenarios);
      setIsLoadingScenarios(false);
    });
    return () => unsub();
  }, [user]);

  // ── My Tax Return Documents ──
  const [taxReturnDocs, setTaxReturnDocs] = useState<TaxReturnDoc[]>([]);
  const [isLoadingTaxDocs, setIsLoadingTaxDocs] = useState(true);
  // undefined = not yet loaded, null = no active order, string = active order id
  const [taxOrderId, setTaxOrderId] = useState<string | null | undefined>(undefined);
  const [taxOrderStatus, setTaxOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setIsLoadingTaxDocs(false); return; }
    const unsub = onSnapshot(
      query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        const orders = snap.docs.map(d => ({ id: d.id, status: d.data().status as string }));
        const found = orders.find(o => ['paid', 'in_progress', 'pending_review'].includes(o.status));
        setTaxOrderId(found?.id ?? null);
        setTaxOrderStatus(found?.status ?? null);
        if (!found) setIsLoadingTaxDocs(false);
      }
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (taxOrderId === undefined) return;
    if (!user || taxOrderId === null) { setTaxReturnDocs([]); setIsLoadingTaxDocs(false); return; }
    const unsub = onSnapshot(
      collection(firestore, 'users', user.uid, 'orders', taxOrderId, 'taxDocuments'),
      (snap) => {
        const docs: TaxReturnDoc[] = snap.docs.map(d => ({
          docType: d.id,
          fileName: d.data().fileName || '',
          fileUrl: d.data().fileUrl || '',
          uploadedAt: d.data().uploadedAt || null,
        }));
        setTaxReturnDocs(docs);
        setIsLoadingTaxDocs(false);
      }
    );
    return () => unsub();
  }, [user, taxOrderId]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    };
    
    setIsLoading(true);
    const q = query(collection(firestore, 'users', user.uid, 'documents'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const userDocs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Document, 'id'>)
        }));
        setDocuments(userDocs);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching documents: ", error);
        toast({
          title: ui.errorTitle,
          description: ui.fetchDocumentsFailed,
            variant: "destructive"
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, ui.errorTitle, ui.fetchDocumentsFailed, user]);

  const handleView = async (docId: string) => {
    if (!user) return;
    setIsViewDialogOpen(true);
    setIsContentLoading(true);
    try {
        const docRef = doc(firestore, 'users', user.uid, 'documents', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setSelectedDoc({ id: docSnap.id, ...docSnap.data() } as Document);
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
  }

  const handleDelete = async (docId: string) => {
    if (!user) return;
    try {
        await deleteDoc(doc(firestore, 'users', user.uid, 'documents', docId));
        toast({
          title: ui.documentDeletedTitle,
          description: ui.documentDeletedDescription,
        })
    } catch (error) {
        console.error("Error deleting document: ", error);
        toast({
          title: ui.errorTitle,
          description: ui.deleteFailed,
            variant: "destructive"
        });
    }
  }

  const handleDownloadPdf = async (docItem: Document) => {
    if (!user) return;
    toast({ title: ui.preparingPdf });
    try {
        const docRef = doc(firestore, 'users', user.uid, 'documents', docItem.id);
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
        toast({ title: ui.errorTitle, description: ui.downloadPdfFailed, variant: "destructive" });
    }
  }

  const handleDownloadWord = async (docItem: Document) => {
      if (!user) return;
      toast({ title: ui.preparingWord });
      try {
          const docRef = doc(firestore, 'users', user.uid, 'documents', docItem.id);
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
          const htmlString = plainTextToDocxHtml(content as string);

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
  }

  const getStatusLabel = (status: DocumentStatus): string => {
    if (status === 'Approved') return ui.statusApproved;
    if (status === 'Pending Review') return ui.statusPendingReview;
    if (status === 'Draft') return ui.statusDraft;
    return ui.statusRejected;
  };

  const formatScenarioType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const DOCUMENT_RETENTION_DAYS = 30;

  const filteredDocuments = documents.filter(doc => {
    // Enforce 30-day retention window
    if (doc.createdAt) {
      const docDate = new Date(doc.createdAt.seconds * 1000);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - DOCUMENT_RETENTION_DAYS);
      if (docDate < cutoff) return false;
    }
    return (
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      doc.templateType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
        <p className="text-muted-foreground">
          {ui.pageSubtitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {ui.pricingNote}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Generated documents are stored and available for download for <strong>30 days</strong> from their creation date.
        </p>
      </div>

      {/* ── Pending Document Requests from Admin ── */}
      {pendingRequests.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Bell className="mr-2 h-5 w-5 text-orange-600" />
              Document Requests
              {pendingRequests.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingRequests.filter(r => r.status === 'pending').length} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Documents requested by Lynvia. Click a request or use the Upload button to respond.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  req.status === 'pending'
                    ? 'bg-white dark:bg-gray-900 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/40'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }`}
                onClick={() => {
                  if (req.status === 'pending') setRequestUploadOpen(req.id);
                }}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-1 rounded-full p-1.5 ${req.status === 'pending' ? 'bg-orange-100 dark:bg-orange-900' : 'bg-green-100 dark:bg-green-900'}`}>
                    {req.status === 'pending' ? (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{req.subject}</p>
                    {req.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{req.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      From: {req.senderName}
                      {req.createdAt && <> &middot; {new Date(req.createdAt.seconds * 1000).toLocaleDateString()}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {req.status === 'pending' ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5"
                      onClick={(e) => { e.stopPropagation(); setRequestUploadOpen(req.id); }}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" /> Uploaded
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload dialog for a specific request */}
      <Dialog open={!!requestUploadOpen} onOpenChange={(v) => { if (!v) { setRequestUploadOpen(null); setRequestFile(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Requested Document</DialogTitle>
            <DialogDescription>
              {pendingRequests.find(r => r.id === requestUploadOpen)?.subject}
            </DialogDescription>
          </DialogHeader>
          {pendingRequests.find(r => r.id === requestUploadOpen)?.message && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              {pendingRequests.find(r => r.id === requestUploadOpen)?.message}
            </div>
          )}
          <div
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer"
            onClick={() => requestFileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setRequestFile(f); }}
          >
            <input
              ref={requestFileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) setRequestFile(f); }}
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            {requestFile ? (
              <p className="text-sm font-medium text-foreground">{requestFile.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Drag & drop your file here or click to browse</p>
            )}
            <Button variant="outline" size="sm" className="mt-2" type="button" onClick={e => { e.stopPropagation(); requestFileRef.current?.click(); }}>
              Choose File
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRequestUploadOpen(null); setRequestFile(null); }}>Cancel</Button>
            <Button
              disabled={!requestFile || isUploadingRequest}
              onClick={() => requestUploadOpen && handleRequestUpload(requestUploadOpen)}
            >
              {isUploadingRequest ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="mr-2 h-4 w-4" /> Submit Document</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Documents freely sent by Admin (ad-hoc transfers) ── */}
      {receivedDocuments.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Download className="mr-2 h-5 w-5 text-blue-600" />
              Documents from Lynvia
              <Badge variant="secondary" className="ml-2">{receivedDocuments.length}</Badge>
            </CardTitle>
            <CardDescription>Files sent directly to you by the Lynvia team — download to save a local copy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedDocuments.map((rdoc) => (
              <div
                key={rdoc.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1 rounded-full p-1.5 bg-blue-100 dark:bg-blue-900">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{rdoc.subject}</p>
                    {rdoc.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rdoc.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {rdoc.fileName} &middot; From: {rdoc.senderName}
                      {rdoc.createdAt && <> &middot; {new Date(rdoc.createdAt.seconds * 1000).toLocaleDateString()}</>}
                    </p>
                  </div>
                </div>
                <div className="ml-3 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5" asChild>
                    <a href={rdoc.fileUrl} target="_blank" rel="noopener noreferrer" download={rdoc.fileName}>
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="generated" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generated">{ui.tabGenerated}</TabsTrigger>
          <TabsTrigger value="scenarios">{ui.tabScenarios}</TabsTrigger>
          <TabsTrigger value="tax-return">{ui.tabTaxReturn}</TabsTrigger>
        </TabsList>

        {/* ── Generated Documents ── */}
        <TabsContent value="generated">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                      <CardTitle>{ui.centerTitle}</CardTitle>
                     <CardDescription>
                        {ui.centerDescription}
                     </CardDescription>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                     <div className="relative flex-grow sm:flex-grow-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder={ui.searchPlaceholder} 
                          className="pl-9 w-full"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <Button disabled>
                        <PlusCircle className="mr-2 h-4 w-4" />
                          {ui.uploadDocument}
                     </Button>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ui.name}</TableHead>
                    <TableHead className="hidden md:table-cell">{ui.type}</TableHead>
                    <TableHead>{ui.status}</TableHead>
                    <TableHead className="hidden lg:table-cell">{ui.date}</TableHead>
                    <TableHead className="text-right">{ui.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && filteredDocuments.map((docItem) => (
                    <TableRow key={docItem.id}>
                      <TableCell className="font-medium">{docItem.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{docItem.templateType}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(docItem.status)}>
                            {getStatusLabel(docItem.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {docItem.createdAt ? format(new Date(docItem.createdAt.seconds * 1000), 'yyyy-MM-dd') : ui.na}
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
                            <DropdownMenuLabel>{ui.actions}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleView(docItem.id)}>
                              <View className="mr-2 h-4 w-4" />
                              {ui.view}
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <FileDown className="mr-2 h-4 w-4" />
                                {ui.download}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem onClick={() => handleDownloadPdf(docItem)}>
                                    {ui.pdfDocument}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadWord(docItem)}>
                                    {ui.wordDocument}
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuItem disabled>
                              <Share2 className="mr-2 h-4 w-4" />
                              {ui.share}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(docItem.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {ui.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && filteredDocuments.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            {searchTerm ? ui.noSearchResults : ui.noDocuments}
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Generated Scenarios (All Saved Calculations) ── */}
        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>{ui.tabScenarios}</CardTitle>
              <CardDescription>All scenarios you have calculated. Scenarios submitted for expert review show a review status badge.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ui.scenarioTypeLabel}</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="hidden lg:table-cell">Net Income Change</TableHead>
                    <TableHead className="hidden lg:table-cell">Tax Change</TableHead>
                    <TableHead>{ui.date}</TableHead>
                    <TableHead>Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingScenarios && Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingScenarios && savedScenarios.map((sc) => {
                    const reviewStatus = reviewStatusMap.get(sc.scenarioType);
                    return (
                      <TableRow key={sc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            {formatScenarioType(sc.scenarioType)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{sc.location || ui.na}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className={sc.netIncomeChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {sc.netIncomeChange >= 0 ? '+' : ''}{sc.netIncomeChange.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className={sc.taxDifference <= 0 ? 'text-green-600' : 'text-red-600'}>
                            {sc.taxDifference >= 0 ? '+' : ''}{sc.taxDifference.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sc.createdAt ? format(new Date(sc.createdAt.seconds * 1000), 'yyyy-MM-dd') : ui.na}
                        </TableCell>
                        <TableCell>
                          {reviewStatus ? (
                            <Badge variant={reviewStatus === 'pending' ? 'secondary' : 'default'}>
                              {reviewStatus === 'pending' ? ui.reviewPending : ui.reviewReviewed}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoadingScenarios && savedScenarios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No scenarios calculated yet. Run a scenario in the Scenario Calculator to see results here.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── My Tax Return Documents ── */}
        <TabsContent value="tax-return">
          {taxOrderStatus && (
            <div className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
              taxOrderStatus === 'paid' ? 'border-blue-200 bg-blue-50/60 text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300' :
              taxOrderStatus === 'in_progress' ? 'border-yellow-200 bg-yellow-50/60 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-300' :
              'border-green-200 bg-green-50/60 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300'
            }`}>
              <div className={`h-2 w-2 rounded-full shrink-0 ${
                taxOrderStatus === 'paid' ? 'bg-blue-500' :
                taxOrderStatus === 'in_progress' ? 'bg-yellow-500 animate-pulse' :
                'bg-green-500'
              }`} />
              <span className="font-medium">Order Status:</span>
              <span>{
                taxOrderStatus === 'paid' ? 'Payment received — awaiting document upload from Lynvia' :
                taxOrderStatus === 'in_progress' ? 'In progress — your documents are being processed' :
                taxOrderStatus === 'pending_review' ? 'Under review — Lynvia is reviewing your documents' :
                taxOrderStatus
              }</span>
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{ui.tabTaxReturn}</CardTitle>
              <CardDescription>{ui.tabTaxReturnDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ui.taxDocTypeLabel}</TableHead>
                    <TableHead>{ui.name}</TableHead>
                    <TableHead>{ui.date}</TableHead>
                    <TableHead className="text-right">{ui.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTaxDocs && Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingTaxDocs && taxReturnDocs.map((tdoc) => (
                    <TableRow key={tdoc.docType}>
                      <TableCell className="font-medium">{formatScenarioType(tdoc.docType)}</TableCell>
                      <TableCell className="text-muted-foreground">{tdoc.fileName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {tdoc.uploadedAt ? format(new Date(tdoc.uploadedAt.seconds * 1000), 'yyyy-MM-dd') : ui.na}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="gap-1.5" asChild>
                          <a href={tdoc.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            {ui.viewFile}
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoadingTaxDocs && taxReturnDocs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {ui.noTaxDocs}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.templateType} - {ui.createdOn} {selectedDoc?.createdAt ? format(new Date(selectedDoc.createdAt.seconds * 1000), 'PPP') : ''}
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
    </div>
  );
}

    