"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, CheckCircle2, Clock, FileText, Download, Package, ShoppingCart, Loader2, AlertCircle, Upload, Check,
} from "lucide-react";
import { taxServices } from "@/data/tax-services";
import { Link } from "@/navigation";
import { useTranslations } from 'next-intl';
import { useFirebase } from "@/firebase/firebase-provider";
import { firestore, storage } from "@/firebase/config";
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";
import { notifyAdmin } from "@/lib/admin-notifications";
import { useToast } from "@/hooks/use-toast";
import {
  getMandatoryTaxDocuments,
  isYearlyTaxReturnOrder,
  type TaxMasterProfileLite,
  type PricingSelectionsLite,
} from "@/lib/tax-mandatory-documents";

type OrderStatus = "quote_requested" | "invoice_sent" | "paid" | "in_progress" | "pending_review" | "completed" | "cancelled" | "pending_payment";

interface PricingSelections {
  children?: string;
  properties?: string;
  bankAssets?: string;
  dependents?: string;
}

interface ActiveOrder {
  id: string;
  serviceId?: string;
  orderType?: string;
  serviceTitle: string;
  status: OrderStatus;
  createdAt: { seconds: number; nanoseconds: number };
  intakeData?: { pricingSelections?: PricingSelections; documentsRequired?: number };
}

type MasterProfile = TaxMasterProfileLite & { fortune?: number };

interface UploadedDoc {
  docType: string;
  fileName: string;
  fileUrl: string;
}

