
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
} from 'lucide-react';
import { useFirebase } from '@/firebase/firebase-provider';
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { aiDocumentGenerator } from '@/ai/flows/ai-document-generator-flow';
import { convertHtmlToDocx } from '@/ai/flows/document-converter-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { loadStripe } from '@stripe/stripe-js';
import { 
  templateCategories, 
  iconMap, 
  getTotalTemplateCount,
  type Template, 
  type TemplateCategory 
} from '@/data/document-templates';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';
import { notifyAdmin } from '@/lib/admin-notifications';
import { createSimulatedPaidOrder } from '@/lib/checkout-test-mode';
import { plainTextToDocxHtml } from '@/lib/document-export-html';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type UserProfile = {
  canton?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  dateOfBirth?: string;
  phone?: string;
};

type ViewState = 'category-selection' | 'template-selection' | 'form-and-preview';

const CUSTOM_TEMPLATE_ID = 'OTHER_DOCUMENT_TYPE';
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

// Monthly download quota helpers (Firestore-backed)
function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function docFeeStorageKey(userId: string) {
  return `lynvia_doc_fee_${userId}`;
}

function readFeeFlags(userId: string): { document_review: boolean; document_pdf: boolean } {
  if (typeof window === 'undefined') return { document_review: false, document_pdf: false };
  try {
    const raw = sessionStorage.getItem(docFeeStorageKey(userId));
    if (!raw) return { document_review: false, document_pdf: false };
    return JSON.parse(raw) as { document_review: boolean; document_pdf: boolean };
  } catch {
    return { document_review: false, document_pdf: false };
  }
}

function writeFeeFlags(
  userId: string,
  flags: Partial<{ document_review: boolean; document_pdf: boolean }>
) {
  if (typeof window === 'undefined') return;
  const prev = readFeeFlags(userId);
  sessionStorage.setItem(docFeeStorageKey(userId), JSON.stringify({ ...prev, ...flags }));
}

function buildFamilyMemberLines(formData: Record<string, unknown>): { list: string; clauseBlock: string } {
  const raw = formData.familyMembers;
  const rows: { name: string; dateOfBirth?: string; policyNumber?: string }[] = [];
  if (Array.isArray(raw)) {
    for (const m of raw) {
      if (m && typeof m === 'object' && typeof (m as { name?: string }).name === 'string') {
        const name = (m as { name: string }).name.trim();
        if (!name) continue;
        rows.push({
          name,
          dateOfBirth:
            typeof (m as { dateOfBirth?: string }).dateOfBirth === 'string'
              ? (m as { dateOfBirth: string }).dateOfBirth
              : undefined,
          policyNumber:
            typeof (m as { policyNumber?: string }).policyNumber === 'string'
              ? (m as { policyNumber: string }).policyNumber
              : undefined,
        });
      }
    }
  } else if (typeof raw === 'string' && raw.trim()) {
    rows.push({ name: raw.trim() });
  }
  if (rows.length === 0) return { list: '—', clauseBlock: '' };
  const fmt = (r: { name: string; dateOfBirth?: string; policyNumber?: string }) =>
    [r.name, r.dateOfBirth ? `DOB ${r.dateOfBirth}` : null, r.policyNumber ? `Policy ${r.policyNumber}` : null]
      .filter(Boolean)
      .join(', ');
  const list = rows.map(fmt).join('; ');
  const clauseBlock =
    `This request applies to the following persons: ${list}\n\n` +
    `La présente demande vise les personnes suivantes : ${list}\n\n`;
  return { list, clauseBlock };
}

const OTHER_DOCUMENT_TEMPLATE: Template = {
  id: CUSTOM_TEMPLATE_ID,
  titleKey: '__other_document_type__',
  descriptionKey: '__other_document_type_description__',
  fields: z.object({
    senderName: z.string().min(2, 'Please provide your full name.'),
    senderAddress: z.string().min(5, 'Please provide your full address.'),
    customDocumentType: z.string().min(3, 'Please provide the document type.'),
    recipientDetails: z.string().min(3, 'Please provide recipient details.'),
    purposeAndFacts: z.string().min(20, 'Please provide the key facts and purpose.'),
    requestedOutcome: z.string().min(5, 'Please provide your expected outcome.'),
  }),
  templateText: `Please draft a Swiss-law compliant legal document of type: [customDocumentType].

Sender identity:
[senderName]
[senderAddress]

Recipient details:
[recipientDetails]

Purpose and key facts:
[purposeAndFacts]

Requested outcome:
[requestedOutcome]

Use formal Swiss French legal style, clear structure, and actionable wording.`,
};

