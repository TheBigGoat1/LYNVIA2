'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  FileText,
  Loader2,
  Eye,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { convertHtmlToDocx } from '@/ai/flows/document-converter-flow';
import { plainTextToDocxHtml } from '@/lib/document-export-html';
import { useLocale } from 'next-intl';
import { resolveSwissLocale } from '@/lib/format';

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (['fr', 'de', 'it', 'es'].includes(normalized)) return normalized as SupportedLocale;
  return 'en';
};

type MyDocument = {
  id: string;
  name: string;
  templateType: string;
  categoryTitle?: string;
  content?: string;
  status: 'Draft' | 'Pending Review' | 'Approved' | 'Rejected';
  createdAt: { seconds: number; nanoseconds: number } | null;
  finalFileUrl?: string;
  finalFileName?: string;
};

const UI_BY_LOCALE: Record<SupportedLocale, Record<string, string>> = {
  en: {
    title: 'My Documents',
    subtitle: 'All your generated documents. Download, re-download, or track review progress here.',
    empty: 'No documents yet. Generate your first document in the Document Generator.',
    goGenerate: 'Document Generator',
    name: 'Document',
    template: 'Template',
    date: 'Date',
    status: 'Status',
    actions: 'Actions',
    draft: 'Downloaded',
    pendingReview: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    viewDoc: 'View Document',
    downloadPdf: 'Download PDF',
    downloadWord: 'Download Word (.docx)',
    downloadFinal: 'Download Final Version',
    preparingPdf: 'Preparing PDF…',
    preparingWord: 'Preparing Word document…',
    pdfError: 'Could not generate PDF.',
    wordError: 'Could not generate Word document.',
    noContent: 'No content available for this document.',
    close: 'Close',
    orderProgress: 'Review Progress',
    step1: 'Submitted',
    step2: 'Under Review',
    step3: 'Final Ready',
    errorTitle: 'Error',
  },
  fr: {
    title: 'Mes documents',
    subtitle: 'Tous vos documents générés. Téléchargez, re-téléchargez ou suivez la révision ici.',
    empty: 'Aucun document. Générez votre premier document dans le Générateur.',
    goGenerate: 'Générateur de documents',
    name: 'Document',
    template: 'Modèle',
    date: 'Date',
    status: 'Statut',
    actions: 'Actions',
    draft: 'Téléchargé',
    pendingReview: 'En révision',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    viewDoc: 'Voir le document',
    downloadPdf: 'Télécharger PDF',
    downloadWord: 'Télécharger Word (.docx)',
    downloadFinal: 'Télécharger la version finale',
    preparingPdf: 'Préparation PDF…',
    preparingWord: 'Préparation Word…',
    pdfError: 'Impossible de générer le PDF.',
    wordError: 'Impossible de générer le Word.',
    noContent: 'Aucun contenu disponible.',
    close: 'Fermer',
    orderProgress: 'Suivi de révision',
    step1: 'Soumis',
    step2: 'En révision',
    step3: 'Prêt',
    errorTitle: 'Erreur',
  },
  de: {
    title: 'Meine Dokumente',
    subtitle: 'Alle generierten Dokumente. Herunterladen, erneut herunterladen oder Prüfstatus verfolgen.',
    empty: 'Noch keine Dokumente. Erstellen Sie Ihr erstes Dokument im Generator.',
    goGenerate: 'Dokumentengenerator',
    name: 'Dokument',
    template: 'Vorlage',
    date: 'Datum',
    status: 'Status',
    actions: 'Aktionen',
    draft: 'Heruntergeladen',
    pendingReview: 'In Prüfung',
    approved: 'Freigegeben',
    rejected: 'Abgelehnt',
    viewDoc: 'Dokument anzeigen',
    downloadPdf: 'PDF herunterladen',
    downloadWord: 'Word (.docx) herunterladen',
    downloadFinal: 'Finale Version herunterladen',
    preparingPdf: 'PDF wird vorbereitet…',
    preparingWord: 'Word wird vorbereitet…',
    pdfError: 'PDF konnte nicht erstellt werden.',
    wordError: 'Word konnte nicht erstellt werden.',
    noContent: 'Kein Inhalt verfügbar.',
    close: 'Schliessen',
    orderProgress: 'Prüfstatus',
    step1: 'Eingereicht',
    step2: 'In Prüfung',
    step3: 'Fertig',
    errorTitle: 'Fehler',
  },
  it: {
    title: 'I miei documenti',
    subtitle: 'Tutti i documenti generati. Scarica, riscarica o segui la revisione.',
    empty: 'Nessun documento. Genera il primo nel Generatore.',
    goGenerate: 'Generatore di documenti',
    name: 'Documento',
    template: 'Modello',
    date: 'Data',
    status: 'Stato',
    actions: 'Azioni',
    draft: 'Scaricato',
    pendingReview: 'In revisione',
    approved: 'Approvato',
    rejected: 'Rifiutato',
    viewDoc: 'Visualizza documento',
    downloadPdf: 'Scarica PDF',
    downloadWord: 'Scarica Word (.docx)',
    downloadFinal: 'Scarica versione finale',
    preparingPdf: 'Preparazione PDF…',
    preparingWord: 'Preparazione Word…',
    pdfError: 'Impossibile generare PDF.',
    wordError: 'Impossibile generare Word.',
    noContent: 'Nessun contenuto disponibile.',
    close: 'Chiudi',
    orderProgress: 'Stato revisione',
    step1: 'Inviato',
    step2: 'In revisione',
    step3: 'Pronto',
    errorTitle: 'Errore',
  },
  es: {
    title: 'Mis documentos',
    subtitle: 'Todos tus documentos generados. Descarga, re-descarga o sigue la revisión.',
    empty: 'Sin documentos. Genera el primero en el Generador.',
    goGenerate: 'Generador de documentos',
    name: 'Documento',
    template: 'Plantilla',
    date: 'Fecha',
    status: 'Estado',
    actions: 'Acciones',
    draft: 'Descargado',
    pendingReview: 'En revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    viewDoc: 'Ver documento',
    downloadPdf: 'Descargar PDF',
    downloadWord: 'Descargar Word (.docx)',
    downloadFinal: 'Descargar versión final',
    preparingPdf: 'Preparando PDF…',
    preparingWord: 'Preparando Word…',
    pdfError: 'No se pudo generar el PDF.',
    wordError: 'No se pudo generar el Word.',
    noContent: 'Sin contenido disponible.',
    close: 'Cerrar',
    orderProgress: 'Estado de revisión',
    step1: 'Enviado',
    step2: 'En revisión',
    step3: 'Listo',
    errorTitle: 'Error',
  },
};

