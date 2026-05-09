
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  Copy,
  Download,
  Save,
  Search,
  Building2,
} from 'lucide-react';

import { useFirebase } from '@/firebase/firebase-provider';
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { aiDocumentGenerator } from '@/ai/flows/ai-document-generator-flow';
import { convertHtmlToDocx } from '@/ai/flows/document-converter-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { type ClaRule, validateNoticePeriodAgainstCla, type NoticePeriodValidationResult } from '@/lib/cla-rules';
import { 
  templateCategories, 
  iconMap, 
  getTotalTemplateCount,
  type Template, 
  type TemplateCategory 
} from '@/data/company-document-templates';
import { useLocale } from 'next-intl';
import { notifyAdmin } from '@/lib/admin-notifications';
import { plainTextToDocxHtml } from '@/lib/document-export-html';
import { resolveSwissLocale } from '@/lib/format';

type SupportedLocale = 'en' | 'fr' | 'de' | 'it' | 'es';

const resolveLocale = (locale: string): SupportedLocale => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'es') return normalized;
  return 'en';
};

const UI_BY_LOCALE: Record<SupportedLocale, Record<string, string>> = {
  en: { generatedSuccess: 'Document generated successfully', generatedSuccessDesc: 'Your document is ready for review.', generationFailed: 'Generation failed', generationFailedDesc: 'AI could not generate the document. Please try again.', saveSubmitted: 'Document submitted', saveSubmittedDesc: 'Your document has been submitted for review.', saveFailed: 'Save failed', saveFailedDesc: 'Could not save the document. Please try again.', copied: 'Copied to clipboard!', downloadingPdf: 'Downloading PDF...', pdfError: 'Could not generate PDF.', preparingWord: 'Preparing Word document...', wordError: 'Could not generate Word document.', pageTitle: 'Business Documents', pageSubtitle: 'Generate legal and business documents. {count} templates available.', searchPlaceholder: 'Search templates...', clearSearch: 'Clear search', noResults: 'No results for', backToCategories: 'Back to categories', backToTemplates: 'Back to templates', categoryLabel: 'Business', requiredInfo: 'Required Information', requiredInfoDesc: 'Fill in the fields to generate your document.', generatedDoc: 'Generated Document', generatedDocDesc: 'Preview your generated document below.', generatedPlaceholder: 'Your document will appear here after generation.', sending: 'Sending...', submitReview: 'Submit for review', copy: 'Copy', download: 'Download', pdfDocument: 'PDF Document', wordDocument: 'Word Document (.docx)', generating: 'Generating...', generateDocument: 'Generate document' },
  fr: { generatedSuccess: 'Document genere avec succes', generatedSuccessDesc: 'Votre document est pret pour revision.', generationFailed: 'Echec de generation', generationFailedDesc: 'L IA n a pas pu generer le document. Veuillez reessayer.', saveSubmitted: 'Document soumis', saveSubmittedDesc: 'Votre document a ete soumis pour revision.', saveFailed: 'Echec de la sauvegarde', saveFailedDesc: 'Impossible de sauvegarder le document. Veuillez reessayer.', copied: 'Copie dans le presse-papiers!', downloadingPdf: 'Telechargement PDF...', pdfError: 'Impossible de generer le PDF.', preparingWord: 'Preparation du document Word...', wordError: 'Impossible de generer le document Word.', pageTitle: 'Documents Entreprises', pageSubtitle: 'Generez vos documents commerciaux et juridiques. {count} modeles disponibles.', searchPlaceholder: 'Rechercher un modele...', clearSearch: 'Effacer la recherche', noResults: 'Aucun resultat pour', backToCategories: 'Retour aux categories', backToTemplates: 'Retour aux modeles', categoryLabel: 'Entreprise', requiredInfo: 'Informations requises', requiredInfoDesc: 'Remplissez les champs pour generer votre document.', generatedDoc: 'Document genere', generatedDocDesc: 'Previsualisez votre document ci-dessous.', generatedPlaceholder: 'Votre document apparaitra ici apres generation.', sending: 'Envoi...', submitReview: 'Soumettre pour revision', copy: 'Copier', download: 'Telecharger', pdfDocument: 'Document PDF', wordDocument: 'Document Word (.docx)', generating: 'Generation en cours...', generateDocument: 'Generer le document' },
  de: { generatedSuccess: 'Dokument erfolgreich erstellt', generatedSuccessDesc: 'Ihr Dokument ist zur Pruefung bereit.', generationFailed: 'Erstellung fehlgeschlagen', generationFailedDesc: 'Die KI konnte das Dokument nicht erstellen. Bitte erneut versuchen.', saveSubmitted: 'Dokument eingereicht', saveSubmittedDesc: 'Ihr Dokument wurde zur Pruefung eingereicht.', saveFailed: 'Speichern fehlgeschlagen', saveFailedDesc: 'Dokument konnte nicht gespeichert werden. Bitte erneut versuchen.', copied: 'In die Zwischenablage kopiert!', downloadingPdf: 'PDF wird heruntergeladen...', pdfError: 'PDF konnte nicht erstellt werden.', preparingWord: 'Word Dokument wird vorbereitet...', wordError: 'Word Dokument konnte nicht erstellt werden.', pageTitle: 'Unternehmensdokumente', pageSubtitle: 'Erstellen Sie Ihre Geschaefts- und Rechtsdokumente. {count} Vorlagen verfuegbar.', searchPlaceholder: 'Vorlage suchen...', clearSearch: 'Suche loeschen', noResults: 'Keine Ergebnisse fuer', backToCategories: 'Zurueck zu Kategorien', backToTemplates: 'Zurueck zu Vorlagen', categoryLabel: 'Unternehmen', requiredInfo: 'Erforderliche Angaben', requiredInfoDesc: 'Fuellen Sie die Felder aus, um Ihr Dokument zu erstellen.', generatedDoc: 'Erstelltes Dokument', generatedDocDesc: 'Vorschau Ihres Dokuments unten.', generatedPlaceholder: 'Ihr Dokument erscheint hier nach der Erstellung.', sending: 'Wird gesendet...', submitReview: 'Zur Pruefung einreichen', copy: 'Kopieren', download: 'Herunterladen', pdfDocument: 'PDF Dokument', wordDocument: 'Word Dokument (.docx)', generating: 'Wird erstellt...', generateDocument: 'Dokument erstellen' },
  it: { generatedSuccess: 'Documento generato con successo', generatedSuccessDesc: 'Il documento e pronto per la revisione.', generationFailed: 'Generazione non riuscita', generationFailedDesc: 'L IA non e riuscita a generare il documento. Riprova.', saveSubmitted: 'Documento inviato', saveSubmittedDesc: 'Il documento e stato inviato per la revisione.', saveFailed: 'Salvataggio non riuscito', saveFailedDesc: 'Impossibile salvare il documento. Riprova.', copied: 'Copiato negli appunti!', downloadingPdf: 'Download PDF in corso...', pdfError: 'Impossibile generare il PDF.', preparingWord: 'Preparazione documento Word...', wordError: 'Impossibile generare il documento Word.', pageTitle: 'Documenti Aziendali', pageSubtitle: 'Genera documenti commerciali e legali. {count} modelli disponibili.', searchPlaceholder: 'Cerca un modello...', clearSearch: 'Cancella ricerca', noResults: 'Nessun risultato per', backToCategories: 'Torna alle categorie', backToTemplates: 'Torna ai modelli', categoryLabel: 'Azienda', requiredInfo: 'Informazioni richieste', requiredInfoDesc: 'Compila i campi per generare il documento.', generatedDoc: 'Documento generato', generatedDocDesc: 'Anteprima del documento qui sotto.', generatedPlaceholder: 'Il documento apparira qui dopo la generazione.', sending: 'Invio...', submitReview: 'Invia per revisione', copy: 'Copia', download: 'Scarica', pdfDocument: 'Documento PDF', wordDocument: 'Documento Word (.docx)', generating: 'Generazione in corso...', generateDocument: 'Genera documento' },
  es: { generatedSuccess: 'Documento generado correctamente', generatedSuccessDesc: 'Tu documento esta listo para revision.', generationFailed: 'Generacion fallida', generationFailedDesc: 'La IA no pudo generar el documento. Intentalo de nuevo.', saveSubmitted: 'Documento enviado', saveSubmittedDesc: 'Tu documento fue enviado para revision.', saveFailed: 'Guardado fallido', saveFailedDesc: 'No se pudo guardar el documento. Intentalo de nuevo.', copied: 'Copiado al portapapeles!', downloadingPdf: 'Descargando PDF...', pdfError: 'No se pudo generar el PDF.', preparingWord: 'Preparando documento Word...', wordError: 'No se pudo generar el documento Word.', pageTitle: 'Documentos Empresariales', pageSubtitle: 'Genera documentos comerciales y legales. {count} plantillas disponibles.', searchPlaceholder: 'Buscar plantilla...', clearSearch: 'Limpiar busqueda', noResults: 'Sin resultados para', backToCategories: 'Volver a categorias', backToTemplates: 'Volver a plantillas', categoryLabel: 'Empresa', requiredInfo: 'Informacion requerida', requiredInfoDesc: 'Completa los campos para generar tu documento.', generatedDoc: 'Documento generado', generatedDocDesc: 'Vista previa de tu documento debajo.', generatedPlaceholder: 'Tu documento aparecera aqui tras la generacion.', sending: 'Enviando...', submitReview: 'Enviar para revision', copy: 'Copiar', download: 'Descargar', pdfDocument: 'Documento PDF', wordDocument: 'Documento Word (.docx)', generating: 'Generando...', generateDocument: 'Generar documento' },
};