export default function DocumentGeneratorPage() {
  const [view, setView] = useState<ViewState>('category-selection');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentBusy, setIsPaymentBusy] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  /** True once the user has consumed a free or paid download slot in this session (both PDF and Word share it). */
  const [bundleDownloadPaid, setBundleDownloadPaid] = useState(false);
  /** Free downloads used this month (loaded from Firestore). */
  const [freeDownloadsUsed, setFreeDownloadsUsed] = useState<number | null>(null);
  const FREE_MONTHLY_DOWNLOADS = 2;

  const t = useTranslations('DocumentGenerator');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useFirebase();
  const { toast } = useToast();

  const getTemplateTitle = (template: Template) =>
    template.id === CUSTOM_TEMPLATE_ID ? 'Other document type' : t(template.titleKey as any);

  const getTemplateDescription = (template: Template) =>
    template.id === CUSTOM_TEMPLATE_ID
      ? 'Create a custom Swiss-law-compliant document when no predefined template matches your need.'
      : t(template.descriptionKey as any);

  // Fetch user profile on mount
  useEffect(() => {
    if (user && !userProfile) {
      const fetchUserProfile = async () => {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile({
              firstName: data.profile?.firstName || '',
              lastName: data.profile?.lastName || '',
              canton: data.profile?.canton || '',
              address: data.profile?.address || '',
              city: data.profile?.city || '',
              postalCode: data.profile?.postalCode || '',
              dateOfBirth: data.profile?.dateOfBirth || '',
              phone: data.profile?.phone || '',
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
      fetchUserProfile();
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) return;
    const feeOk = searchParams.get('fee_ok');
    const sessionId = searchParams.get('session_id');
    const purpose = searchParams.get('fee_purpose');
    if (feeOk !== '1' || !sessionId || (purpose !== 'document_review' && purpose !== 'document_pdf')) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/individual/document-fee-reconcile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
        const payload = await res.json();
        if (!res.ok || !payload.paid) {
          toast({
            variant: 'destructive',
            title: 'Payment not confirmed',
            description: payload?.error || 'Could not confirm Stripe payment.',
          });
          return;
        }
        const p = payload.purpose as 'document_review' | 'document_pdf';
        writeFeeFlags(user.uid, { [p]: true });
        if (p === 'document_pdf') {
          setBundleDownloadPaid(true);
        }
        toast({ title: 'Payment confirmed', description: 'You can continue with your document action.' });
      } finally {
        if (!cancelled) {
          router.replace(`/${locale}/individual/document-generator`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, searchParams, router, locale, toast]);

  // Load monthly free download quota from Firestore
  useEffect(() => {
    if (!user) return;
    const monthKey = getMonthKey();
    const quotaRef = doc(firestore, 'users', user.uid, 'downloadQuota', monthKey);
    getDoc(quotaRef).then((snap) => {
      const used = snap.exists() ? (snap.data().freeDownloadsUsed ?? 0) : 0;
      setFreeDownloadsUsed(used);
    }).catch(() => setFreeDownloadsUsed(0));
  }, [user]);

  const payForService = async (amountCents: number, purpose: 'document_review' | 'document_pdf') => {
    if (!user) {
      throw new Error('Please sign in to continue.');
    }

    if (IS_GLOBAL_TEST_MODE) {
      return true;
    }

    const flags = readFeeFlags(user.uid);
    if (flags[purpose]) {
      return true;
    }
    if (purpose === 'document_pdf' && bundleDownloadPaid) {
      return true;
    }

    const token = await user.getIdToken();
    const res = await fetch('/api/individual/document-fee-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amountCents, purpose, locale }),
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || 'Could not start payment.');
    }
    if (payload.testMode) {
      writeFeeFlags(user.uid, { [purpose]: true });
      if (purpose === 'document_pdf') setBundleDownloadPaid(true);
      return true;
    }

    if (!stripePublishableKey) {
      throw new Error('Stripe publishable key is missing.');
    }
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe is not available.');
    }
    const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
    if (error) {
      throw new Error(error.message);
    }
    return false;
  };

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return templateCategories;
    
    const query = searchQuery.toLowerCase();
    return templateCategories.filter(category => 
      t(category.titleKey as any).toLowerCase().includes(query) ||
      t(category.descriptionKey as any).toLowerCase().includes(query) ||
      category.templates.some(template => 
        getTemplateTitle(template).toLowerCase().includes(query) ||
        getTemplateDescription(template).toLowerCase().includes(query)
      )
    );
  }, [searchQuery, t]);

  // Generate document using AI
  const handleGenerate = async (formData: Record<string, any>) => {
    if (!selectedTemplate || !user) return;
    setIsLoading(true);
    setGeneratedDocument(null);

    // Prepare user data to inject into the template
    const today = new Date();
    const formattedDate = today.toLocaleDateString('fr-CH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const fullName =
      `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || '[Nom complet]';
    const senderAddress = userProfile?.address?.trim() || '[Votre adresse]';
    const senderPostalCity = `${userProfile?.postalCode || ''} ${userProfile?.city || ''}`.trim() || '[Code postal] [Ville]';
    const senderBlock = [fullName, senderAddress, senderPostalCity].join('\n');
    const { list: familyMembersList, clauseBlock } = buildFamilyMemberLines(formData);

    const enrichedFormData = {
      ...formData,
      familyMembersList: familyMembersList || '—',
      // User information (Swiss-letter placeholders + legal identity)
      userName: fullName,
      fullName,
      sender: fullName,
      senderName: fullName,
      senderAddress,
      signature: fullName,
      userFirstName: userProfile?.firstName || '[Prénom]',
      userLastName: userProfile?.lastName || '[Nom]',
      userAddress: userProfile?.address || '[Votre adresse]',
      userCity: userProfile?.city || '[Ville]',
      userPostalCode: userProfile?.postalCode || '[Code postal]',
      userFullAddress:
        userProfile?.address || userProfile?.postalCode || userProfile?.city
          ? [userProfile.address, [userProfile.postalCode, userProfile.city].filter(Boolean).join(' ')]
              .filter(Boolean)
              .join(', ')
              .trim()
          : '[Votre adresse complète]',
      // Date and location
      currentDate: formattedDate,
      currentLocation: userProfile?.city || '[Lieu]',
    };

    try {
      const response = await aiDocumentGenerator({
        templateType: getTemplateTitle(selectedTemplate),
        templateText: selectedTemplate.templateText,
        formData: enrichedFormData,
        canton: userProfile?.canton || 'federal',
        legalContext: `Générez la lettre en français suisse formel. Remplacez tous les placeholders [xxx] par les valeurs fournies. Le document doit être complet, professionnel et prêt à être envoyé. Utilisez un ton juridique approprié pour la Suisse. Incluez l'en-tête expéditeur avec l'adresse complète (userFullAddress). Remplacez [Signature] par le nom complet (${fullName}).`,
      });

      // Use AI-generated content directly; family member data is already injected via enrichedFormData.familyMembersList
      // The clauseBlock is NOT prepended to avoid raw text appearing before the document header.
      const aiBody = response.documentContent;
      const normalizedBody = aiBody.toLowerCase();
      const hasSenderName = normalizedBody.includes(fullName.toLowerCase());
      const hasSenderAddress = senderAddress !== '[Votre adresse]' && normalizedBody.includes(senderAddress.toLowerCase());
      const body = hasSenderName && hasSenderAddress ? aiBody : `${senderBlock}\n\n${aiBody}`;
      // Deterministically replace [Signature] with the client's full name
      const signedBody = body.replace(/\[Signature\]/gi, fullName);
      setGeneratedDocument(signedBody);
      toast({
        title: t('toast.generateSuccess.title'),
        description: t('toast.generateSuccess.description'),
      });
    } catch (error) {
      console.error('AI Document Generation Error:', error);
      toast({
        variant: 'destructive',
        title: t('toast.generateError.title'),
        description: t('toast.generateError.description'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save document to Firestore
  const handleSaveDocument = async () => {
    if (!generatedDocument || !user || !selectedTemplate || !selectedCategory) return;
    setIsSaving(true);
    setIsPaymentBusy(true);
    try {
      const paid = await payForService(2000, 'document_review');
      if (!paid) return;
      if (IS_GLOBAL_TEST_MODE) {
        await createSimulatedPaidOrder({
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
          serviceId: 'individual_document_review',
          serviceTitle: `Document review — ${getTemplateTitle(selectedTemplate)}`,
          priceAmount: 2000,
          orderType: 'document',
          intakeData: { templateId: selectedTemplate.id, categoryId: selectedCategory.id },
        });
      }
      writeFeeFlags(user.uid, { document_review: true });

      const docName = `${getTemplateTitle(selectedTemplate)} - ${new Date().toLocaleDateString('fr-CH')}`;
      await addDoc(collection(firestore, 'users', user.uid, 'documents'), {
        name: docName,
        templateId: selectedTemplate.id,
        templateTitle: getTemplateTitle(selectedTemplate),
        categoryId: selectedCategory.id,
        categoryTitle: t(selectedCategory.titleKey as any),
        content: generatedDocument,
        status: 'Pending Review',
        paymentStatus: 'paid',
        paymentMethod: IS_GLOBAL_TEST_MODE ? 'test_mode' : 'stripe',
        amountCents: 2000,
        createdAt: serverTimestamp(),
        userId: user.uid,
        userName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim(),
        userAvatar: user.photoURL || null,
      });
      await notifyAdmin({
        title: 'Document submitted for review',
        description: `${`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.email || 'A client'} submitted "${docName}" for expert review.`,
        type: 'document_review',
        link: '/admin/document-approvals',
        clientId: user.uid,
        clientName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || user.email || 'Unknown',
      });
      toast({
        title: t('toast.saveSuccess.title'),
        description: t('toast.saveSuccess.description'),
      });
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        variant: 'destructive',
        title: t('toast.saveError.title'),
        description: t('toast.saveError.description'),
      });
    } finally {
      setIsSaving(false);
      setIsPaymentBusy(false);
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
      toast({ title: t('toast.copied') });
    }
  };

  const ensureInstantDownloadPaid = async (): Promise<boolean> => {
    if (!user) return false;

    // Already paid/freed in this session — bundle: both PDF + Word share one slot
    if (bundleDownloadPaid) return true;

    if (IS_GLOBAL_TEST_MODE) {
      await createSimulatedPaidOrder({
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        serviceId: 'individual_instant_pdf',
        serviceTitle: `Instant download (PDF/Word) — ${selectedTemplate ? getTemplateTitle(selectedTemplate) : 'document'}`,
        priceAmount: 0,
        orderType: 'document',
        intakeData: selectedTemplate ? { templateId: selectedTemplate.id } : undefined,
      });
      setBundleDownloadPaid(true);
      return true;
    }

    // Check monthly free quota (2 per month)
    const monthKey = getMonthKey();
    const quotaRef = doc(firestore, 'users', user.uid, 'downloadQuota', monthKey);
    let currentUsed = freeDownloadsUsed ?? 0;
    if (freeDownloadsUsed === null) {
      // Not loaded yet – fetch now
      const snap = await getDoc(quotaRef);
      currentUsed = snap.exists() ? (snap.data().freeDownloadsUsed ?? 0) : 0;
    }

    if (currentUsed < FREE_MONTHLY_DOWNLOADS) {
      // Consume a free slot
      const newUsed = currentUsed + 1;
      await setDoc(quotaRef, { freeDownloadsUsed: newUsed }, { merge: true });
      setFreeDownloadsUsed(newUsed);
      setBundleDownloadPaid(true);
      toast({
        title: 'Free download',
        description: `Download ${newUsed} of ${FREE_MONTHLY_DOWNLOADS} free this month.`,
      });
      return true;
    }

    // Free quota exhausted — charge CHF 5
    const paid = await payForService(500, 'document_pdf');
    if (paid) {
      setBundleDownloadPaid(true);
      writeFeeFlags(user.uid, { document_pdf: true });
    }
    return paid;
  };

  const runDownloadPdf = async () => {
    if (!generatedDocument || !selectedTemplate) return;
    const { default: jsPDF } = await import('jspdf');
    const pdfDoc = new jsPDF();
    pdfDoc.setFont('Helvetica');
    pdfDoc.setFontSize(11);
    const textLines = pdfDoc.splitTextToSize(generatedDocument, 180);
    pdfDoc.text(textLines, 15, 20);
    pdfDoc.save(`${t(selectedTemplate.titleKey as any).replace(/\s+/g, '_')}.pdf`);
    toast({ title: t('toast.downloadingPdf') });
  };

  const runDownloadWord = async () => {
    if (!generatedDocument || !selectedTemplate) return;
    toast({ title: t('toast.downloadingWord') });
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
    saveAs(blob, `${t(selectedTemplate.titleKey as any).replace(/\s+/g, '_')}.docx`);
  };

  const handleDownloadChoice = async (format: 'pdf' | 'docx') => {
    if (!generatedDocument || !selectedTemplate || !user) return;
    setIsPaymentBusy(true);
    try {
      const ok = await ensureInstantDownloadPaid();
      if (!ok) return;
      if (format === 'pdf') {
        await runDownloadPdf();
      } else {
        await runDownloadWord();
      }
      setDownloadDialogOpen(false);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: t('toast.downloadPdfError.title'),
        description: error instanceof Error ? error.message : t('toast.downloadPdfError.description'),
      });
    } finally {
      setIsPaymentBusy(false);
    }
  };

  // Render category selection view
  const renderCategorySelection = () => (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle', {count: getTotalTemplateCount()})}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Free preview included. Downloads: 2 free per month (PDF or Word), then CHF 5 per document. CHF 20 for expert review.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noResults', {query: searchQuery})}</p>
          <Button variant="link" onClick={() => setSearchQuery('')}>
            {t('clearSearch')}
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
                    <CardTitle className="text-base">{t(category.titleKey as any)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {t(category.descriptionKey as any)}
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Badge variant="secondary" className="text-xs">
                    {t('templateCount', {count: category.templates.length})}
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
        {t('backToCategories')}
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
          <h1 className="text-2xl font-bold">{selectedCategory ? t(selectedCategory.titleKey as any) : ''}</h1>
          <p className="text-muted-foreground">{selectedCategory ? t(selectedCategory.descriptionKey as any) : ''}</p>
        </div>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...(selectedCategory?.templates ?? []), OTHER_DOCUMENT_TEMPLATE].map((template) => (
          <Card
            key={template.id}
            className="flex flex-col cursor-pointer hover:border-primary hover:shadow-lg transition-all"
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{getTemplateTitle(template)}</CardTitle>
                <Badge variant="outline" className="text-xs shrink-0">
                  {template.id}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">{getTemplateDescription(template)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render form and preview view
  const renderFormAndPreview = () => (
    <div>
      <Button variant="ghost" onClick={handleBackToTemplates} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToTemplates')}
      </Button>
      
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{selectedTemplate?.id}</Badge>
          <Badge variant="secondary">{selectedCategory ? t(selectedCategory.titleKey as any) : ''}</Badge>
        </div>
        <h1 className="text-2xl font-bold">{selectedTemplate ? getTemplateTitle(selectedTemplate) : ''}</h1>
        <p className="text-muted-foreground">{selectedTemplate ? getTemplateDescription(selectedTemplate) : ''}</p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('form.title')}</CardTitle>
              <CardDescription>
                {t('form.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTemplate && (
                <DocumentForm
                  key={selectedTemplate.id}
                  template={selectedTemplate}
                  onSubmit={handleGenerate}
                  isLoading={isLoading}
                  userProfile={userProfile}
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Preview Section */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">{t('preview.title')}</CardTitle>
              <CardDescription>
                {t('preview.description')}
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
                  value={generatedDocument}
                  onChange={(e) => setGeneratedDocument(e.target.value)}
                  className="h-[500px] text-sm font-mono w-full resize-none"
                />
              )}
              {!isLoading && !generatedDocument && (
                <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-lg bg-muted/30">
                  <p className="text-muted-foreground text-center px-4">
                    {t('preview.placeholder')}
                  </p>
                </div>
              )}
            </CardContent>
            {generatedDocument && !isLoading && (
              <CardFooter className="flex-col gap-3">
                {/* Primary action row */}
                <div className="flex flex-wrap gap-2 w-full">
                  <Button 
                    onClick={handleSaveDocument} 
                    disabled={isSaving || isPaymentBusy} 
                    className="flex-1 min-w-[180px] bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {isSaving ? t('buttons.saving') : 'Submit for Review (CHF 20)'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isPaymentBusy}
                    className="flex-1 min-w-[160px]"
                    type="button"
                    onClick={() => setDownloadDialogOpen(true)}
                  >
                    {isPaymentBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 w-full">
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Copy className="mr-2 h-4 w-4" /> {t('buttons.copy')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {IS_GLOBAL_TEST_MODE
                    ? 'Test mode: payments bypassed. Reviewed documents and downloads are enabled for QA.'
                    : `Preview is free. Downloads: ${FREE_MONTHLY_DOWNLOADS} free per month${freeDownloadsUsed !== null ? ` (${Math.max(0, FREE_MONTHLY_DOWNLOADS - freeDownloadsUsed)} remaining this month)` : ''}. After free limit: CHF 5 per document. Submit for review: CHF 20.`}
                </p>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download document</DialogTitle>
            <DialogDescription>
              {IS_GLOBAL_TEST_MODE || (freeDownloadsUsed !== null && freeDownloadsUsed < FREE_MONTHLY_DOWNLOADS)
                ? `Free download${freeDownloadsUsed !== null ? ` (${Math.max(0, FREE_MONTHLY_DOWNLOADS - freeDownloadsUsed)} of ${FREE_MONTHLY_DOWNLOADS} free remaining this month)` : ''}.`
                : 'Your 2 free monthly downloads have been used. This download costs CHF 5 (PDF or Word — one payment covers both formats).'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" disabled={isPaymentBusy} onClick={() => void handleDownloadChoice('pdf')}>
              PDF
            </Button>
            <Button type="button" variant="outline" disabled={isPaymentBusy} onClick={() => void handleDownloadChoice('docx')}>
              Word (.docx)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

function isFamilyMembersArraySchema(schema: z.ZodTypeAny | undefined): boolean {
  if (!schema) return false;
  let inner: z.ZodTypeAny = schema;
  while (
    inner instanceof z.ZodDefault ||
    inner instanceof z.ZodOptional ||
    inner instanceof z.ZodNullable
  ) {
    inner = inner._def.innerType as z.ZodTypeAny;
  }
  return inner instanceof z.ZodArray;
}

function FamilyMembersArrayField({ control }: { control: any }) {
  const t = useTranslations('DocumentGenerator.form.familyMembersUi');
  const tFields = useTranslations('DocumentGenerator.form.fields');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'familyMembers',
  });

  return (
    <FormItem className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <FormLabel>{tFields('familyMembers' as any)}</FormLabel>
      <p className="text-sm text-muted-foreground">{t('hint')}</p>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-md border border-border/60 bg-background/80 p-3">
            <div className="flex gap-2 items-start">
              <FormField
                control={control}
                name={`familyMembers.${index}.name` as any}
                render={({ field: f }) => (
                  <FormItem className="flex-1 space-y-0">
                    <FormControl>
                      <Input placeholder={t('namePlaceholder')} {...f} value={f.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => remove(index)}
                aria-label={t('remove')}
              >
                ×
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FormField
                control={control}
                name={`familyMembers.${index}.dateOfBirth` as any}
                render={({ field: f }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input type="date" placeholder={tFields('placeholders.dateOfBirth' as any)} {...f} value={f.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`familyMembers.${index}.policyNumber` as any}
                render={({ field: f }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input placeholder={t('policyPlaceholder')} {...f} value={f.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append({ name: '', dateOfBirth: '', policyNumber: '' })}
      >
        {t('addMember')}
      </Button>
    </FormItem>
  );
}

// ============================================================================
// DOCUMENT FORM COMPONENT
// ============================================================================

/** Convert camelCase / PascalCase field key to a human-readable label as fallback. */
function humanizeFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function DocumentForm({
  template,
  onSubmit,
  isLoading,
  userProfile,
}: {
  template: Template;
  onSubmit: (data: Record<string, any>) => void;
  isLoading: boolean;
  userProfile: UserProfile | null;
}) {
  const t_form = useTranslations('DocumentGenerator.form');
  const t_fields = useTranslations('DocumentGenerator.form.fields');
  const formSchema = template.fields;
  type FormValues = z.infer<typeof formSchema>;

  // Generate default values based on field names
  const defaultValues = useMemo(() => {
    const initialValues: Record<string, any> = {};
    const shape = formSchema.shape as Record<string, z.ZodTypeAny>;
    
    for (const key in shape) {
      const keyLower = key.toLowerCase();

      if (key === 'familyMembers') {
        initialValues[key] = isFamilyMembersArraySchema(shape[key]) ? [] : '';
        continue;
      }

      // Pre-fill user name fields
      if (keyLower.includes('personalname') || 
          keyLower.includes('sendername') ||
          keyLower.includes('tenantname') ||
          keyLower.includes('principalname') ||
          keyLower.includes('lendername') ||
          keyLower.includes('borrowername') ||
          keyLower.includes('donorname') ||
          keyLower.includes('doneename') ||
          keyLower.includes('cedantname') ||
          keyLower.includes('cessionairename') ||
          keyLower.includes('party1name') ||
          keyLower.includes('employername') ||
          keyLower.includes('employeename') ||
          keyLower.includes('debtorname') ||
          keyLower.includes('creditorname')) {
        initialValues[key] = userProfile 
          ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() 
          : '';
      } 
      // Pre-fill personal postal code
      else if (keyLower === 'personalpostalcode') {
        initialValues[key] = userProfile?.postalCode || '';
      }
      // Pre-fill personal city  
      else if (keyLower === 'personalcity') {
        initialValues[key] = userProfile?.city || '';
      }
      // Pre-fill personal address (user's own address)
      else if (keyLower === 'personaladdress') {
        initialValues[key] = userProfile?.address || '';
      }
      else if (keyLower === 'dateofbirth') {
        initialValues[key] = userProfile?.dateOfBirth || '';
      } else if (
        keyLower === 'fullname' ||
        keyLower === 'clientname' ||
        keyLower === 'applicantname' ||
        keyLower === 'insuredname' ||
        keyLower === 'policyholdername'
      ) {
        initialValues[key] = userProfile
          ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()
          : '';
      }
      // Pre-fill sender address for custom templates
      else if (keyLower === 'senderaddress') {
        initialValues[key] = userProfile?.address || '';
      }
      // Pre-fill general address fields (but not company/insurer addresses)
      else if (keyLower.includes('address') && !keyLower.includes('company') && !keyLower.includes('employer') && !keyLower.includes('insurer') && !keyLower.includes('landlord') && !keyLower.includes('retailer') && !keyLower.includes('seller') && !keyLower.includes('mandatary') && !keyLower.includes('credit') && !keyLower.includes('leasing') && !keyLower.includes('card') && !keyLower.includes('gym') && !keyLower.includes('airline') && !keyLower.includes('telecom') && !keyLower.includes('association') && !keyLower.includes('elcom') && !keyLower.includes('office') && !keyLower.includes('debtor') && !keyLower.includes('creditor') && !keyLower.includes('party') && !keyLower.includes('client') && !keyLower.includes('freelancer') && !keyLower.includes('donor') && !keyLower.includes('donee') && !keyLower.includes('cedant') && !keyLower.includes('cessionaire')) {
        initialValues[key] = userProfile?.address || '';
      } 
      // Default empty for other fields
      else {
        initialValues[key] = '';
      }
    }
    return initialValues as FormValues;
  }, [formSchema.shape, userProfile]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const shape = formSchema.shape as Record<string, z.ZodTypeAny>;

  if (template.id === CUSTOM_TEMPLATE_ID) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name={'senderName' as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your full name</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.customSenderName')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'senderAddress' as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your address</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.customSenderAddress')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'customDocumentType' as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document type</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Settlement letter, contract amendment, formal notice" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'recipientDetails' as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient details</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.recipientDetails')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'purposeAndFacts' as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose and key facts</FormLabel>
                <FormControl>
                  <Textarea placeholder={t('placeholders.customPurposeFacts')} {...field} value={field.value ?? ''} rows={5} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={'requestedOutcome' as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Requested outcome</FormLabel>
                <FormControl>
                  <Input placeholder={t('placeholders.customRequestedOutcome')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t_form('buttons.generating')}
              </>
            ) : (
              t_form('buttons.generate')
            )}
          </Button>
        </form>
      </Form>
    );
  }

  // Determine input type based on field name
  const getFieldConfig = (fieldName: string) => {
    const lowerName = fieldName.toLowerCase();
    
    // Date fields
    if (lowerName.includes('date')) {
      return { type: 'date', component: 'input' };
    }

    // Insurer / caisse names (must stay text: "current" contains substring "rent")
    if (
      lowerName === 'currentinsurer' ||
      lowerName === 'newinsurer' ||
      lowerName.endsWith('insurer') ||
      (lowerName.includes('insurer') &&
        !lowerName.includes('franchise') &&
        !lowerName.includes('premium') &&
        lowerName !== 'insurancepremium')
    ) {
      return { type: 'text', component: 'input' };
    }

    // Number fields (never insurer names — "currentInsurer" contains "rent" as substring)
    if (
      !lowerName.includes('insurer') &&
      (lowerName.includes('amount') ||
        lowerName.includes('salary') ||
        lowerName.includes('rent') ||
        lowerName.includes('fees') ||
        lowerName.includes('price') ||
        lowerName.includes('rate') ||
        lowerName.includes('franchise') ||
        lowerName.includes('hours') ||
        lowerName.includes('days'))
    ) {
      return { type: 'number', component: 'input' };
    }
    
    // Textarea fields (long text)
    if (lowerName.includes('description') || 
        lowerName.includes('reason') ||
        lowerName.includes('circumstances') ||
        lowerName.includes('contestation') ||
        lowerName.includes('justification') ||
        lowerName.includes('terms') ||
        lowerName.includes('tasks') ||
        lowerName.includes('deliverables') ||
        lowerName.includes('items') ||
        lowerName.includes('list') ||
        lowerName.includes('agreement') ||
        lowerName.includes('obligation') ||
        lowerName.includes('condition') ||
        lowerName.includes('disputed') ||
        lowerName.includes('documents')) {
      return { type: 'text', component: 'textarea' };
    }
    
    // Select fields (enums)
    if (lowerName.includes('servicetype') ||
        lowerName.includes('issuetype') ||
        lowerName.includes('desiredoutcome') ||
        lowerName.includes('flightdistance')) {
      return { type: 'select', component: 'select' };
    }
    
    // Default text input
    return { type: 'text', component: 'input' };
  };

  // Get select options for enum fields
  const getSelectOptions = (fieldName: string) => {
    const lowerName = fieldName.toLowerCase();
    
    if (lowerName.includes('servicetype')) {
      return [
        { value: 'militaire', label: t_form('ServiceType.military') },
        { value: 'civil', label: t_form('ServiceType.civil') },
      ];
    }
    if (lowerName.includes('issuetype')) {
      return [
        { value: 'perte', label: t_form('IssueType.loss') },
        { value: 'retard', label: t_form('IssueType.delay') },
        { value: 'dommage', label: t_form('IssueType.damage') },
      ];
    }
    if (lowerName.includes('desiredoutcome')) {
      return [
        { value: 'remboursement', label: t_form('DesiredOutcome.refund') },
        { value: 'échange', label: t_form('DesiredOutcome.exchange') },
      ];
    }
    if (lowerName.includes('flightdistance')) {
      return [
        { value: 'moins de 1500 km', label: t_form('FlightDistance.lessThan1500') },
        { value: 'entre 1500 et 3500 km', label: t_form('FlightDistance.between1500And3500') },
        { value: 'plus de 3500 km', label: t_form('FlightDistance.moreThan3500') },
      ];
    }
    return [];
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {Object.keys(template.fields.shape)
          .filter((fieldName) => {
            if (fieldName !== 'familyMembers') return true;
            return !isFamilyMembersArraySchema(shape[fieldName]);
          })
          .map((fieldName) => {
          const config = getFieldConfig(fieldName);
          const rawLabel = t_fields(fieldName as any);
          // If next-intl returned the key itself (untranslated), produce a human-readable fallback
          const label =
            typeof rawLabel === 'string' && rawLabel !== fieldName
              ? rawLabel
              : humanizeFieldName(fieldName);
          
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
                        placeholder={t_form('placeholders.enter', {label: label.toLowerCase()})}
                        {...field}
                        value={field.value ?? ''}
                        rows={3}
                      />
                    ) : config.component === 'select' ? (
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t_form('placeholders.select', {label: label.toLowerCase()})} />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectOptions(fieldName).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={config.type}
                        placeholder={t_form('placeholders.enter', {label: label.toLowerCase()})}
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

        {'familyMembers' in shape &&
          isFamilyMembersArraySchema(shape.familyMembers) && (
            <FamilyMembersArrayField control={form.control} />
          )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t_form('buttons.generating')}
            </>
          ) : (
            t_form('buttons.generate')
          )}
        </Button>
      </form>
    </Form>
  );
}
