'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Download, FileText, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations, useLocale } from 'next-intl';
import { resolveSwissLocale } from '@/lib/format';

// Mock data for demonstration purposes
const financialReportData = {
  summary: [
    { metric: 'Total Revenue', value: 'CHF 850,000.00' },
    { metric: 'Net Profit', value: 'CHF 120,500.75' },
    { metric: 'Operating Expenses', value: 'CHF 550,800.75' },
    { metric: 'Profit Margin', value: '14.18%' },
  ],
  monthlyBreakdown: [
    { month: 'April', revenue: 280000, profit: 45000 },
    { month: 'May', revenue: 310000, profit: 55000 },
    { month: 'June', revenue: 260000, profit: 20500 },
  ],
  expenseBreakdown: [
    { category: 'Cost of Goods Sold', cost: 'CHF 180,000.00' },
    { category: 'Salaries & Wages', cost: 'CHF 254,450.00' },
    { category: 'Marketing & Sales', cost: 'CHF 75,000.00' },
    { category: 'Rent & Utilities', cost: 'CHF 41,350.75' },
  ],
};

const reportTypes = [
  { value: 'financial_summary', label: 'Financial Summary' },
  { value: 'p_and_l', label: 'Profit & Loss (P&L)' },
  { value: 'expense_report', label: 'Expense Detail Report' },
];

const timePeriods = [
  { value: 'q2_2024', label: 'Q2 2024 (Apr-Jun)' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
];

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<typeof financialReportData | null>(null);
  const [selectedReport, setSelectedReport] = useState<string>('financial_summary');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('q2_2024');
  const t = useTranslations('BusinessDashboard.reports');
  const locale = useLocale();

  const handleGenerateReport = () => {
    setIsLoading(true);
    setReportData(null);
    // Simulate API call
    setTimeout(() => {
      setReportData(financialReportData);
      setIsLoading(false);
    }, 1500);
  };

  const formatCurrency = (value: number | string) => {
    if (typeof value === 'string') return value;
    return `CHF ${value.toLocaleString(resolveSwissLocale(locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('generator.title')}</CardTitle>
          <CardDescription>
            {t('generator.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectReportType')} />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(`types.${type.value}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectTimePeriod')} />
              </SelectTrigger>
              <SelectContent>
                {timePeriods.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {t(`periods.${period.value}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('generator.generating')}
                </>
              ) : (
                t('generator.button')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
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

      {reportData && !isLoading && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>{t('results.title')}</CardTitle>
                <CardDescription>{t('results.description')}</CardDescription>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" /> {t('results.exportCsv')}</Button>
                <Button className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" /> {t('results.downloadPdf')}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Monthly Breakdown Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('results.monthlyPerformance')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis tickFormatter={(value) => `CHF ${value / 1000}k`} fontSize={12} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Bar dataKey="revenue" name="Total Revenue" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Net Profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Department Breakdown Table */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('results.expenseBreakdown')}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.expenseBreakdown.map((row) => (
                      <TableRow key={row.category}>
                        <TableCell className="font-medium">{row.category}</TableCell>
                        <TableCell className="text-right">{row.cost}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {!reportData && !isLoading && (
        <Card className="flex items-center justify-center h-96 border-2 border-dashed">
            <div className="text-center text-muted-foreground p-8">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold">{t('empty.title')}</h3>
                <p>{t('empty.description')}</p>
            </div>
        </Card>
      )}

    </div>
  );
}
