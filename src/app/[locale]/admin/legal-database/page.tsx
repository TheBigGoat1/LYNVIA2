
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Upload, Search, Trash2, FileText, RefreshCw, FileWarning, Loader2, Download, PackageOpen, CheckCircle, Check, X, FileX, FileCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firestore, storage } from '@/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { swissCantons } from '@/lib/constants';
import { Progress } from '@/components/ui/progress';
import { indexDocument } from '@/ai/flows/document-indexer-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from 'next-intl';


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

type LegalDocument = {
  id: string;
  title: string;
  type: string;
  canton: string;
  status: "Indexed" | "Processing" | "Failed" | "Pending Approval";
  chunks: number;
  lastUpdated: { seconds: number; nanoseconds: number };
  downloadURL?: string;
};

type Chunk = {
  id: string;
  text: string;
  chunkNumber: number;
};

type DocumentStatus = LegalDocument['status'];

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
  corpusTitle: string;
  corpusDescription: string;
  searchPlaceholder: string;
  uploadDocument: string;
  uploadTitle: string;
  uploadDescription: string;
  documentTitle: string;
  documentType: string;
  canton: string;
  selectCanton: string;
  federal: string;
  documentFile: string;
  clickToUpload: string;
  fileTypes: string;
  cancel: string;
  uploading: string;
  uploadAndProcess: string;
  all: string;
  pending: string;
  indexed: string;
  failed: string;
  tableDocumentTitle: string;
  tableType: string;
  tableCanton: string;
  tableStatus: string;
  tableLastUpdated: string;
  tableActions: string;
  openMenu: string;
  actions: string;
  approve: string;
  viewChunks: string;
  viewContent: string;
  downloadDocument: string;
  viewError: string;
  reindex: string;
  deleteDocument: string;
  noSearchResults: string;
  noCategoryResults: string;
  chunksTitle: string;
  chunksDescription: string;
  noChunks: string;
  totalDocuments: string;
  totalDocumentsDesc: string;
  indexedChunks: string;
  indexedChunksDesc: string;
  pendingFailed: string;
  pendingFailedDesc: string;
  databaseHealth: string;
  databaseHealthDesc: string;
  errorTitle: string;
  fetchDocsFailed: string;
  invalidFileTypeTitle: string;
  invalidFileTypeDescription: string;
  noFileSelectedTitle: string;
  noFileSelectedDescription: string;
  uploadCompleteTitle: string;
  uploadCompleteDescription: string;
  processingCompleteTitle: string;
  processingCompleteDescription: string;
  processingFailedTitle: string;
  fetchChunksFailed: string;
  approveSuccessTitle: string;
  approveSuccessDescription: string;
  approveFailedTitle: string;
  approveFailedDescription: string;
  bulkApprove: string;
  bulkDelete: string;
  selectedCount: string;
  selectAll: string;
  deselectAll: string;
  bulkApproveSuccess: string,
  bulkDeleteSuccess: string;
  confirmDeleteTitle: string;
  confirmDeleteDescription: string;
}> = {
  en: {
    pageTitle: 'Legal Database', pageSubtitle: 'Manage the legal documents that power the AI assistant.',
    corpusTitle: 'Legal Document Corpus', corpusDescription: 'The collection of documents used by the RAG system.',
    searchPlaceholder: 'Search documents...', uploadDocument: 'Upload Document', uploadTitle: 'Upload New Legal Document', uploadDescription: 'Upload a PDF or Word document to be indexed for the AI assistant.',
    documentTitle: 'Document Title', documentType: 'Document Type', canton: 'Canton', selectCanton: "Select a canton or 'federal'", federal: 'Federal',
    documentFile: 'Document File', clickToUpload: 'Click to upload or drag and drop', fileTypes: 'PDF or DOCX (MAX. 10MB)',
    cancel: 'Cancel', uploading: 'Uploading...', uploadAndProcess: 'Upload & Process',
    all: 'All', pending: 'Pending', indexed: 'Indexed', failed: 'Failed',
    tableDocumentTitle: 'Document Title', tableType: 'Type', tableCanton: 'Canton', tableStatus: 'Status', tableLastUpdated: 'Last Updated', tableActions: 'Actions',
    openMenu: 'Open menu', actions: 'Actions', approve: 'Approve', viewChunks: 'View Chunks', viewContent: 'View Content', downloadDocument: 'Download Document',
    viewError: 'View Error', reindex: 'Re-index', deleteDocument: 'Delete Document',
    noSearchResults: 'No documents match your search.', noCategoryResults: 'No documents found in this category.',
    chunksTitle: 'Document Chunks:', chunksDescription: 'The extracted text segments from the document, ready for the AI to query.', noChunks: 'No chunks found for this document.',
    totalDocuments: 'Total Documents', totalDocumentsDesc: 'Number of documents in the database.',
    indexedChunks: 'Indexed Chunks', indexedChunksDesc: 'Total queryable text segments.',
    pendingFailed: 'Pending / Failed', pendingFailedDesc: 'Docs for review or that failed indexing.',
    databaseHealth: 'Database Health', databaseHealthDesc: 'Based on successful indexing and queries.',
    errorTitle: 'Error', fetchDocsFailed: 'Could not fetch legal documents.',
    invalidFileTypeTitle: 'Invalid File Type', invalidFileTypeDescription: 'Please upload a PDF or DOCX file.',
    noFileSelectedTitle: 'No file selected', noFileSelectedDescription: 'Please select a PDF or Word document to upload.',
    uploadCompleteTitle: 'Upload complete', uploadCompleteDescription: 'Now processing document text...',
    processingCompleteTitle: 'Processing Complete', processingCompleteDescription: 'The document is now pending admin approval.', processingFailedTitle: 'Processing Failed',
    fetchChunksFailed: 'Could not fetch document chunks.', approveSuccessTitle: 'Document Approved', approveSuccessDescription: 'The document is now indexed and available to the AI assistant.',
    approveFailedTitle: 'Approval Failed', approveFailedDescription: 'Could not approve the document.',
    bulkApprove: 'Approve Selected', bulkDelete: 'Delete Selected', selectedCount: 'selected', selectAll: 'Select All', deselectAll: 'Deselect All',
    bulkApproveSuccess: 'Documents approved successfully', bulkDeleteSuccess: 'Documents deleted successfully',
    confirmDeleteTitle: 'Delete Documents?', confirmDeleteDescription: 'This action cannot be undone. All selected documents will be permanently deleted.'
  },
  fr: { pageTitle: 'Base legale', pageSubtitle: 'Gerez les documents legaux utilises par l assistant IA.', corpusTitle: 'Corpus de documents legaux', corpusDescription: 'Collection de documents utilisee par le systeme RAG.', searchPlaceholder: 'Rechercher des documents...', uploadDocument: 'Televerser un document', uploadTitle: 'Televerser un nouveau document legal', uploadDescription: 'Televersez un PDF ou Word pour indexation.', documentTitle: 'Titre du document', documentType: 'Type de document', canton: 'Canton', selectCanton: 'Selectionner un canton ou federal', federal: 'Federal', documentFile: 'Fichier du document', clickToUpload: 'Cliquer pour televerser ou glisser deposer', fileTypes: 'PDF ou DOCX (MAX. 10MB)', cancel: 'Annuler', uploading: 'Televersement...', uploadAndProcess: 'Televerser et traiter', all: 'Tous', pending: 'En attente', indexed: 'Indexes', failed: 'Echec', tableDocumentTitle: 'Titre du document', tableType: 'Type', tableCanton: 'Canton', tableStatus: 'Statut', tableLastUpdated: 'Derniere mise a jour', tableActions: 'Actions', openMenu: 'Ouvrir le menu', actions: 'Actions', approve: 'Approuver', viewChunks: 'Voir les segments', viewContent: 'Voir le contenu', downloadDocument: 'Telecharger le document', viewError: 'Voir l erreur', reindex: 'Re-indexer', deleteDocument: 'Supprimer le document', noSearchResults: 'Aucun document ne correspond a votre recherche.', noCategoryResults: 'Aucun document trouve dans cette categorie.', chunksTitle: 'Segments du document :', chunksDescription: 'Segments de texte extraits du document pour l IA.', noChunks: 'Aucun segment trouve pour ce document.', totalDocuments: 'Documents totaux', totalDocumentsDesc: 'Nombre de documents dans la base.', indexedChunks: 'Segments indexes', indexedChunksDesc: 'Nombre total de segments interrogeables.', pendingFailed: 'En attente / Echec', pendingFailedDesc: 'Documents a verifier ou en echec.', databaseHealth: 'Sante de la base', databaseHealthDesc: 'Base sur indexation et requetes reussies.', errorTitle: 'Erreur', fetchDocsFailed: 'Impossible de recuperer les documents legaux.', invalidFileTypeTitle: 'Type de fichier invalide', invalidFileTypeDescription: 'Veuillez televerser un fichier PDF ou DOCX.', noFileSelectedTitle: 'Aucun fichier selectionne', noFileSelectedDescription: 'Veuillez selectionner un PDF ou Word a televerser.', uploadCompleteTitle: 'Televersement termine', uploadCompleteDescription: 'Traitement du texte en cours...', processingCompleteTitle: 'Traitement termine', processingCompleteDescription: 'Le document est maintenant en attente d approbation admin.', processingFailedTitle: 'Echec du traitement', fetchChunksFailed: 'Impossible de recuperer les segments du document.', approveSuccessTitle: 'Document approuve', approveSuccessDescription: 'Le document est maintenant indexe et disponible pour l assistant IA.', approveFailedTitle: 'Echec de l approbation', approveFailedDescription: 'Impossible d approuver le document.' },
  de: { pageTitle: 'Rechtsdatenbank', pageSubtitle: 'Verwalten Sie die Rechtsdokumente fuer den KI Assistenten.', corpusTitle: 'Rechtsdokument Korpus', corpusDescription: 'Dokumentsammlung fuer das RAG System.', searchPlaceholder: 'Dokumente suchen...', uploadDocument: 'Dokument hochladen', uploadTitle: 'Neues Rechtsdokument hochladen', uploadDescription: 'Laden Sie ein PDF oder Word Dokument zur Indexierung hoch.', documentTitle: 'Dokumenttitel', documentType: 'Dokumenttyp', canton: 'Kanton', selectCanton: 'Kanton oder federal waehlen', federal: 'Federal', documentFile: 'Dokumentdatei', clickToUpload: 'Zum Hochladen klicken oder Datei ablegen', fileTypes: 'PDF oder DOCX (MAX. 10MB)', cancel: 'Abbrechen', uploading: 'Wird hochgeladen...', uploadAndProcess: 'Hochladen und verarbeiten', all: 'Alle', pending: 'Ausstehend', indexed: 'Indexiert', failed: 'Fehlgeschlagen', tableDocumentTitle: 'Dokumenttitel', tableType: 'Typ', tableCanton: 'Kanton', tableStatus: 'Status', tableLastUpdated: 'Zuletzt aktualisiert', tableActions: 'Aktionen', openMenu: 'Menue oeffnen', actions: 'Aktionen', approve: 'Freigeben', viewChunks: 'Segmente anzeigen', viewContent: 'Inhalt anzeigen', downloadDocument: 'Dokument herunterladen', viewError: 'Fehler anzeigen', reindex: 'Neu indexieren', deleteDocument: 'Dokument loeschen', noSearchResults: 'Keine Dokumente entsprechen der Suche.', noCategoryResults: 'Keine Dokumente in dieser Kategorie gefunden.', chunksTitle: 'Dokumentsegmente:', chunksDescription: 'Extrahierte Textsegmente des Dokuments fuer KI Abfragen.', noChunks: 'Keine Segmente fuer dieses Dokument gefunden.', totalDocuments: 'Gesamtdokumente', totalDocumentsDesc: 'Anzahl der Dokumente in der Datenbank.', indexedChunks: 'Indexierte Segmente', indexedChunksDesc: 'Gesamtzahl abfragbarer Textsegmente.', pendingFailed: 'Ausstehend / Fehlgeschlagen', pendingFailedDesc: 'Dokumente zur Pruefung oder mit Fehler.', databaseHealth: 'Datenbankzustand', databaseHealthDesc: 'Basiert auf erfolgreicher Indexierung und Abfragen.', errorTitle: 'Fehler', fetchDocsFailed: 'Rechtsdokumente konnten nicht geladen werden.', invalidFileTypeTitle: 'Ungueltiger Dateityp', invalidFileTypeDescription: 'Bitte eine PDF oder DOCX Datei hochladen.', noFileSelectedTitle: 'Keine Datei ausgewaehlt', noFileSelectedDescription: 'Bitte waehlen Sie ein PDF oder Word Dokument aus.', uploadCompleteTitle: 'Upload abgeschlossen', uploadCompleteDescription: 'Dokumenttext wird verarbeitet...', processingCompleteTitle: 'Verarbeitung abgeschlossen', processingCompleteDescription: 'Das Dokument wartet jetzt auf Admin Freigabe.', processingFailedTitle: 'Verarbeitung fehlgeschlagen', fetchChunksFailed: 'Dokumentsegmente konnten nicht geladen werden.', approveSuccessTitle: 'Dokument freigegeben', approveSuccessDescription: 'Das Dokument ist nun indexiert und fuer den KI Assistenten verfuegbar.', approveFailedTitle: 'Freigabe fehlgeschlagen', approveFailedDescription: 'Dokument konnte nicht freigegeben werden.' },
  it: { pageTitle: 'Database legale', pageSubtitle: 'Gestisci i documenti legali usati dall assistente IA.', corpusTitle: 'Corpus documenti legali', corpusDescription: 'Raccolta documenti usata dal sistema RAG.', searchPlaceholder: 'Cerca documenti...', uploadDocument: 'Carica documento', uploadTitle: 'Carica nuovo documento legale', uploadDescription: 'Carica un PDF o Word da indicizzare.', documentTitle: 'Titolo documento', documentType: 'Tipo documento', canton: 'Cantone', selectCanton: 'Seleziona un cantone o federal', federal: 'Federal', documentFile: 'File documento', clickToUpload: 'Clicca per caricare o trascina', fileTypes: 'PDF o DOCX (MAX. 10MB)', cancel: 'Annulla', uploading: 'Caricamento...', uploadAndProcess: 'Carica e processa', all: 'Tutti', pending: 'In attesa', indexed: 'Indicizzati', failed: 'Falliti', tableDocumentTitle: 'Titolo documento', tableType: 'Tipo', tableCanton: 'Cantone', tableStatus: 'Stato', tableLastUpdated: 'Ultimo aggiornamento', tableActions: 'Azioni', openMenu: 'Apri menu', actions: 'Azioni', approve: 'Approva', viewChunks: 'Visualizza segmenti', viewContent: 'Visualizza contenuto', downloadDocument: 'Scarica documento', viewError: 'Visualizza errore', reindex: 'Re-indicizza', deleteDocument: 'Elimina documento', noSearchResults: 'Nessun documento corrisponde alla ricerca.', noCategoryResults: 'Nessun documento trovato in questa categoria.', chunksTitle: 'Segmenti documento:', chunksDescription: 'Segmenti di testo estratti dal documento, pronti per la query IA.', noChunks: 'Nessun segmento trovato per questo documento.', totalDocuments: 'Documenti totali', totalDocumentsDesc: 'Numero di documenti nel database.', indexedChunks: 'Segmenti indicizzati', indexedChunksDesc: 'Totale segmenti testuali interrogabili.', pendingFailed: 'In attesa / Falliti', pendingFailedDesc: 'Documenti da revisionare o con errore.', databaseHealth: 'Salute database', databaseHealthDesc: 'Basata su indicizzazione e query riuscite.', errorTitle: 'Errore', fetchDocsFailed: 'Impossibile recuperare i documenti legali.', invalidFileTypeTitle: 'Tipo file non valido', invalidFileTypeDescription: 'Carica un file PDF o DOCX.', noFileSelectedTitle: 'Nessun file selezionato', noFileSelectedDescription: 'Seleziona un documento PDF o Word da caricare.', uploadCompleteTitle: 'Caricamento completato', uploadCompleteDescription: 'Ora elaboro il testo del documento...', processingCompleteTitle: 'Elaborazione completata', processingCompleteDescription: 'Il documento e ora in attesa di approvazione admin.', processingFailedTitle: 'Elaborazione non riuscita', fetchChunksFailed: 'Impossibile recuperare i segmenti del documento.', approveSuccessTitle: 'Documento approvato', approveSuccessDescription: 'Il documento e ora indicizzato e disponibile per l assistente IA.', approveFailedTitle: 'Approvazione non riuscita', approveFailedDescription: 'Impossibile approvare il documento.' },
  es: { pageTitle: 'Base legal', pageSubtitle: 'Gestiona los documentos legales que alimentan al asistente IA.', corpusTitle: 'Corpus de documentos legales', corpusDescription: 'Coleccion de documentos usada por el sistema RAG.', searchPlaceholder: 'Buscar documentos...', uploadDocument: 'Subir documento', uploadTitle: 'Subir nuevo documento legal', uploadDescription: 'Sube un PDF o Word para indexarlo en el asistente IA.', documentTitle: 'Titulo del documento', documentType: 'Tipo de documento', canton: 'Canton', selectCanton: 'Seleccionar canton o federal', federal: 'Federal', documentFile: 'Archivo del documento', clickToUpload: 'Haz clic para subir o arrastra y suelta', fileTypes: 'PDF o DOCX (MAX. 10MB)', cancel: 'Cancelar', uploading: 'Subiendo...', uploadAndProcess: 'Subir y procesar', all: 'Todas', pending: 'Pendientes', indexed: 'Indexados', failed: 'Fallidos', tableDocumentTitle: 'Titulo del documento', tableType: 'Tipo', tableCanton: 'Canton', tableStatus: 'Estado', tableLastUpdated: 'Ultima actualizacion', tableActions: 'Acciones', openMenu: 'Abrir menu', actions: 'Acciones', approve: 'Aprobar', viewChunks: 'Ver bloques', viewContent: 'Ver contenido', downloadDocument: 'Descargar documento', viewError: 'Ver error', reindex: 'Reindexar', deleteDocument: 'Eliminar documento', noSearchResults: 'Ningun documento coincide con tu busqueda.', noCategoryResults: 'No se encontraron documentos en esta categoria.', chunksTitle: 'Bloques del documento:', chunksDescription: 'Segmentos de texto extraidos del documento listos para consulta IA.', noChunks: 'No se encontraron bloques para este documento.', totalDocuments: 'Documentos totales', totalDocumentsDesc: 'Numero de documentos en la base.', indexedChunks: 'Bloques indexados', indexedChunksDesc: 'Total de segmentos de texto consultables.', pendingFailed: 'Pendientes / Fallidos', pendingFailedDesc: 'Documentos para revisar o con error de indexacion.', databaseHealth: 'Salud de la base', databaseHealthDesc: 'Basado en indexacion y consultas exitosas.', errorTitle: 'Error', fetchDocsFailed: 'No se pudieron obtener los documentos legales.', invalidFileTypeTitle: 'Tipo de archivo no valido', invalidFileTypeDescription: 'Sube un archivo PDF o DOCX.', noFileSelectedTitle: 'Ningun archivo seleccionado', noFileSelectedDescription: 'Selecciona un documento PDF o Word para subir.', uploadCompleteTitle: 'Carga completada', uploadCompleteDescription: 'Procesando ahora el texto del documento...', processingCompleteTitle: 'Procesamiento completado', processingCompleteDescription: 'El documento ahora esta pendiente de aprobacion admin.', processingFailedTitle: 'Procesamiento fallido', fetchChunksFailed: 'No se pudieron obtener los bloques del documento.', approveSuccessTitle: 'Documento aprobado', approveSuccessDescription: 'El documento ahora esta indexado y disponible para el asistente IA.', approveFailedTitle: 'Aprobacion fallida', approveFailedDescription: 'No se pudo aprobar el documento.' },
};