type CompanyProfile = {
  companyName?: string;
  companyAddress?: string;
  companyPostalCode?: string;
  companyCity?: string;
  companyIDE?: string;
  canton?: string;
};

type ViewState = 'category-selection' | 'template-selection' | 'form-and-preview';



export default function CompanyDocumentGeneratorPage() {
  const [view, setView] = useState<ViewState>('category-selection');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyCla, setCompanyCla] = useState<ClaRule | null>(null);
  const [noticePeriodWarning, setNoticePeriodWarning] = useState<NoticePeriodValidationResult | null>(null);

  const { user } = useFirebase();
  const { toast } = useToast();
  const locale = resolveLocale(useLocale());
  const ui = UI_BY_LOCALE[locale];

  // Fetch company profile on mount
  useEffect(() => {
    if (user && !companyProfile) {
      const fetchCompanyProfile = async () => {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.companyId) {
                const companyDocRef = doc(firestore, 'companies', data.companyId);
                const companyDocSnap = await getDoc(companyDocRef);
                if (companyDocSnap.exists()) {
                    const companyData = companyDocSnap.data();
                    setCompanyProfile({
                        companyName: companyData.companyName || '',
                        companyAddress: companyData.address || '',
                        companyPostalCode: companyData.postalCode || '',
                        companyCity: companyData.city || '',
                        companyIDE: companyData.ide || '',
                        canton: companyData.canton || '',
                    });
                    // Load CLA stored on the company
                    if (companyData.cla) {
                      setCompanyCla(companyData.cla as ClaRule);
                    }
                }
            }
          }
        } catch (error) {
          console.error('Error fetching company profile:', error);
        }
      };
      fetchCompanyProfile();
    }
  }, [user, companyProfile]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return templateCategories;
    
    const query = searchQuery.toLowerCase();
    return templateCategories.filter(category => 
      category.title.toLowerCase().includes(query) ||
      category.description.toLowerCase().includes(query) ||
      category.templates.some(t => 
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      )
    );
  }, [searchQuery]);

  // Generate document using AI
  const handleGenerate = async (formData: Record<string, any>) => {
    if (!selectedTemplate || !user) return;

    // CLA notice period validation for termination letters
    if (companyCla && formData.noticePeriod && selectedTemplate.id.startsWith('ENT-2')) {
      const yearsOfService = formData.contractDate
        ? Math.max(0, Math.floor((Date.now() - new Date(formData.contractDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
        : 1;
      const npResult = validateNoticePeriodAgainstCla(companyCla, formData.noticePeriod, yearsOfService);
      if (!npResult.isCompliant) {
        setNoticePeriodWarning(npResult);
        // Show warning toast but allow continuation
        toast({
          variant: 'destructive',
          title: 'Notice Period Warning',
          description: npResult.message,
        });
      } else {
        setNoticePeriodWarning(null);
      }
    } else {
      setNoticePeriodWarning(null);
    }

    setIsLoading(true);
    setGeneratedDocument(null);

    // Prepare company data to inject into the template
    const today = new Date();
    const formattedDate = today.toLocaleDateString(resolveSwissLocale(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const senderCompanyName = formData.companyName || companyProfile?.companyName || '[Nom de l\'entreprise]';
    const senderCompanyAddress = formData.companyAddress || companyProfile?.companyAddress || '[Adresse]';
    const senderCompanyPostalCity = `${formData.companyPostalCode || companyProfile?.companyPostalCode || '[Code postal]'} ${formData.companyCity || companyProfile?.companyCity || '[Ville]'}`.trim();
    const senderBlock = [senderCompanyName, senderCompanyAddress, senderCompanyPostalCity].join('\n');

    const enrichedFormData = {
      ...formData,
      // Company information (if not provided in form)
      companyName: senderCompanyName,
      companyAddress: senderCompanyAddress,
      companyPostalCode: formData.companyPostalCode || companyProfile?.companyPostalCode || '[Code postal]',
      companyCity: formData.companyCity || companyProfile?.companyCity || '[Ville]',
      companyIDE: formData.companyIDE || companyProfile?.companyIDE || '[IDE]',
      senderName: senderCompanyName,
      senderAddress: senderCompanyAddress,
      // Date and location
      currentDate: formattedDate,
    };

    try {
      const response = await aiDocumentGenerator({
        templateType: selectedTemplate.title,
        templateText: selectedTemplate.templateText,
        formData: enrichedFormData,
        canton: companyProfile?.canton || 'federal',
        legalContext: `Générez le document en français suisse formel pour une entreprise. Remplacez tous les placeholders [xxx] par les valeurs fournies. Le document doit être professionnel, juridiquement correct et prêt à être utilisé. Respectez les conventions suisses pour les contrats commerciaux.`,
      });

      const aiBody = response.documentContent;
      const normalizedBody = aiBody.toLowerCase();
      const hasSenderName = normalizedBody.includes(String(senderCompanyName).toLowerCase());
      const hasSenderAddress =
        senderCompanyAddress !== '[Adresse]' && normalizedBody.includes(String(senderCompanyAddress).toLowerCase());
      const body = hasSenderName && hasSenderAddress ? aiBody : `${senderBlock}\n\n${aiBody}`;
      // Deterministically replace [Signature] with the company's name
      const signedBody = body.replace(/\[Signature\]/gi, senderCompanyName);
      setGeneratedDocument(signedBody);
      toast({
        title: ui.generatedSuccess,
        description: ui.generatedSuccessDesc,
      });
    } catch (error) {
      console.error('AI Document Generation Error:', error);
      toast({
        variant: 'destructive',
        title: ui.generationFailed,
        description: ui.generationFailedDesc,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save document to Firestore
  const handleSaveDocument = async () => {
    if (!generatedDocument || !user || !selectedTemplate || !selectedCategory) return;
    setIsSaving(true);
    try {
      const userDocSnap = await getDoc(doc(firestore, 'users', user.uid));
      const companyId = userDocSnap.data()?.companyId;

      if (!companyId) {
        throw new Error("User is not associated with a company.");
      }

      await addDoc(collection(firestore, 'users', user.uid, 'documents'), {
              name: `${selectedTemplate.title} - ${new Date().toLocaleDateString(resolveSwissLocale(locale))}`,
        templateId: selectedTemplate.id,
        templateType: selectedTemplate.title,
        categoryId: selectedCategory.id,
        categoryTitle: selectedCategory.title,
        content: generatedDocument,
        status: 'Pending Review',
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || user.email,
        userAvatar: user.photoURL || null,
        companyId: companyId,
        companyName: companyProfile?.companyName || 'Unknown Company',
      });
      toast({
        title: ui.saveSubmitted,
        description: ui.saveSubmittedDesc,
      });
      notifyAdmin({
        title: 'Document submitted for approval',
        description: `${user.displayName || user.email} submitted "${selectedTemplate.title}" for review.`,
        type: 'document_review',
        link: '/admin/document-approvals',
        clientId: user.uid,
        clientName: user.displayName || user.email || 'Unknown',
        companyId: companyId,
        companyName: companyProfile?.companyName || 'Unknown Company',
      });
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        variant: 'destructive',
        title: ui.saveFailed,
        description: ui.saveFailedDesc,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation handlers
  const handleSelectCategory = (category: TemplateCategory) => {
    setSelectedCategory(category);
    setView('template-selection');
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setGeneratedDocument(null);
    setSavedDocId(null);
    setView('form-and-preview');
  };

  const handleBackToCategories = () => {
    setView('category-selection');
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const handleBackToTemplates = () => {
    setView('template-selection');
    setSelectedTemplate(null);
    setGeneratedDocument(null);
  };

  // Copy to clipboard
  const handleCopyToClipboard = () => {
    if (generatedDocument) {
      navigator.clipboard.writeText(generatedDocument);
      toast({ title: ui.copied });
    }
  };

  // Download as PDF (called only after payment check)
  const runDownloadPdf = async () => {
    if (generatedDocument && selectedTemplate) {
      try {
        const { default: jsPDF } = await import('jspdf');
        const pdfDoc = new jsPDF();
        pdfDoc.setFont('Helvetica');
        pdfDoc.setFontSize(10);
        const textLines = pdfDoc.splitTextToSize(generatedDocument, 180);
        pdfDoc.text(textLines, 15, 15);
        pdfDoc.save(`${selectedTemplate.title.replace(/\s+/g, '_')}.pdf`);
        toast({ title: ui.downloadingPdf });
      } catch (error) {
        console.error('PDF generation error:', error);
        toast({ variant: 'destructive', title: 'Error', description: ui.pdfError });
      }
    }
  };

  // Download as Word (called only after payment check)
  const runDownloadWord = async () => {
    if (generatedDocument && selectedTemplate) {
      toast({ title: ui.preparingWord });
      try {
        const { saveAs } = await import('file-saver');
        const htmlString = plainTextToDocxHtml(generatedDocument);
        const response = await convertHtmlToDocx({ htmlString });
        const byteCharacters = atob(response.docxBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        saveAs(blob, `${selectedTemplate.title.replace(/\s+/g, '_')}.docx`);
      } catch (error) {
        console.error('Word generation error:', error);
        toast({ variant: 'destructive', title: 'Error', description: ui.wordError });
      }
    }
  };

  const handleDownloadChoice = async (format: 'pdf' | 'docx') => {
    if (!generatedDocument || !selectedTemplate || !user) return;
    setIsDownloading(true);
    try {
      // Save to My Documents on first download
      if (!savedDocId && selectedCategory) {
        try {
          const userDocSnap = await getDoc(doc(firestore, 'users', user.uid));
          const companyId = userDocSnap.data()?.companyId;
          if (companyId) {
            const newDocRef = await addDoc(collection(firestore, 'users', user.uid, 'documents'), {
        name: `${selectedTemplate.title} - ${new Date().toLocaleDateString(resolveSwissLocale(locale))}`,
              templateId: selectedTemplate.id,
              templateType: selectedTemplate.title,
              categoryId: selectedCategory.id,
              categoryTitle: selectedCategory.title,
              content: generatedDocument,
              status: 'Draft',
              createdAt: serverTimestamp(),
              userId: user.uid,
              userName: user.displayName || user.email,
              userAvatar: user.photoURL || null,
              companyId,
              companyName: companyProfile?.companyName || 'Unknown Company',
            });
            setSavedDocId(newDocRef.id);
          }
        } catch (e) {
          console.warn('Could not save to My Documents:', e);
        }
      }
      if (format === 'pdf') await runDownloadPdf();
      else await runDownloadWord();
      setDownloadDialogOpen(false);
    } catch (error) {
      console.error('Download error:', error);
      toast({ variant: 'destructive', title: ui.generationFailed, description: ui.pdfError });
    } finally {
      setIsDownloading(false);
    }
  };

  // Render category selection view
  const renderCategorySelection = () => (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{ui.pageTitle}</h1>
          </div>
          <p className="text-muted-foreground">
            {ui.pageSubtitle.replace('{count}', String(getTotalTemplateCount()))}
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={ui.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{ui.noResults} "{searchQuery}"</p>
          <Button variant="link" onClick={() => setSearchQuery('')}>
            {ui.clearSearch}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCategories.map((category) => {
            const Icon = iconMap[category.icon];
            return (
              <Card
                key={category.id}
                className="flex flex-col cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                onClick={() => handleSelectCategory(category)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary/20 transition-colors">
                      {Icon && <Icon className="h-5 w-5 text-primary" />}
                    </div>
                    <CardTitle className="text-base">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {category.description}
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Badge variant="secondary" className="text-xs">
                    {category.templates.length} modèle{category.templates.length > 1 ? 's' : ''}
                  </Badge>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render template selection view
  const renderTemplateSelection = () => (
    <div>
      <Button variant="ghost" onClick={handleBackToCategories} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {ui.backToCategories}
      </Button>
      
      <div className="flex items-center gap-3 mb-6">
        {selectedCategory && iconMap[selectedCategory.icon] && (
          <div className="bg-primary/10 p-3 rounded-lg">
            {(() => {
              const Icon = iconMap[selectedCategory.icon];
              return Icon && <Icon className="h-6 w-6 text-primary" />;
            })()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{selectedCategory?.title}</h1>
          <p className="text-muted-foreground">{selectedCategory?.description}</p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selectedCategory?.templates.map((template) => (
          <Card
            key={template.id}
            className="flex flex-col cursor-pointer hover:border-primary hover:shadow-lg transition-all"
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{template.title}</CardTitle>
                <Badge variant="outline" className="text-xs shrink-0">
                  {template.id}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render form and preview view
  const renderFormAndPreview = () => (
    <>
    <div>
      <Button variant="ghost" onClick={handleBackToTemplates} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {ui.backToTemplates}
      </Button>
      
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{selectedTemplate?.id}</Badge>
          <Badge variant="secondary">{selectedCategory?.title}</Badge>
          <Badge className="bg-blue-600">{ui.categoryLabel}</Badge>
        </div>
        <h1 className="text-2xl font-bold">{selectedTemplate?.title}</h1>
        <p className="text-muted-foreground">{selectedTemplate?.description}</p>
      </div>
      
      {/* CLA Notice Period Warning */}
      {noticePeriodWarning && !noticePeriodWarning.isCompliant && (
        <Alert variant="default" className="mb-4 border-orange-300 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">Notice Period Warning — {noticePeriodWarning.claName}</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            {noticePeriodWarning.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{ui.requiredInfo}</CardTitle>
              <CardDescription>
                {ui.requiredInfoDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTemplate && (
                <DocumentForm
                  key={selectedTemplate.id}
                  template={selectedTemplate}
                  onSubmit={handleGenerate}
                  isLoading={isLoading}
                  companyProfile={companyProfile}
                  ui={ui}
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Preview Section */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">{ui.generatedDoc}</CardTitle>
              <CardDescription>
                {ui.generatedDocDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}
              {generatedDocument && !isLoading && (
                <Textarea
                  readOnly
                  value={generatedDocument}
                  className="h-[500px] text-sm font-mono resize-none"
                />
              )}
              {!isLoading && !generatedDocument && (
                <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-lg bg-muted/30">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center px-4">
                    {ui.generatedPlaceholder}
                  </p>
                </div>
              )}
            </CardContent>
            {generatedDocument && !isLoading && (
              <CardFooter className="flex-wrap gap-2">
                <Button 
                  onClick={handleSaveDocument} 
                  disabled={isSaving} 
                  className="flex-1 min-w-[140px]"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSaving ? ui.sending : ui.submitReview}
                </Button>
                <Button 
                  onClick={handleCopyToClipboard} 
                  variant="outline" 
                  className="flex-1 min-w-[100px]"
                >
                  <Copy className="mr-2 h-4 w-4" /> {ui.copy}
                </Button>
                <Button
                  variant="secondary"
                  disabled={isDownloading}
                  className="flex-1 min-w-[120px]"
                  onClick={() => setDownloadDialogOpen(true)}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {ui.download}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{ui.download}</DialogTitle>
            <DialogDescription>
              Choose your preferred format. The document will be saved to My Documents for re-downloading at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" disabled={isDownloading} onClick={() => void handleDownloadChoice('pdf')}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {ui.pdfDocument}
            </Button>
            <Button type="button" variant="outline" disabled={isDownloading} onClick={() => void handleDownloadChoice('docx')}>
              {ui.wordDocument}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Main render
  switch (view) {
    case 'template-selection':
      return renderTemplateSelection();
    case 'form-and-preview':
      return renderFormAndPreview();
    default:
      return renderCategorySelection();
  }
}

// ============================================================================
// DOCUMENT FORM COMPONENT
// ============================================================================
function DocumentForm({
  template,
  onSubmit,
  isLoading,
  companyProfile,
  ui,
}: {
  template: Template;
  onSubmit: (data: Record<string, any>) => void;
  isLoading: boolean;
  companyProfile: CompanyProfile | null;
  ui: Record<string, string>;
}) {
  const formSchema = template.fields;
  type FormValues = z.infer<typeof formSchema>;

  // Generate default values based on field names
  const defaultValues = useMemo(() => {
    const initialValues: Record<string, any> = {};
    const shape = formSchema.shape as Record<string, z.ZodTypeAny>;
    
    for (const key in shape) {
      const lowerKey = key.toLowerCase();
      
      // Pre-fill company fields from profile
      if (lowerKey === 'companyname' && companyProfile?.companyName) {
        initialValues[key] = companyProfile.companyName;
      } else if (lowerKey === 'companyaddress' && companyProfile?.companyAddress) {
        initialValues[key] = companyProfile.companyAddress;
      } else if (lowerKey === 'companypostalcode' && companyProfile?.companyPostalCode) {
        initialValues[key] = companyProfile.companyPostalCode;
      } else if (lowerKey === 'companycity' && companyProfile?.companyCity) {
        initialValues[key] = companyProfile.companyCity;
      } else if ((lowerKey === 'companyide' || lowerKey === 'companyregistration') && companyProfile?.companyIDE) {
        initialValues[key] = companyProfile.companyIDE;
      } else {
        initialValues[key] = '';
      }
    }
    return initialValues as FormValues;
  }, [formSchema.shape, companyProfile]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Determine input type based on field name
  const getFieldConfig = (fieldName: string) => {
    const lowerName = fieldName.toLowerCase();
    
    // Date fields
    if (lowerName.includes('date')) {
      return { type: 'date', component: 'input' };
    }
    
    // Number/Amount fields
    if (lowerName.includes('amount') || 
        lowerName.includes('salary') || 
        lowerName.includes('price') ||
        lowerName.includes('rate') ||
        lowerName.includes('fees') ||
        lowerName.includes('value') ||
        lowerName.includes('hours') ||
        lowerName.includes('days') ||
        lowerName.includes('votes') ||
        lowerName.includes('shares') ||
        lowerName.includes('ownership')) {
      return { type: 'text', component: 'input' }; // Keep as text for CHF formatting
    }
    
    // Textarea fields (long text)
    if (lowerName.includes('description') || 
        lowerName.includes('reason') ||
        lowerName.includes('terms') ||
        lowerName.includes('modifications') ||
        lowerName.includes('powers') ||
        lowerName.includes('scope') ||
        lowerName.includes('content') ||
        lowerName.includes('contestation') ||
        lowerName.includes('correction') ||
        lowerName.includes('schedule') ||
        lowerName.includes('rules') ||
        lowerName.includes('distribution') ||
        lowerName.includes('purpose') ||
        lowerName.includes('evaluation') ||
        lowerName.includes('behavior') ||
        lowerName.includes('expected') ||
        lowerName.includes('consequences') ||
        lowerName.includes('incident') ||
        lowerName.includes('settlement') ||
        lowerName.includes('dispute')) {
      return { type: 'text', component: 'textarea' };
    }
    
    // Default text input
    return { type: 'text', component: 'input' };
  };

  // Format field name for display
  const formatLabel = (fieldName: string) => {
    // Common business terms in French
    const translations: Record<string, string> = {
      companyName: 'Raison sociale',
      companyAddress: 'Adresse de l\'entreprise',
      companyPostalCode: 'Code postal',
      companyCity: 'Ville',
      companyIDE: 'Numéro IDE',
      companyRegistration: 'Numéro RC/IDE',
      companyRC: 'Numéro RC',
      companySeat: 'Siège social',
      employeeName: 'Nom de l\'employé',
      employeeAddress: 'Adresse de l\'employé',
      jobTitle: 'Titre du poste',
      startDate: 'Date de début',
      endDate: 'Date de fin',
      grossMonthlySalary: 'Salaire mensuel brut (CHF)',
      workHoursPerWeek: 'Heures par semaine',
      probationPeriod: 'Période d\'essai',
      vacationDays: 'Jours de vacances',
      noticePeriod: 'Délai de congé',
      recipientName: 'Nom du destinataire',
      recipientAddress: 'Adresse du destinataire',
      loanAmount: 'Montant du prêt (CHF)',
      interestRate: 'Taux d\'intérêt (%)',
      salePrice: 'Prix de vente (CHF)',
      totalPrice: 'Prix total (CHF)',
      paymentTerms: 'Modalités de paiement',
      warrantyPeriod: 'Durée de garantie',
      cedantName: 'Nom du cédant',
      cessionaireName: 'Nom du cessionnaire',
      debtorName: 'Nom du débiteur',
      creditorName: 'Nom du créancier',
      shareholderName: 'Nom de l\'actionnaire',
      partner1Name: 'Nom du premier associé',
      partner2Name: 'Nom du deuxième associé',
    };
    
    if (translations[fieldName]) {
      return translations[fieldName];
    }
    
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {Object.keys(template.fields.shape).map((fieldName) => {
          const config = getFieldConfig(fieldName);
          const label = formatLabel(fieldName);
          
          return (
            <FormField
              key={fieldName}
              control={form.control}
              name={fieldName as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    {config.component === 'textarea' ? (
                      <Textarea
                        placeholder={`Enter ${label.toLowerCase()}...`}
                        {...field}
                        value={field.value ?? ''}
                        rows={3}
                      />
                    ) : (
                      <Input
                        type={config.type}
                        placeholder={`Enter ${label.toLowerCase()}...`}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        })}
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {ui.generating}
            </>
          ) : (
            ui.generateDocument
          )}
        </Button>
      </form>
    </Form>
  );
}
