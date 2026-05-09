
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Home,
  Gavel,
  ArrowLeft,
  Loader2,
  Copy,
  Download,
  Save,
  AlertTriangle,
  Search,
} from "lucide-react";
import { useFirebase } from "@/firebase/firebase-provider";
import { doc, getDoc, getDocs, addDoc, collection, query, where, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { aiDocumentGenerator } from "@/ai/flows/ai-document-generator-flow";
import { convertHtmlToDocx } from '@/ai/flows/document-converter-flow';
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale, useTranslations } from 'next-intl';
import { CLA_RULES, resolveClaSafe, validateNoticePeriod, type ClaRule } from '@/lib/cla-rules';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadStripe } from '@stripe/stripe-js';
import { IS_GLOBAL_TEST_MODE } from '@/lib/test-mode';
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

type ClientEntry = {
  id: string;
  name: string;
  canton: string;
  address?: string;
  postalCode?: string;
  city?: string;
};

const templates = [
  {
    type: "employment_contract",
    title: "Employment Contract",
    description: "Create a standard Swiss employment contract for a new hire.",
    templateText: `Contrat de travail

Entre les soussignes :

[employerName]
[employerAddress]

ci-apres l Employeur,

et

[employeeName]
[employeeAddress]

ci-apres l Employe.

1. Fonction
L Employe est engage en qualite de [jobTitle].

2. Entree en fonction
Le present contrat prend effet le [startDate].

3. Remuneration
L Employe percevra un salaire brut de CHF [grossSalary] par mois, sous reserve des deductions legales et contractuelles applicables.

4. Dispositions generales
Les parties conviennent que le present contrat est soumis au droit suisse ainsi qu aux dispositions imperatives applicables et, le cas echeant, a la convention collective en vigueur.

Fait en deux exemplaires.
`,
    icon: FileText,
    fields: {
      employeeName: z.string().min(1, "Employee name is required."),
      employeeAddress: z.string().min(1, "Employee address is required."),
      employerName: z.string().min(1, "Client company name is required."),
      jobTitle: z.string().min(1, "Job title is required."),
      grossSalary: z.coerce.number().min(1, "Salary must be greater than 0."),
      startDate: z.string().min(1, "Start date is required."),
    },
  },
  {
    type: "rental_agreement",
    title: "Rental Agreement",
    description: "Generate a residential lease agreement for a client's property.",
    templateText: `Contrat de bail a loyer

Entre :

[landlordName]

ci-apres le Bailleur,

et

[tenantName]

ci-apres le Locataire.

1. Objet du bail
Le Bailleur loue au Locataire le bien sis a [propertyAddress].

2. Duree
Le bail debute le [leaseStartDate].

3. Loyer
Le loyer mensuel brut est fixe a CHF [monthlyRent], payable d avance selon les modalites convenues entre les parties.

4. Droit applicable
Le present bail est regi par le droit suisse, notamment par les dispositions applicables du Code des obligations.

Fait en deux exemplaires.
`,
    icon: Home,
    fields: {
      tenantName: z.string().min(1, "Tenant name is required."),
      landlordName: z.string().min(1, "Landlord name is required (client)."),
      propertyAddress: z.string().min(1, "Property address is required."),
      monthlyRent: z.coerce.number().min(1, "Rent must be greater than 0."),
      leaseStartDate: z.string().min(1, "Start date is required."),
    },
  },
  {
    type: "termination_letter",
    title: "Termination Letter",
    description: "Generate a termination / notice letter (lettre de licenciement) compliant with the applicable CLA.",
    templateText: `Lettre de licenciement

[employerName]

A l attention de [employeeName]

Objet : Resiliation du contrat de travail

Madame, Monsieur,

Par la presente, nous vous notifions la resiliation de votre contrat de travail avec effet au [terminationDate], dans le respect du delai de conge de [noticePeriod], compte tenu de vos [yearsOfService] annees de service.

Motif de la resiliation :
[reason]

Nous vous remercions pour la collaboration fournie et vous prions d agreer, Madame, Monsieur, nos salutations distinguees.
`,
    icon: Gavel,
    fields: {
      employeeName: z.string().min(1, "Employee name is required."),
      employerName: z.string().min(1, "Employer / client company name is required."),
      noticePeriod: z.string().min(1, "Notice period is required (e.g. '2 mois')."),
      yearsOfService: z.coerce.number().min(0, "Years of service must be 0 or more."),
      terminationDate: z.string().min(1, "Termination date is required."),
      reason: z.string().optional(),
    },
  },
];