const getStatusBadgeVariant = (status: DocumentStatus) => {
  switch (status) {
    case "Indexed":
      return { variant: "default" as const };
    case "Processing":
      return { variant: "secondary" as const };
    case "Pending Approval":
       return { variant: "default" as const, className: "bg-yellow-500/80 text-yellow-50 hover:bg-yellow-500/70" };
    case "Failed":
      return { variant: "destructive" as const };
    default:
      return { variant: "outline" as const };
  }
};

const uploadFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  type: z.string().min(3, 'Type is required (e.g., "Federal Law", "Ordinance").'),
  canton: z.string({ required_error: 'Please select a canton.' }),
});
type UploadFormValues = z.infer<typeof uploadFormSchema>;


export default function LegalDatabasePage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewedDoc, setViewedDoc] = useState<LegalDocument | null>(null);
  const [docChunks, setDocChunks] = useState<Chunk[]>([]);
  const [isChunksLoading, setIsChunksLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);


  const { toast } = useToast();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: { title: '', type: '', canton: 'federal' },
  });

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(firestore, 'legal_documents'), orderBy('lastUpdated', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<LegalDocument, 'id'>),
      }));
      setDocuments(docs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching legal documents:", error);
      toast({ title: ui.errorTitle, description: ui.fetchDocsFailed, variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, ui.errorTitle, ui.fetchDocsFailed]);
  
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const pendingDocs = filteredDocuments.filter(d => d.status === 'Pending Approval');
  const indexedDocs = filteredDocuments.filter(d => d.status === 'Indexed');
  const failedDocs = filteredDocuments.filter(d => d.status === 'Failed');


  const kpiData = [
    {
      title: "Total Documents",
      value: documents.length.toString(),
      description: ui.totalDocumentsDesc,
    },
    {
      title: ui.indexedChunks,
      value: documents.filter(d => d.status === 'Indexed').reduce((acc, d) => acc + d.chunks, 0).toLocaleString(),
      description: ui.indexedChunksDesc,
    },
    {
      title: ui.pendingFailed,
      value: `${pendingDocs.length} / ${failedDocs.length}`,
      description: ui.pendingFailedDesc,
    },
    {
      title: ui.databaseHealth,
      value: "99.8%",
      description: ui.databaseHealthDesc,
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFileToUpload(file);
      } else {
        toast({ title: ui.invalidFileTypeTitle, description: ui.invalidFileTypeDescription, variant: "destructive" });
      }
    }
  };

  const handleProcessUpload = async (values: UploadFormValues) => {
    if (!fileToUpload) {
      toast({ title: ui.noFileSelectedTitle, description: ui.noFileSelectedDescription, variant: 'destructive' });
      return;
    }

    setIsIndexing(true);
    setUploadProgress(0);

    try {
      // 1. Upload file to Firebase Storage
      const storageRef = ref(storage, `legal_uploads/${Date.now()}_${fileToUpload.name}`);
      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }
      );

      await uploadTask; // Wait for upload to complete

      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

      // 2. Create the initial document in Firestore with "Processing" status
      toast({ title: ui.uploadCompleteTitle, description: ui.uploadCompleteDescription });
      
      const docRef = await addDoc(collection(firestore, 'legal_documents'), {
        title: values.title,
        type: values.type,
        canton: values.canton,
        status: 'Processing',
        chunks: 0,
        lastUpdated: serverTimestamp(),
        storagePath: uploadTask.snapshot.ref.fullPath,
        downloadURL: downloadURL,
        originalFileName: fileToUpload.name,
      });

      // 3. Call the Genkit flow to process and index the document
      await indexDocument({
        documentId: docRef.id,
        downloadURL: downloadURL,
        contentType: fileToUpload.type,
      });

      toast({
        title: ui.processingCompleteTitle,
        description: ui.processingCompleteDescription,
      });

    } catch (error: any) {
      console.error("Error in upload/indexing process:", error);
      toast({
        title: ui.processingFailedTitle,
        description: error.message || "The document was uploaded, but text processing failed.",
        variant: "destructive",
      });
      // The flow itself handles updating the doc status to "Failed"
    } finally {
      // Reset form state
      setIsUploadDialogOpen(false);
      form.reset();
      setFileToUpload(null);
      setIsIndexing(false);
      setUploadProgress(0);
    }
  };

  const handleViewChunks = async (doc: LegalDocument) => {
    setViewedDoc(doc);
    setIsChunksLoading(true);
    try {
      const chunksQuery = query(
        collection(firestore, 'legal_documents', doc.id, 'chunks'),
        orderBy('chunkNumber')
      );
      const chunksSnapshot = await getDocs(chunksQuery);
      const chunksData = chunksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Chunk[];
      setDocChunks(chunksData);
    } catch (error) {
      console.error("Error fetching chunks:", error);
      toast({
        title: ui.errorTitle,
        description: ui.fetchChunksFailed,
        variant: "destructive"
      });
    } finally {
      setIsChunksLoading(false);
    }
  };
  
  const handleApproveDocument = async (docId: string) => {
    const docRef = doc(firestore, 'legal_documents', docId);
    try {
      await updateDoc(docRef, { 
        status: 'Indexed',
        lastUpdated: serverTimestamp() 
      });
      toast({
        title: ui.approveSuccessTitle,
        description: ui.approveSuccessDescription,
      });
      logSystemEvent('INFO', 'Database', `Legal document approved: ${docId}`, {docId});
    } catch (error) {
      console.error("Error approving document:", error);
      toast({
        title: ui.approveFailedTitle,
        description: ui.approveFailedDescription,
        variant: "destructive"
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedDocs.size === 0) return;
    setIsBulkActionLoading(true);
    try {
      const updatePromises = Array.from(selectedDocs).map(docId => 
        updateDoc(doc(firestore, 'legal_documents', docId), {
          status: 'Indexed',
          lastUpdated: serverTimestamp()
        })
      );
      await Promise.all(updatePromises);
      toast({
        title: ui.approveSuccessTitle,
        description: ui.bulkApproveSuccess,
      });
      logSystemEvent('INFO', 'Database', `Bulk approved ${selectedDocs.size} documents`, { count: selectedDocs.size });
      setSelectedDocs(new Set());
    } catch (error) {
      console.error("Error bulk approving documents:", error);
      toast({
        title: ui.approveFailedTitle,
        description: ui.approveFailedDescription,
        variant: "destructive"
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    
    const confirmed = window.confirm(
      `${ui.confirmDeleteDescription}\n\n${selectedDocs.size} ${ui.selectedCount}`
    );
    
    if (!confirmed) return;
    
    setIsBulkActionLoading(true);
    try {
      const deletePromises = Array.from(selectedDocs).map(docId => 
        deleteDoc(doc(firestore, 'legal_documents', docId))
      );
      await Promise.all(deletePromises);
      toast({
        title: ui.bulkDeleteSuccess,
        variant: "default"
      });
      logSystemEvent('INFO', 'Database', `Bulk deleted ${selectedDocs.size} documents`, { count: selectedDocs.size });
      setSelectedDocs(new Set());
    } catch (error) {
      console.error("Error bulk deleting documents:", error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the selected documents.',
        variant: "destructive"
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const toggleSelectDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const toggleSelectAll = (docs: LegalDocument[]) => {
    if (selectedDocs.size === docs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(docs.map(d => d.id)));
    }
  };

  const pendingSelectedCount = selectedDocs.size > 0 && Array.from(selectedDocs).every(id => {
    const doc = documents.find(d => d.id === id);
    return doc?.status === 'Pending Approval';
  }) ? selectedDocs.size : 0;

  const canBulkApprove = selectedDocs.size > 0 && Array.from(selectedDocs).some(id => {
    const doc = documents.find(d => d.id === id);
    return doc?.status === 'Pending Approval';
  });

const LegalDocumentTable = ({ docs, isLoading }: { docs: LegalDocument[], isLoading: boolean }) => (
    <Table>
        <TableHeader>
        <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedDocs.size === docs.length && docs.length > 0}
                onCheckedChange={() => toggleSelectAll(docs)}
              />
            </TableHead>
            <TableHead>{ui.tableDocumentTitle}</TableHead>
            <TableHead className="hidden md:table-cell">{ui.tableType}</TableHead>
            <TableHead className="hidden lg:table-cell">{ui.tableCanton}</TableHead>
            <TableHead>{ui.tableStatus}</TableHead>
            <TableHead className="hidden lg:table-cell">{ui.tableLastUpdated}</TableHead>
            <TableHead className="text-right">{ui.tableActions}</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-8" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
            <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
        ))}
        {!isLoading && docs.map((doc) => (
            <TableRow key={doc.id} data-selected={selectedDocs.has(doc.id)} className={selectedDocs.has(doc.id) ? "bg-primary/5" : undefined}>
            <TableCell>
              <Checkbox
                checked={selectedDocs.has(doc.id)}
                onCheckedChange={() => toggleSelectDoc(doc.id)}
              />
            </TableCell>
            <TableCell className="font-medium">{doc.title}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">{doc.type}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">{doc.canton}</TableCell>
            <TableCell>
                <Badge {...getStatusBadgeVariant(doc.status as DocumentStatus)}>
                {doc.status}
                </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">
                {doc.lastUpdated ? format(new Date(doc.lastUpdated.seconds * 1000), 'yyyy-MM-dd HH:mm') : '-'}
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
                    {doc.status === 'Pending Approval' && (
                        <DropdownMenuItem onClick={() => handleApproveDocument(doc.id)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            {ui.approve}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleViewChunks(doc)} disabled={doc.status !== 'Indexed' && doc.status !== 'Pending Approval' || !doc.chunks}>
                        <PackageOpen className="mr-2 h-4 w-4" />
                        {ui.viewChunks} ({doc.chunks || 0})
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild disabled={!doc.downloadURL}>
                        <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" />
                            {ui.viewContent}
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild disabled={!doc.downloadURL}>
                        <a href={doc.downloadURL} download>
                            <Download className="mr-2 h-4 w-4" />
                            {ui.downloadDocument}
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {doc.status === "Failed" && (
                    <DropdownMenuItem disabled>
                        <FileWarning className="mr-2 h-4 w-4 text-yellow-500" />
                        {ui.viewError}
                    </DropdownMenuItem>
                    )}
                    <DropdownMenuItem disabled>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {ui.reindex}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" disabled>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {ui.deleteDocument}
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
            </TableRow>
        ))}
        {!isLoading && docs.length === 0 && (
            <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
                {searchTerm ? ui.noSearchResults : ui.noCategoryResults}
            </TableCell>
            </TableRow>
        )}
        </TableBody>
    </Table>
  );


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
        <p className="text-muted-foreground">
          {ui.pageSubtitle}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle>{ui.corpusTitle}</CardTitle>
              <CardDescription>
                {ui.corpusDescription}
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
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    {ui.uploadDocument}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{ui.uploadTitle}</DialogTitle>
                    <DialogDescription>
                      {ui.uploadDescription}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleProcessUpload)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{ui.documentTitle}</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Swiss Code of Obligations" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{ui.documentType}</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Federal Law" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="canton"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ui.canton}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={ui.selectCanton} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="federal">{ui.federal}</SelectItem>
                                {swissCantons.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormItem>
                        <FormLabel>{ui.documentFile}</FormLabel>
                        <FormControl>
                           <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                        {fileToUpload ? (
                                            <p className="text-sm text-muted-foreground font-semibold">{fileToUpload.name}</p>
                                        ) : (
                                            <>
                                            <p className="mb-2 text-sm text-muted-foreground">{ui.clickToUpload}</p>
                                            <p className="text-xs text-muted-foreground">{ui.fileTypes}</p>
                                            </>
                                        )}
                                    </div>
                                    <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                                </label>
                            </div>
                        </FormControl>
                         {isIndexing && <Progress value={uploadProgress} className="w-full mt-2" />}
                         <FormMessage />
                      </FormItem>

                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsUploadDialogOpen(false)}>{ui.cancel}</Button>
                        <Button type="submit" disabled={isIndexing || !fileToUpload}>
                          {isIndexing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {ui.uploading}
                            </>
                          ) : ui.uploadAndProcess}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {selectedDocs.size > 0 && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => setSelectedDocs(new Set())}
                />
                <span>{selectedDocs.size} {ui.selectedCount}</span>
              </div>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={isBulkActionLoading || !canBulkApprove}
                >
                  {isBulkActionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileCheck className="mr-2 h-4 w-4 text-green-600" />
                  )}
                  {ui.bulkApprove}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkActionLoading || selectedDocs.size === 0}
                  className="text-destructive hover:text-destructive"
                >
                  {isBulkActionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileX className="mr-2 h-4 w-4" />
                  )}
                  {ui.bulkDelete}
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-lg">
                    <TabsTrigger value="all">{ui.all} ({filteredDocuments.length})</TabsTrigger>
                    <TabsTrigger value="pending">{ui.pending} ({pendingDocs.length})</TabsTrigger>
                    <TabsTrigger value="indexed">{ui.indexed} ({indexedDocs.length})</TabsTrigger>
                    <TabsTrigger value="failed">{ui.failed} ({failedDocs.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-4">
                    <LegalDocumentTable docs={filteredDocuments} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                    <LegalDocumentTable docs={pendingDocs} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="indexed" className="mt-4">
                    <LegalDocumentTable docs={indexedDocs} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="failed" className="mt-4">
                    <LegalDocumentTable docs={failedDocs} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={!!viewedDoc} onOpenChange={(isOpen) => !isOpen && setViewedDoc(null)}>
          <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                    <DialogTitle>{ui.chunksTitle} {viewedDoc?.title}</DialogTitle>
                  <DialogDescription>
                      {ui.chunksDescription}
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] rounded-md border p-4">
                {isChunksLoading ? (
                  <div className="space-y-4">
                    {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {docChunks.length > 0 ? docChunks.map(chunk => (
                       <div key={chunk.id} className="text-sm p-3 border rounded-md bg-secondary/50">
                          <p className="font-mono text-xs text-muted-foreground mb-2">CHUNK #{chunk.chunkNumber}</p>
                          <p>{chunk.text}</p>
                       </div>
                    )) : (
                       <div className="flex items-center justify-center h-full text-muted-foreground">
                         <p>{ui.noChunks}</p>
                       </div>
                    )}
                  </div>
                )}
              </ScrollArea>
          </DialogContent>
      </Dialog>
    </div>
  );
}
