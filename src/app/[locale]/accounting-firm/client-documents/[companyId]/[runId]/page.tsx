'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, AlertCircle, CheckCircle, FileDown, Loader2 } from 'lucide-react';
import { Link } from '@/navigation';
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

type DocumentStatus = 'Pending Review' | 'Approved' | 'Needs Action' | 'Archived';

type ClientDocumentDetail = {
  runId: string;
  companyId: string;
  clientName: string;
  documentName: string;
  status: DocumentStatus;
  lastModified: string;
  assignedTo: string;
  source: 'manual' | 'csv' | 'unknown';
  skippedCount: number;
  createdAt: string;
  monthLabel: string;
  type: string;
};

const getStatusBadgeVariant = (status: DocumentStatus) => {
  switch (status) {
    case 'Approved':
      return 'default';
    case 'Pending Review':
      return 'secondary';
    case 'Needs Action':
      return 'destructive';
    case 'Archived':
      return 'outline';
    default:
      return 'outline';
  }
};

const toDateString = (timestamp: unknown): string => {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in (timestamp as any)) {
    return (timestamp as any).toDate().toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
};

const normalizeStatus = (value: unknown, skippedCount: number): DocumentStatus => {
  if (value === 'Pending Review' || value === 'Approved' || value === 'Needs Action' || value === 'Archived') {
    return value;
  }
  if (skippedCount > 0) return 'Needs Action';
  return 'Pending Review';
};

export default function ClientDocumentDetailPage() {
  const params = useParams<{ companyId: string; runId: string }>();
  const { toast } = useToast();
  const t = useTranslations('AccountingClientDocuments');
  const companyId = decodeURIComponent(params.companyId);
  const runId = decodeURIComponent(params.runId);

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [documentDetail, setDocumentDetail] = useState<ClientDocumentDetail | null>(null);

  useEffect(() => {
    const loadDetail = async () => {
      setIsLoading(true);
      try {
        const [companySnap, runSnap] = await Promise.all([
          getDoc(doc(firestore, 'companies', companyId)),
          getDoc(doc(firestore, 'companies', companyId, 'payroll_runs', runId)),
        ]);

        if (!companySnap.exists() || !runSnap.exists()) {
          setDocumentDetail(null);
          return;
        }

        const companyData = companySnap.data() as Record<string, any>;
        const runData = runSnap.data() as Record<string, any>;
        const skippedCount = Number(runData.skippedCount ?? 0);
        const status = normalizeStatus(runData.reviewStatus, skippedCount);

        setDocumentDetail({
          runId,
          companyId,
          clientName: String(companyData.companyName ?? t('clientFallback')),
          documentName: `${t('payrollRunPrefix')} ${String(runData.monthLabel ?? runData.month ?? t('na'))}`,
          status,
          lastModified: toDateString(runData.createdAt),
          assignedTo: String(runData.processedByName ?? t('accountingTeam')),
          source: runData.source === 'manual' || runData.source === 'csv' ? runData.source : 'unknown',
          skippedCount,
          createdAt: toDateString(runData.createdAt),
          monthLabel: String(runData.monthLabel ?? runData.month ?? t('na')),
          type: 'Payroll',
        });
      } catch (error) {
        console.error('Client document detail load error:', error);
        toast({
          title: t('errorTitle'),
          description: t('detailLoadFailed'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [companyId, runId, t, toast]);

  const statusLabel = useMemo(() => {
    if (!documentDetail) return '';
    if (documentDetail.status === 'Pending Review') return t('pendingReview');
    if (documentDetail.status === 'Approved') return t('approved');
    if (documentDetail.status === 'Needs Action') return t('needsAction');
    return t('archived');
  }, [documentDetail, t]);

  const handleSetStatus = async (status: DocumentStatus) => {
    if (!documentDetail) return;

    try {
      setIsUpdating(true);
      await updateDoc(doc(firestore, 'companies', documentDetail.companyId, 'payroll_runs', documentDetail.runId), {
        reviewStatus: status,
      });

      setDocumentDetail((current) => (current ? { ...current, status } : current));
      const nextStatusLabel = status === 'Pending Review' ? t('pendingReview') : status === 'Approved' ? t('approved') : status === 'Needs Action' ? t('needsAction') : t('archived');
      toast({
        title: t('statusUpdated'),
        description: `${documentDetail.documentName} ${t('statusUpdatedDesc')} ${nextStatusLabel}.`,
      });
    } catch (error) {
      console.error('Client document detail status update error:', error);
      toast({
        title: t('updateFailed'),
        description: t('updateFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loadingDetail')}
      </div>
    );
  }

  if (!documentDetail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="px-0">
          <Link href="/accounting-firm/client-documents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToDocuments')}
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>{t('detailNotFoundTitle')}</CardTitle>
            <CardDescription>{t('detailNotFoundDescription')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="px-0">
        <Link href="/accounting-firm/client-documents">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToDocuments')}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{documentDetail.documentName}</h1>
        <p className="text-sm text-muted-foreground">{documentDetail.clientName}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{t('detailSummaryTitle')}</CardTitle>
            <CardDescription>{t('detailSummaryDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-y-4 sm:grid-cols-2 sm:gap-x-8">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('client')}</p>
                <p>{documentDetail.clientName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('status')}</p>
                <Badge variant={getStatusBadgeVariant(documentDetail.status)}>{statusLabel}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('runId')}</p>
                <p className="font-mono text-xs">{documentDetail.runId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('companyId')}</p>
                <p className="font-mono text-xs">{documentDetail.companyId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('typeLabel')}</p>
                <p>{documentDetail.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('monthLabel')}</p>
                <p>{documentDetail.monthLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('createdAt')}</p>
                <p>{documentDetail.createdAt}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('lastModified')}</p>
                <p>{documentDetail.lastModified}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('source')}</p>
                <p className="capitalize">{documentDetail.source}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('assignedTo')}</p>
                <p>{documentDetail.assignedTo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('skippedEntries')}</p>
                <p>{documentDetail.skippedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('detailActionsTitle')}</CardTitle>
            <CardDescription>{t('detailActionsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentDetail.status === 'Pending Review' && (
              <Button className="w-full justify-start" onClick={() => handleSetStatus('Approved')} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('approve')}
              </Button>
            )}
            {documentDetail.status === 'Needs Action' && (
              <Button className="w-full justify-start" variant="secondary" onClick={() => handleSetStatus('Pending Review')} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                {t('markReady')}
              </Button>
            )}
            <Button className="w-full justify-start" variant="outline" onClick={() => handleSetStatus('Archived')} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              {t('archive')}
            </Button>
            <Button className="w-full justify-start" variant="destructive" onClick={() => handleSetStatus('Needs Action')} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
              {t('flagNeedsAction')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
