'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, FileText, Loader2, Users, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore, storage } from '@/firebase/config';
import { collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

type ClientEntry = { id: string; name: string };

type ReportData = {
  summary: { metric: string; value: string }[];
  monthlyBreakdown: { month: string; revenue: number; profit: number }[];
  expenseBreakdown: { category: string; amount: string }[];
};

const reportTypes = [
  { value: 'p_and_l', label: 'Profit & Loss Statement' },
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'cash_flow', label: 'Cash Flow Statement' },
];

const timePeriods = [
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'last_12_months', label: 'Last 12 Months' },
];
export default function FinancialReportsPage() {
  const t = useTranslations('AccountingFinancialReports');
  const { user } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string>('p_and_l');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('last_30_days');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load clients from Firestore
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const userSnap = await getDoc(doc(firestore, 'users', user.uid));
        const firmCompanyId = userSnap.data()?.companyId;
        if (!firmCompanyId) return;
        const snap = await getDocs(
          query(collection(firestore, 'companies'), where('accountingFirmId', '==', firmCompanyId))
        );
        setClients(snap.docs.map(d => ({ id: d.id, name: d.data().companyName || d.id })));
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    load();
  }, [user]);

  const getPeriodRange = (period: string): Date => {
    const now = new Date();
    if (period === 'last_30_days') return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (period === 'last_90_days') return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  };

  const handleGenerateReport = async () => {
    if (!selectedClient) return;
    setIsLoading(true);
    setReportData(null);
    try {
      const periodStart = getPeriodRange(selectedPeriod);
      const payrollSnap = await getDocs(collection(firestore, 'companies', selectedClient, 'payroll_runs'));
      const runs = payrollSnap.docs
        .map(d => d.data())
        .filter(r => {
          const ts = r.createdAt?.toDate?.() ?? new Date(0);
          return ts >= periodStart;
        });

      // Aggregate real payroll data
      let totalGross = 0;
      let totalNet = 0;
      let totalAVS = 0;
      let totalLPP = 0;
      let totalAC = 0;
      let totalLAA = 0;
      const monthlyMap: Record<string, { revenue: number; profit: number }> = {};

      for (const run of runs) {
        const entries: any[] = run.entries || [];
        for (const entry of entries) {
          const gross = Number(entry.grossSalary || entry.gross || 0);
          const net = Number(entry.netSalary || entry.net || 0);
          totalGross += gross;
          totalNet += net;
          totalAVS += Number(entry.avsDeduction || 0);
          totalLPP += Number(entry.lppDeduction || 0);
          totalAC += Number(entry.acDeduction || 0);
          totalLAA += Number(entry.laaDeduction || 0);
        }
        const ts = run.createdAt?.toDate?.() ?? new Date();
        const monthKey = ts.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { revenue: 0, profit: 0 };
        const runGross = entries.reduce((s: number, e: any) => s + Number(e.grossSalary || e.gross || 0), 0);
        const runNet = entries.reduce((s: number, e: any) => s + Number(e.netSalary || e.net || 0), 0);
        monthlyMap[monthKey].revenue += runGross;
        monthlyMap[monthKey].profit += runNet;
      }

      const totalDeductions = totalGross - totalNet;
      const fmt = (v: number) => `CHF ${v.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      setReportData({
        summary: [
          { metric: 'Total Gross Salaries', value: fmt(totalGross) },
          { metric: 'Total Net Salaries', value: fmt(totalNet) },
          { metric: 'Total Deductions', value: fmt(totalDeductions) },
        ],
        monthlyBreakdown: Object.entries(monthlyMap).map(([month, data]) => ({
          month: month.split(' ')[0],
          revenue: data.revenue,
          profit: data.profit,
        })),
        expenseBreakdown: [
          { category: 'AVS/AHV', amount: fmt(totalAVS) },
          { category: 'LPP/BVG', amount: fmt(totalLPP) },
          { category: 'AC/ALV', amount: fmt(totalAC) },
          { category: 'LAA/UVG', amount: fmt(totalLAA) },
        ].filter(r => r.amount !== fmt(0)),
      });

      if (runs.length === 0) {
        toast({ title: 'No data', description: 'No payroll runs found for the selected period.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ title: 'Error', description: 'Could not generate report.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!reportData) return;
    const rows = [
      ['Metric', 'Value'],
      ...reportData.summary.map(r => [r.metric, r.value]),
      [],
      ['Month', 'Gross', 'Net'],
      ...reportData.monthlyBreakdown.map(r => [r.month, String(r.revenue), String(r.profit)]),
      [],
      ['Category', 'Amount'],
      ...reportData.expenseBreakdown.map(r => [r.category, r.amount]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'financial-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    let y = 15;
    pdf.setFontSize(16);
    pdf.text(`Financial Report \u2014 ${selectedClientName}`, 10, y); y += 12;
    pdf.setFontSize(11);
    for (const row of reportData.summary) { pdf.text(`${row.metric}: ${row.value}`, 10, y); y += 7; }
    y += 5;
    pdf.text('Monthly Breakdown:', 10, y); y += 7;
    for (const row of reportData.monthlyBreakdown) { pdf.text(`${row.month}: Gross ${formatCurrency(row.revenue)} / Net ${formatCurrency(row.profit)}`, 14, y); y += 7; }
    y += 5;
    pdf.text('Deduction Breakdown:', 10, y); y += 7;
    for (const row of reportData.expenseBreakdown) { pdf.text(`${row.category}: ${row.amount}`, 14, y); y += 7; }
    pdf.save('financial-report.pdf');
  };

  const handleFileUpload = async () => {
    if (!uploadedFile || !selectedClient || !user) return;
    setIsUploading(true);
    try {
      const fileRef = storageRef(storage, `companies/${selectedClient}/reports/${Date.now()}_${uploadedFile.name}`);
      await uploadBytes(fileRef, uploadedFile);
      const url = await getDownloadURL(fileRef);
      toast({ title: 'File uploaded', description: `${uploadedFile.name} has been uploaded successfully.` });
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Could not upload file.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatCurrency = (value: number | string) => {
    if (typeof value === 'string') return value;
    return `CHF ${value.toLocaleString('de-CH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  const selectedClientName = clients.find(c => c.id === selectedClient)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">
          {t('pageSubtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reportGenerator')}</CardTitle>
          <CardDescription>
            {t('reportGeneratorDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <Select onValueChange={(value) => { setSelectedClient(value); setReportData(null); }}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedReport} onValueChange={setSelectedReport} disabled={!selectedClient}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectReportType')} />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={!selectedClient}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectTimePeriod')} />
              </SelectTrigger>
              <SelectContent>
                {timePeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateReport} disabled={isLoading || !selectedClient} className="w-full lg:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                t('generateReport')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('uploadTitle')}</CardTitle>
          <CardDescription>
            {t('uploadDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{t('templateHint')}</p>
                <Button variant="outline" onClick={() => {
                  const csv = 'employee_name,gross_salary,avs,lpp,ac,laa,net_salary\n';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'data-template.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  {t('downloadTemplate')}
                </Button>
            </div>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">{t('clickToUpload')}</span> {t('dragDrop')}</p>
                        <p className="text-xs text-muted-foreground">CSV, XLS, or XLSX (MAX. 10MB)</p>
                    </div>
                    <Input id="dropzone-file" ref={fileInputRef} type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadedFile(f); }} />
                </label>
            </div>
        </CardContent>
          <CardFooter className="justify-end gap-2">
            {uploadedFile && <span className="text-sm text-muted-foreground mr-auto">{uploadedFile.name}</span>}
            <Button disabled={!uploadedFile || !selectedClient || isUploading} onClick={handleFileUpload}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {t('uploadProcess')}
            </Button>
        </CardFooter>
      </Card>
      
      {!selectedClient && (
         <Card className="flex items-center justify-center h-96 border-2 border-dashed">
            <div className="text-center text-muted-foreground p-8">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">{t('noClientTitle')}</h3>
                <p>{t('noClientDesc')}</p>
            </div>
        </Card>
      )}

      {selectedClient && isLoading && (
        <Card>
            <CardHeader>
                <Skeleton className="h-7 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
      )}

      {selectedClient && reportData && !isLoading && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>{t('pnlTitle')} - {selectedClientName}</CardTitle>
                <CardDescription>{t('pnlDesc')}</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportCsv}><Download className="mr-2 h-4 w-4" /> {t('exportCsv')}</Button>
                <Button className="w-full sm:w-auto" onClick={handleDownloadPdf}><Download className="mr-2 h-4 w-4" /> {t('downloadPdf')}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Monthly Breakdown Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('monthlyBreakdown')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis tickFormatter={(value) => `CHF ${value / 1000}k`} fontSize={12} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Bar dataKey="revenue" name={t('revenue')} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name={t('profit')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Breakdown Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('expenseBreakdown')}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('category')}</TableHead>
                      <TableHead className="text-right">{t('amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.expenseBreakdown.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell className="font-medium">{row.category}</TableCell>
                        <TableCell className="text-right">{row.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {selectedClient && !reportData && !isLoading && (
        <Card className="flex items-center justify-center h-96 border-2 border-dashed">
            <div className="text-center text-muted-foreground p-8">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">{t('reportForClient')} {selectedClientName}</h3>
                <p>{t('reportForClientDesc')}</p>
            </div>
        </Card>
      )}

    </div>
  );
}

    