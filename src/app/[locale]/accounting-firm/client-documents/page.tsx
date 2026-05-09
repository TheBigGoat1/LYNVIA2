'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/navigation';
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
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search, FileDown, Eye, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { firestore } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useTranslations } from 'next-intl';

type DocumentStatus = "Pending Review" | "Approved" | "Needs Action" | "Archived";

type ClientDocument = {
  id: string;
  runId: string;
  companyId: string;
  clientName: string;
  clientAvatar: string;
  documentName: string;
  type: string;
  status: DocumentStatus;
  lastModified: string;
  assignedTo: string;
  source: 'manual' | 'csv' | 'unknown';
  skippedCount: number;
};
const getStatusBadgeVariant = (status: DocumentStatus) => {
  switch (status) {
    case "Approved":
      return "default";
    case "Pending Review":
      return "secondary";
    case "Needs Action":
      return "destructive";
    case "Archived":
      return "outline";
    default:
      return "outline";
  }
};

const safeInitials = (name: string): string => {
  const value = name.trim();
  if (!value) return 'CL';
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'CL';
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

const exportToCsv = (rows: string[][], fileName: string) => {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const DocumentTable = ({
  docs,
  onSetStatus,
  t,
}: {
  docs: ClientDocument[];
  onSetStatus: (doc: ClientDocument, status: DocumentStatus) => Promise<void>;
  t: (key: string) => string;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('client')}</TableHead>
        <TableHead className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">{t('documentName')}</TableHead>
        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('status')}</TableHead>
        <TableHead className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">{t('lastModified')}</TableHead>
        <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('actions')}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {docs.map((item) => (
        <TableRow key={item.id} className="hover:bg-transparent">
          <TableCell>
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={item.clientAvatar} alt={item.clientName} />
                <AvatarFallback>{safeInitials(item.clientName)}</AvatarFallback>
              </Avatar>
              <div className="text-sm font-medium">{item.clientName}</div>
            </div>
          </TableCell>
          <TableCell className="hidden text-sm md:table-cell">{item.documentName}</TableCell>
          <TableCell>
            <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
              {item.status === 'Pending Review' ? t('pendingReview') : item.status === 'Approved' ? t('approved') : item.status === 'Needs Action' ? t('needsAction') : t('archived')}
            </Badge>
          </TableCell>
          <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{item.lastModified}</TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0">
                  <span className="sr-only">{t('openMenu')}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/accounting-firm/client-documents/${item.companyId}/${item.runId}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t('viewMetadata')}
                  </Link>
                </DropdownMenuItem>
                {item.status === 'Pending Review' && (
                  <DropdownMenuItem onClick={() => onSetStatus(item, 'Approved')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('approve')}
                  </DropdownMenuItem>
                )}
                {item.status === 'Needs Action' && (
                  <DropdownMenuItem onClick={() => onSetStatus(item, 'Pending Review')}>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {t('markReady')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onSetStatus(item, 'Archived')}>
                  <FileDown className="mr-2 h-4 w-4" />
                  {t('archive')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSetStatus(item, 'Needs Action')}>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {t('flagNeedsAction')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default function ClientDocumentsPage() {
  const { toast } = useToast();
  const t = useTranslations('AccountingClientDocuments');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [documents, setDocuments] = useState<ClientDocument[]>([]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const companiesQuery = query(collection(firestore, 'companies'), where('type', '==', 'business'));
      const companiesSnapshot = await getDocs(companiesQuery);

      const docs: ClientDocument[] = [];

      for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data() as Record<string, any>;
        const companyName = String(companyData.companyName ?? t('clientFallback'));

        const runsSnapshot = await getDocs(collection(firestore, 'companies', companyDoc.id, 'payroll_runs'));
        runsSnapshot.docs.forEach((runDoc) => {
          const runData = runDoc.data() as Record<string, any>;
          const skippedCount = Number(runData.skippedCount ?? 0);
          const reviewStatus = normalizeStatus(runData.reviewStatus, skippedCount);

          docs.push({
            id: `${companyDoc.id}-${runDoc.id}`,
            runId: runDoc.id,
            companyId: companyDoc.id,
            clientName: companyName,
            clientAvatar: '',
            documentName: `${t('payrollRunPrefix')} ${String(runData.monthLabel ?? runData.month ?? t('na'))}`,
            type: 'Payroll',
            status: reviewStatus,
            lastModified: toDateString(runData.createdAt),
            assignedTo: String(runData.processedByName ?? t('accountingTeam')),
            source: runData.source === 'manual' || runData.source === 'csv' ? runData.source : 'unknown',
            skippedCount,
          });
        });
      }

      docs.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
      setDocuments(docs);
    } catch (error) {
      console.error('Client documents load error:', error);
      toast({
        title: t('errorTitle'),
        description: t('loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [t]);

  const handleSetStatus = async (item: ClientDocument, status: DocumentStatus) => {
    try {
      const runRef = doc(firestore, 'companies', item.companyId, 'payroll_runs', item.runId);
      await updateDoc(runRef, { reviewStatus: status });
      setDocuments((prev) => prev.map((current) => (current.id === item.id ? { ...current, status } : current)));
      const statusLabel = status === 'Pending Review' ? t('pendingReview') : status === 'Approved' ? t('approved') : status === 'Needs Action' ? t('needsAction') : t('archived');
      toast({ title: t('statusUpdated'), description: `${item.documentName} ${t('statusUpdatedDesc')} ${statusLabel}.` });
    } catch (error) {
      console.error('Update document status error:', error);
      toast({
        title: t('updateFailed'),
        description: t('updateFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = useMemo(() => {
    const queryText = searchTerm.trim().toLowerCase();
    if (!queryText) return documents;
    return documents.filter((docRow) => (
      docRow.clientName.toLowerCase().includes(queryText)
      || docRow.documentName.toLowerCase().includes(queryText)
      || docRow.assignedTo.toLowerCase().includes(queryText)
    ));
  }, [documents, searchTerm]);

  const pendingReviewCount = filteredDocuments.filter((item) => item.status === 'Pending Review').length;
  const needsActionCount = filteredDocuments.filter((item) => item.status === 'Needs Action').length;

  const handleExport = () => {
    const rows = [
        [t('client'), t('documentName'), t('status'), t('lastModified'), t('assignedTo'), t('source'), t('skippedEntries')],
      ...filteredDocuments.map((item) => [
        item.clientName,
        item.documentName,
        item.status,
        item.lastModified,
        item.assignedTo,
        item.source,
        item.skippedCount,
      ]),
    ];
    exportToCsv(rows, 'accounting-client-documents.csv');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('pageSubtitle')}
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">{t('hubTitle')}</CardTitle>
              <CardDescription className="text-sm">
                {t('hubDescription')}
              </CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="h-9 pl-9 w-full text-sm sm:w-[300px]"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={filteredDocuments.length === 0}>
                <FileDown className="mr-2 h-3.5 w-3.5" />
                {t('export')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('loadingDocs')}
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-none border-b border-border/60 bg-transparent p-0 text-xs sm:grid-cols-4 sm:max-w-2xl">
                <TabsTrigger
                  value="all"
                  className="rounded-md border border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none hover:bg-background/40 hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-background/90 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {t('all')} ({filteredDocuments.length})
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="rounded-md border border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none hover:bg-background/40 hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-background/90 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {t('pendingTab')} {pendingReviewCount > 0 ? `(${pendingReviewCount})` : ''}
                </TabsTrigger>
                <TabsTrigger
                  value="action"
                  className="rounded-md border border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none hover:bg-background/40 hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-background/90 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {t('actionTab')} {needsActionCount > 0 ? `(${needsActionCount})` : ''}
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="rounded-md border border-transparent bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground shadow-none hover:bg-background/40 hover:text-foreground data-[state=active]:border-border data-[state=active]:bg-background/90 data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  {t('approvedTab')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-3">
                {filteredDocuments.length > 0 ? (
                  <DocumentTable docs={filteredDocuments} onSetStatus={handleSetStatus} t={t} />
                ) : (
                  <div className="text-sm text-muted-foreground py-6 text-center">{t('noDocs')}</div>
                )}
              </TabsContent>
              <TabsContent value="pending" className="mt-3">
                <DocumentTable docs={filteredDocuments.filter((docRow) => docRow.status === 'Pending Review')} onSetStatus={handleSetStatus} t={t} />
              </TabsContent>
              <TabsContent value="action" className="mt-3">
                <DocumentTable docs={filteredDocuments.filter((docRow) => docRow.status === 'Needs Action')} onSetStatus={handleSetStatus} t={t} />
              </TabsContent>
              <TabsContent value="approved" className="mt-3">
                <DocumentTable docs={filteredDocuments.filter((docRow) => docRow.status === 'Approved' || docRow.status === 'Archived')} onSetStatus={handleSetStatus} t={t} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