export default function TaxServicesPage() {
  const t = useTranslations('TaxServices');
  const { toast } = useToast();
  const { user, loading: userLoading } = useFirebase();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [masterProfile, setMasterProfile] = useState<MasterProfile | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getServiceTitle = (serviceId: string) => t(`catalog.${serviceId}.title`);
  const getServiceDescription = (serviceId: string) => t(`catalog.${serviceId}.description`);
  const getServiceAction = (serviceId: string) => t(`catalog.${serviceId}.actionText`);

  // Load active order
  useEffect(() => {
    if (!user) {
      if (!userLoading) setIsLoading(false);
      return;
    }
    const unsub = onSnapshot(
      query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActiveOrder));
        const found = orders.find(
          (o) =>
            isYearlyTaxReturnOrder(o) &&
            ['paid', 'in_progress', 'pending_review'].includes(o.status),
        );
        setActiveOrder(found ?? null);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [user, userLoading]);

  // Load master profile
  useEffect(() => {
    if (!user) return;
    getDoc(doc(firestore, 'users', user.uid, 'masterProfile', 'baseline'))
      .then(snap => { if (snap.exists()) setMasterProfile(snap.data() as MasterProfile); })
      .catch(() => {});
  }, [user]);

  // Listen to uploaded docs for the active order
  useEffect(() => {
    if (!user || !activeOrder) { setUploadedDocs([]); return; }
    const unsub = onSnapshot(
      collection(firestore, 'users', user.uid, 'orders', activeOrder.id, 'taxDocuments'),
      (snap) => {
        setUploadedDocs(snap.docs.map(d => ({ docType: d.id, ...d.data() } as UploadedDoc)));
      }
    );
    return () => unsub();
  }, [user, activeOrder]);

  const handleUploadDoc = async (docId: string, file: File) => {
    if (!user || !activeOrder) return;
    setUploadingDocId(docId);
    try {
      const path = `tax-documents/${user.uid}/${activeOrder.id}/${docId}/${file.name}`;
      const snap = await uploadBytes(storageRef(storage, path), file);
      const fileUrl = await getDownloadURL(snap.ref);
      await setDoc(doc(firestore, 'users', user.uid, 'orders', activeOrder.id, 'taxDocuments', docId), {
        docType: docId,
        fileName: file.name,
        fileUrl,
        uploadedAt: serverTimestamp(),
      });

      // Check if all required docs are now uploaded after this one
      const mandatory = getMandatoryTaxDocuments(
        activeOrder.serviceId,
        masterProfile,
        activeOrder.intakeData?.pricingSelections as PricingSelectionsLite | undefined,
      );
      const newUploadedIds = [...uploadedDocs.map(d => d.docType), docId];
      const allDone = mandatory.every(m => newUploadedIds.includes(m.id));
      if (allDone) {
        await notifyAdmin({
          title: 'Tax return documents ready',
          description: `${user.displayName || user.email} has submitted all mandatory documents for order "${activeOrder.serviceTitle}".`,
          type: 'tax_return_ready',
          link: '/admin/order-management',
          clientId: user.uid,
          clientName: user.displayName || user.email || 'Unknown',
        });
        toast({ title: t('orderFollowUp.allSubmittedTitle'), description: t('orderFollowUp.allSubmittedDescription') });
      } else {
        toast({ title: t('orderFollowUp.uploadedLabel'), description: file.name });
      }
    } catch (err) {
      toast({ title: 'Upload failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setUploadingDocId(null);
    }
  };

  const getStatusInfo = (status: OrderStatus) => {
    if (status === 'paid') return {
      label: t('orderFollowUp.statuses.paid.label'),
      description: t('orderFollowUp.statuses.paid.description'),
      Icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50', spin: false, showDownload: false,
    };
    if (status === 'in_progress') return {
      label: t('orderFollowUp.statuses.inProgress.label'),
      description: t('orderFollowUp.statuses.inProgress.description'),
      Icon: Loader2, color: 'text-amber-600', bgColor: 'bg-amber-50', spin: true, showDownload: false,
    };
    if (status === 'pending_review') return {
      label: t('orderFollowUp.statuses.pendingReview.label'),
      description: t('orderFollowUp.statuses.pendingReview.description'),
      Icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-50', spin: false, showDownload: true,
    };
    return {
      label: status, description: '',
      Icon: AlertCircle, color: 'text-muted-foreground', bgColor: 'bg-muted', spin: false, showDownload: false,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div><Skeleton className="h-8 w-64 mb-2" /><Skeleton className="h-4 w-96" /></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  // ── POST-PURCHASE FOLLOW-UP VIEW ────────────────────────────────────────
  if (activeOrder && !showCatalog) {
    const si = getStatusInfo(activeOrder.status);
    const { Icon: StatusIcon } = si;
    const mandatoryDocs = getMandatoryTaxDocuments(
      activeOrder.serviceId,
      masterProfile,
      activeOrder.intakeData?.pricingSelections as PricingSelectionsLite | undefined,
    );
    const uploadedDocIds = new Set(uploadedDocs.map(d => d.docType));
    const uploadedCount = mandatoryDocs.filter(d => uploadedDocIds.has(d.id)).length;
    const allUploaded = uploadedCount === mandatoryDocs.length;
    const progressPct = mandatoryDocs.length > 0 ? Math.round((uploadedCount / mandatoryDocs.length) * 100) : 0;

    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('orderFollowUp.title')}</h1>
            <p className="text-muted-foreground">{activeOrder.serviceTitle}</p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 mt-1">
            {si.label}
          </Badge>
        </div>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className={cn("flex items-start gap-3 p-4 rounded-lg", si.bgColor)}>
              <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", si.color, si.spin && "animate-spin")} />
              <div>
                <p className={cn("font-semibold text-sm", si.color)}>{si.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{si.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Document progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">{t('orderFollowUp.mandatoryDocumentsTitle')}</span>
                <span className="text-muted-foreground">{uploadedCount} / {mandatoryDocs.length}</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>

            {/* Per-document upload table */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {mandatoryDocs.map((doc) => {
                    const isUploaded = uploadedDocIds.has(doc.id);
                    const isUploading = uploadingDocId === doc.id;
                    return (
                      <tr key={doc.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 flex items-center gap-2">
                          {isUploaded
                            ? <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                            : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          }
                          <span className={cn(isUploaded && "text-muted-foreground line-through")}>
                            {t(`orderFollowUp.${doc.labelKey}`)}
                          </span>
                          {isUploaded && (
                            <span className="text-xs text-emerald-600 font-medium ml-1">
                              ({t('orderFollowUp.uploadedLabel')})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            ref={el => { fileInputRefs.current[doc.id] = el; }}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.docx"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadDoc(doc.id, file);
                              e.target.value = '';
                            }}
                          />
                          <Button
                            size="sm"
                            variant={isUploaded ? "outline" : "default"}
                            disabled={isUploading || (allUploaded && !isUploaded)}
                            onClick={() => fileInputRefs.current[doc.id]?.click()}
                          >
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isUploaded ? (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                {t('orderFollowUp.replaceButton')}
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                {t('orderFollowUp.uploadButton')}
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {allUploaded && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{t('orderFollowUp.allSubmittedTitle')}</p>
                  <p className="text-xs mt-0.5">{t('orderFollowUp.allSubmittedDescription')}</p>
                </div>
              </div>
            )}

            {/* Download or view order */}
            <div className="flex flex-col sm:flex-row gap-2">
              {si.showDownload && (
                <Button asChild className="flex-1">
                  <Link href="/individual/my-documents">
                    <Download className="h-4 w-4 mr-2" />
                    {t('orderFollowUp.downloadDocuments')}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/individual/my-orders/${activeOrder.id}`}>
                  <Package className="h-4 w-4 mr-2" />
                  {t('orderFollowUp.viewOrderDetails')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Buy Another Service CTA */}
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setShowCatalog(true)} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t('orderFollowUp.buyAnother')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── FULL CATALOG VIEW ────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        {activeOrder && (
          <Button variant="ghost" size="sm" onClick={() => setShowCatalog(false)} className="gap-1 shrink-0 mt-1">
            <ArrowRight className="h-4 w-4 rotate-180" />
            {t('orderFollowUp.backToOrder')}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {taxServices.map((service) => (
          <Card key={service.id} className="flex flex-col">
            <CardHeader className="flex-row items-start gap-4">
              <service.icon className="h-10 w-10 text-primary" />
              <div className="flex-1">
                <CardTitle>{getServiceTitle(service.id)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">{getServiceDescription(service.id)}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-secondary/50 p-4 rounded-b-lg">
              <p className="text-sm font-semibold">
                {service.hasVariants
                  ? t('list.startingAtPrice', { price: (service.basePrice / 100).toFixed(2) })
                  : `CHF ${(service.basePrice / 100).toFixed(2)}`}
              </p>
              <Button asChild>
                <Link href={`/individual/tax-services/${service.id}`}>
                  {getServiceAction(service.id)} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