type Template = (typeof templates)[0];

const getTemplateDefinition = (template: Template | null): Template | null => {
  if (!template) {
    return null;
  }

  return templates.find((entry) => entry.type === template.type) ?? template;
};

const getErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
};

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

function acctFeeStorageKey(userId: string) {
  return `lynvia_acct_doc_fee_${userId}`;
}
function readAcctFeeFlags(userId: string): { document_pdf: boolean } {
  if (typeof window === 'undefined') return { document_pdf: false };
  try {
    const raw = sessionStorage.getItem(acctFeeStorageKey(userId));
    return raw ? (JSON.parse(raw) as { document_pdf: boolean }) : { document_pdf: false };
  } catch { return { document_pdf: false }; }
}
function writeAcctFeeFlags(userId: string, flags: Partial<{ document_pdf: boolean }>) {
  if (typeof window === 'undefined') return;
  const prev = readAcctFeeFlags(userId);
  sessionStorage.setItem(acctFeeStorageKey(userId), JSON.stringify({ ...prev, ...flags }));
}

export default function DocumentGeneratorPage() {
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientEntry | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentBusy, setIsPaymentBusy] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [bundleDownloadPaid, setBundleDownloadPaid] = useState(false);
  const [clientCla, setClientCla] = useState<ClaRule | null>(null);
  const [noticePeriodWarning, setNoticePeriodWarning] = useState<string | null>(null);

  const { user, loading: userLoading } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('AccountingDocumentGenerator');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!user) return;
    const feeOk = searchParams.get('fee_ok');
    const feeCancel = searchParams.get('fee_cancel');
    const sessionId = searchParams.get('session_id');

    if (feeCancel === '1') {
      toast({
        title: t('downloadFailed'),
        description: 'Payment was canceled.',
      });
      router.replace(`/${locale}/accounting-firm/document-generator`);
      return;
    }

    if (feeOk !== '1' || !sessionId) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/accounting-firm/document-fee-reconcile', {
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
            title: t('downloadFailed'),
            description: payload?.error || 'Could not confirm Stripe payment.',
          });
          return;
        }
        writeAcctFeeFlags(user.uid, { document_pdf: true });
        setBundleDownloadPaid(true);
        toast({
          title: t('generatedSuccess'),
          description: 'Payment confirmed. Download is unlocked.',
        });
      } finally {
        if (!cancelled) {
          router.replace(`/${locale}/accounting-firm/document-generator`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, searchParams, router, locale, toast, t]);

  const filteredClients = useMemo(() => {
    const queryText = clientSearch.trim().toLowerCase();
    const sortedClients = [...clients].sort((left, right) => left.name.localeCompare(right.name));

    if (!queryText) {
      return sortedClients;
    }

    return sortedClients.filter((client) => (
      client.name.toLowerCase().includes(queryText)
      || client.canton.toLowerCase().includes(queryText)
    ));
  }, [clientSearch, clients]);

  // Load clients from Firestore (companies linked to this accounting firm)
  useEffect(() => {
    if (!user || userLoading) return;
    const loadClients = async () => {
      setIsLoadingClients(true);
      try {
        const userSnap = await getDoc(doc(firestore, 'users', user.uid));
        const firmCompanyId = userSnap.data()?.companyId;
        if (!firmCompanyId) { setIsLoadingClients(false); return; }
        const companiesSnap = await getDocs(
          query(collection(firestore, 'companies'), where('accountingFirmId', '==', firmCompanyId))
        );
        const list: ClientEntry[] = companiesSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.companyName || d.id,
            canton: data.canton || 'zh',
            address: data.address || '',
            postalCode: data.postalCode || '',
            city: data.city || '',
          };
        });
        setClients(list);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    };
    loadClients();
  }, [user, userLoading]);

  // Fetch CLA when client company is selected
  useEffect(() => {
    if (!selectedClient) { setClientCla(null); setNoticePeriodWarning(null); return; }
    const fetchCla = async () => {
      try {
        const compSnap = await getDoc(doc(firestore, 'companies', selectedClient.id));
        if (!compSnap.exists()) return;
        const data = compSnap.data();
        if (data.cla?.id) {
          const rule = CLA_RULES.find(r => r.id === data.cla.id) || null;
          setClientCla(rule);
        } else {
          const industry = data.industry || data.secteurActivite || '';
          if (industry) {
            const resolved = resolveClaSafe(industry);
            setClientCla(resolved.cla);
          }
        }
      } catch (err) {
        console.error('Error fetching client CLA:', err);
      }
    };
    fetchCla();
  }, [selectedClient]);

  const handleGenerate = async (formData: Record<string, any>) => {
    if (!selectedTemplate || !user || !selectedClient) return;
    const templateDefinition = getTemplateDefinition(selectedTemplate);

    if (!templateDefinition?.templateText) {
      toast({
        variant: 'destructive',
        title: t('generationFailed'),
        description: t('templateUnavailable'),
      });
      return;
    }

    // --- Notice period validation for termination letters ---
    if (templateDefinition.type === 'termination_letter' && clientCla) {
      const noticePeriodStr = String(formData.noticePeriod || '');
      const yearsOfService = Number(formData.yearsOfService || 0);
      const result = validateNoticePeriod(clientCla, noticePeriodStr, yearsOfService);
      if (!result.isCompliant) {
        setNoticePeriodWarning(result.message);
        toast({ variant: 'destructive', title: t('noticePeriodWarningTitle'), description: result.message });
        // Allow generation but show the warning — user can still proceed
      } else {
        setNoticePeriodWarning(null);
      }
    } else {
      setNoticePeriodWarning(null);
    }

    setIsLoading(true);
    setGeneratedDocument(null);

    try {
      const senderAddress = selectedClient.address?.trim() || '[Adresse client]';
      const senderPostalCity = `${selectedClient.postalCode || '[Code postal]'} ${selectedClient.city || '[Ville]'}`.trim();
      const senderBlock = [selectedClient.name, senderAddress, senderPostalCity].join('\n');
      const claLegalContext = clientCla
        ? ` The applicable CLA is "${clientCla.name}". Ensure document complies with its rules.`
        : '';
      const response = await aiDocumentGenerator({
        templateType: templateDefinition.title,
        templateText: templateDefinition.templateText,
        formData: {
          ...formData,
          senderName: selectedClient.name,
          senderAddress,
          companyName: formData.companyName || selectedClient.name,
          companyAddress: formData.companyAddress || senderAddress,
          companyPostalCode: formData.companyPostalCode || selectedClient.postalCode || '[Code postal]',
          companyCity: formData.companyCity || selectedClient.city || '[Ville]',
        },
        canton: selectedClient.canton,
        legalContext:
          `This document is being generated by an accounting firm for their client, ${selectedClient.name}.${claLegalContext}`,
      });
      const aiBody = response.documentContent;
      const normalizedBody = aiBody.toLowerCase();
      const hasSenderName = normalizedBody.includes(selectedClient.name.toLowerCase());
      const hasSenderAddress = senderAddress !== '[Adresse client]' && normalizedBody.includes(senderAddress.toLowerCase());
      const body = hasSenderName && hasSenderAddress ? aiBody : `${senderBlock}\n\n${aiBody}`;
      // Deterministically replace [Signature] with the client's name
      const signedBody = body.replace(/\[Signature\]/gi, selectedClient.name);
      setGeneratedDocument(signedBody);
      toast({
        title: t('generatedSuccess'),
        description: t('generatedSuccessDesc'),
      });
    } catch (error) {
      console.error("AI Document Generation Error:", error);
      toast({
        variant: "destructive",
        title: t('generationFailed'),
        description: getErrorMessage(error) ?? t('generationFailedDesc'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!user || !selectedClient || !selectedTemplate || !generatedDocument) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'users', user.uid, 'documents'), {
        name: `${selectedTemplate.title} — ${selectedClient.name}`,
        templateType: selectedTemplate.type,
        status: 'Draft',
        createdAt: serverTimestamp(),
        userName: user.displayName || user.email || '',
        content: generatedDocument,
        clientCompanyId: selectedClient.id,
        clientCompanyName: selectedClient.name,
      });
      toast({
        title: t('generatedSuccess'),
        description: t('saveSuccessDesc', { client: selectedClient.name }),
      });
    } catch (error) {
      console.error('Error saving document:', error);
      toast({ variant: 'destructive', title: t('generationFailed'), description: t('saveFailedDesc') });
    } finally {
      setIsSaving(false);
    }
  }

  const handleBackToClient = () => {
    setSelectedTemplate(null);
    setGeneratedDocument(null);
  }
  
  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setGeneratedDocument(null);
  };
  
  const handleCopyToClipboard = () => {
    if (generatedDocument) {
      navigator.clipboard.writeText(generatedDocument);
      toast({ title: t('copied') });
    }
  };

  const runDownloadPdf = async () => {
    if (generatedDocument && selectedTemplate) {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const textLines = doc.splitTextToSize(generatedDocument, 180);
        doc.text(textLines, 10, 10);
        doc.save(`${selectedTemplate.title.replace(/\s+/g, '_') || 'document'}.pdf`);
        toast({ title: t('downloadingPdf') });
    }
  };

  const runDownloadWord = async () => {
    if (generatedDocument && selectedTemplate) {
      toast({ title: t('preparingWord') });
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
        const blob = new Blob([byteArray], {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
        saveAs(blob, `${selectedTemplate.title.replace(/\s+/g, '_') || 'document'}.docx`);
      } catch (error) {
        console.error("Error generating Word document:", error);
        toast({ variant: "destructive", title: t('downloadFailed'), description: t('downloadFailedDesc') });
      }
    }
  };

  const ensureDownloadPaid = async (): Promise<boolean> => {
    if (!user) return false;
    const flags = readAcctFeeFlags(user.uid);
    if (IS_GLOBAL_TEST_MODE) {
      if (bundleDownloadPaid || flags.document_pdf) return true;
      await createSimulatedPaidOrder({
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        serviceId: 'acct_instant_pdf',
        serviceTitle: `Instant download (PDF/Word) — ${selectedTemplate?.title ?? 'document'}`,
        priceAmount: 500,
        orderType: 'document',
        intakeData: selectedTemplate ? { templateType: selectedTemplate.type } : undefined,
      });
      setBundleDownloadPaid(true);
      writeAcctFeeFlags(user.uid, { document_pdf: true });
      return true;
    }
    if (bundleDownloadPaid || flags.document_pdf) return true;
    const token = await user.getIdToken();
    const res = await fetch('/api/accounting-firm/document-fee-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amountCents: 500, locale }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error || 'Could not start payment.');
    if (payload.testMode) {
      writeAcctFeeFlags(user.uid, { document_pdf: true });
      setBundleDownloadPaid(true);
      return true;
    }
    if (!stripePublishableKey) throw new Error('Stripe publishable key is missing.');
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe is not available.');
    const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
    if (error) throw new Error(error.message);
    return false;
  };

  const handleDownloadChoice = async (format: 'pdf' | 'docx') => {
    if (!generatedDocument || !selectedTemplate || !user) return;
    setIsPaymentBusy(true);
    try {
      const ok = await ensureDownloadPaid();
      if (!ok) return;
      if (format === 'pdf') await runDownloadPdf();
      else await runDownloadWord();
      setDownloadDialogOpen(false);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: t('downloadFailed'),
        description: error instanceof Error ? error.message : t('downloadFailedDesc'),
      });
    } finally {
      setIsPaymentBusy(false);
    }
  };
  
  if (!selectedClient) {
    return (
         <div>
          <h1 className="text-xl font-semibold tracking-tight mb-1">{t('pageTitle')}</h1>
            <p className="text-sm text-muted-foreground mb-4">
          {t('pageSubtitle')}
            </p>
            <Card>
                <CardHeader>
            <CardTitle className="text-lg">{t('selectClient')}</CardTitle>
            <CardDescription>{t('selectClientDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={clientSearch}
                        onChange={(event) => setClientSearch(event.target.value)}
                        placeholder={t('searchClientsPlaceholder')}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('clientCount', { count: filteredClients.length })}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>{t('clientName')}</TableHead>
                          <TableHead>{t('canton')}</TableHead>
                          <TableHead className="w-[140px] text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingClients && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                              {t('loadingClients')}
                            </TableCell>
                          </TableRow>
                        )}

                        {!isLoadingClients && filteredClients.length === 0 && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={3} className="h-28 text-center">
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">
                                  {clientSearch.trim() ? t('noMatchingClients') : t('noClients')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {clientSearch.trim() ? t('clearSearchHint') : t('noClientsDescription')}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {!isLoadingClients && filteredClients.map((client) => (
                          <TableRow
                            key={client.id}
                            className="cursor-pointer border-border/70 hover:bg-slate-50/40 dark:hover:bg-slate-900/40"
                            onClick={() => setSelectedClient(client)}
                          >
                            <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                            <TableCell className="uppercase text-muted-foreground">{client.canton}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedClient(client);
                                }}
                              >
                                {t('selectAction')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>
        </div>
    );
  }


  if (!selectedTemplate) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelectedClient(null)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToClient')}
        </Button>
        <h1 className="text-xl font-semibold tracking-tight mb-1">{t('generateFor')} {selectedClient.name}</h1>
        <p className="text-sm text-muted-foreground mb-2">
          {t('selectTemplate')}
        </p>
        {clientCla && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800 mb-4">
            <Gavel className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t('claAppliedToClient')} <strong>{clientCla.name}</strong></span>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.type}
              className="flex flex-col cursor-pointer hover:border-primary hover:shadow-lg transition-all"
              onClick={() => setSelectedTemplate(template)}
            >
              <CardHeader className="flex-row items-center gap-4">
                <template.icon className="h-10 w-10 text-primary" />
                <div>
                  <CardTitle className="text-lg">{t(`templates.${template.type}.title`)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">{t(`templates.${template.type}.description`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div>
      <Button variant="ghost" onClick={handleBackToTemplates} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToTemplates')}
      </Button>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {/* CLA indicator */}
          {clientCla && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800">
              <Gavel className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{t('claApplied')} <strong>{clientCla.name}</strong></span>
            </div>
          )}

          {/* Notice period warning */}
          {noticePeriodWarning && (
            <Alert variant="destructive" className="border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-700">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('noticePeriodWarningTitle')}</AlertTitle>
              <AlertDescription className="text-xs">{noticePeriodWarning}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('fillDetails')} {selectedClient.name}</CardTitle>
              <CardDescription>
                {t('fillDetailsDesc')} {t(`templates.${selectedTemplate.type}.title`)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentForm
                template={selectedTemplate}
                onSubmit={handleGenerate}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">{t('generatedDocument')}</CardTitle>
              <CardDescription>
                {t('generatedDocumentDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              )}
              {generatedDocument && (
                <Textarea
                  readOnly
                  value={generatedDocument}
                  className="h-96 text-sm"
                />
              )}
              {!isLoading && !generatedDocument && (
                <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    {t('documentAppears')}
                  </p>
                </div>
              )}
            </CardContent>
            {generatedDocument && (
              <CardFooter className="gap-2">
                <Button onClick={handleSaveDocument} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSaving ? t('saving') : t('saveForClient')}
                </Button>
                <Button onClick={handleCopyToClipboard} variant="outline">
                  <Copy className="mr-2 h-4 w-4" /> {t('copy')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={isPaymentBusy}
                  onClick={() => setDownloadDialogOpen(true)}
                >
                  {isPaymentBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t('download')}
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
            <DialogTitle>{t('download')}</DialogTitle>
            <DialogDescription>
              {IS_GLOBAL_TEST_MODE
                ? 'Test mode: download is free.'
                : 'Choose PDF or Word. Both formats share the same payment (CHF 5).'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" disabled={isPaymentBusy} onClick={() => void handleDownloadChoice('pdf')}>
              {t('pdfDocument')}
            </Button>
            <Button type="button" variant="outline" disabled={isPaymentBusy} onClick={() => void handleDownloadChoice('docx')}>
              {t('wordDocument')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DocumentForm({
  template,
  onSubmit,
  isLoading,
}: {
  template: Template;
  onSubmit: (data: Record<string, any>) => void;
  isLoading: boolean;
}) {
  const t = useTranslations('AccountingDocumentGenerator');
  const formSchema = z.object(template.fields);
  type FormValues = z.infer<typeof formSchema>;

  const defaultValues = useMemo(
    () =>
      Object.fromEntries(Object.keys(template.fields).map((key) => [key, ""])),
    [template.fields]
  ) as FormValues;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const getFieldType = (fieldName: string) => {
    const lowerName = fieldName.toLowerCase();

    // Keep insurer names as text even when they contain "rent" (e.g. currentInsurer).
    if (lowerName.includes("insurer")) return "text";
    if (lowerName.includes("salary") || lowerName.includes("rent")) return "number";
    if (lowerName.includes("date")) return "date";
    if (lowerName.includes("powers")) return "textarea";
    return "text";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {Object.keys(template.fields).map((fieldName) => {
          const fieldType = getFieldType(fieldName);
          const label = t(`fields.${fieldName}.label`);
          const placeholder = t('enterField', { field: label.toLowerCase() });
            
          return (
            <FormField
              key={fieldName}
              control={form.control}
              name={fieldName as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    {fieldType === "textarea" ? (
                      <Textarea placeholder={placeholder} {...field} value={field.value ?? ''} />
                    ) : (
                      <Input
                        type={fieldType}
                        placeholder={placeholder}
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
              {t('generating')}
            </>
          ) : (
            t('generateDocument')
          )}
        </Button>
      </form>
    </Form>
  );
}