function StatusBadge({ status, ui }: { status: MyDocument['status']; ui: Record<string, string> }) {
  switch (status) {
    case 'Draft':
      return <Badge variant="secondary">{ui.draft}</Badge>;
    case 'Pending Review':
      return (
        <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-50">
          {ui.pendingReview}
        </Badge>
      );
    case 'Approved':
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">{ui.approved}</Badge>;
    case 'Rejected':
      return <Badge variant="destructive">{ui.rejected}</Badge>;
  }
}

function ReviewProgressBar({ status, ui }: { status: MyDocument['status']; ui: Record<string, string> }) {
  const currentStep = status === 'Pending Review' ? 1 : status === 'Approved' ? 2 : 0;
  const steps = [ui.step1, ui.step2, ui.step3];

  return (
    <div className="flex items-center gap-0 mt-2">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-initial">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                i < currentStep
                  ? 'bg-primary border-primary text-primary-foreground'
                  : i === currentStep
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-muted-foreground/40 text-muted-foreground/60'
              }`}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] whitespace-nowrap ${i <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground/60'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BusinessMyDocumentsPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  const [documents, setDocuments] = useState<MyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<MyDocument | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'users', user.uid, 'documents'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setDocuments(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MyDocument, 'id'>) }))
      );
      setIsLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleDownloadPdf = async (docItem: MyDocument) => {
    if (!docItem.content) {
      toast({ title: ui.errorTitle, description: ui.noContent, variant: 'destructive' });
      return;
    }
    toast({ title: ui.preparingPdf });
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdfDoc = new jsPDF();
      pdfDoc.setFont('Helvetica');
      pdfDoc.setFontSize(10);
      const textLines = pdfDoc.splitTextToSize(docItem.content, 180);
      pdfDoc.text(textLines, 15, 15);
      pdfDoc.save(`${docItem.name.replace(/\s+/g, '_')}.pdf`);
    } catch {
      toast({ variant: 'destructive', title: ui.errorTitle, description: ui.pdfError });
    }
  };

  const handleDownloadWord = async (docItem: MyDocument) => {
    if (!docItem.content) {
      toast({ title: ui.errorTitle, description: ui.noContent, variant: 'destructive' });
      return;
    }
    toast({ title: ui.preparingWord });
    try {
      const { saveAs } = await import('file-saver');
      const htmlString = plainTextToDocxHtml(docItem.content);
      const response = await convertHtmlToDocx({ htmlString });
      const byteCharacters = atob(response.docxBase64);
      const byteArray = new Uint8Array([...byteCharacters].map((c) => c.charCodeAt(0)));
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      saveAs(blob, `${docItem.name.replace(/\s+/g, '_')}.docx`);
    } catch {
      toast({ variant: 'destructive', title: ui.errorTitle, description: ui.wordError });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{ui.title}</h1>
          <p className="text-muted-foreground">{ui.subtitle}</p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <a href={`/${locale}/business/document-generator`}>
            <Sparkles className="mr-2 h-4 w-4" />
            {ui.goGenerate}
          </a>
        </Button>
      </div>

      {/* Document List */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-25" />
            <p>{ui.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((docItem) => (
            <Card key={docItem.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 p-2 rounded-lg bg-primary/10 shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{docItem.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {docItem.templateType}
                        {docItem.createdAt && (
                          <> · {new Date(docItem.createdAt.seconds * 1000).toLocaleDateString(resolveSwissLocale(locale))}</>
                        )}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge status={docItem.status} ui={ui} />
                      </div>

                      {/* Review progress for Pending Review */}
                      {docItem.status === 'Pending Review' && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">{ui.orderProgress}</p>
                          <ReviewProgressBar status={docItem.status} ui={ui} />
                        </div>
                      )}

                      {/* Review progress for Approved */}
                      {docItem.status === 'Approved' && (
                        <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
                          <p className="text-xs font-medium text-muted-foreground mb-2">{ui.orderProgress}</p>
                          <ReviewProgressBar status={docItem.status} ui={ui} />
                          {docItem.finalFileUrl && (
                            <div className="mt-3">
                              <Button size="sm" asChild>
                                <a
                                  href={docItem.finalFileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={docItem.finalFileName}
                                >
                                  <Download className="mr-2 h-3.5 w-3.5" />
                                  {ui.downloadFinal}
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{ui.actions}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{ui.actions}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setViewDoc(docItem)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {ui.viewDoc}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDownloadPdf(docItem)}
                        disabled={!docItem.content}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {ui.downloadPdf}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadWord(docItem)}
                        disabled={!docItem.content}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {ui.downloadWord}
                      </DropdownMenuItem>
                      {docItem.status === 'Approved' && docItem.finalFileUrl && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a
                              href={docItem.finalFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={docItem.finalFileName}
                            >
                              <Download className="mr-2 h-4 w-4 text-green-600" />
                              {ui.downloadFinal}
                            </a>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Document Dialog */}
      <Dialog
        open={!!viewDoc}
        onOpenChange={(open) => {
          if (!open) setViewDoc(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewDoc?.name}</DialogTitle>
            <DialogDescription>{viewDoc?.templateType}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] rounded-md border">
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {viewDoc?.content ?? ui.noContent}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setViewDoc(null)}>
              {ui.close}
            </Button>
            {viewDoc && (
              <>
                <Button variant="secondary" onClick={() => handleDownloadWord(viewDoc)}>
                  {ui.downloadWord}
                </Button>
                <Button onClick={() => handleDownloadPdf(viewDoc)}>
                  {ui.downloadPdf}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
