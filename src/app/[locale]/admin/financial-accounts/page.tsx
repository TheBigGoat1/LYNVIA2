'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  orderBy,
  addDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, BarChart3, CheckCircle, Bot, Plus, Trash2, Settings, X } from 'lucide-react';
import { cfoFinancialAnalyzer, type CFOFinancialAnalyzerOutput } from '@/ai/flows/cfo-financial-analyzer';

type Company = { id: string; companyName: string };

type CustomCostCentre = {
  id: string;
  name: string;
  description?: string;
  createdAt?: { seconds: number };
};

type CFOEntry = {
  period: string;
  turnover: number;
  purchases: number;
  rawWages: number;
  salaryExpenses: number;
  operatingCosts: number;
  financialCharges: number;
  otherCharges: number;
  customCostCentres?: Record<string, number>; // { costCentreId: value }
  profitOrLoss: number;
  updatedAt?: { seconds: number };
  aiAnalysis?: CFOFinancialAnalyzerOutput;
};

const FIELDS: { key: keyof Omit<CFOEntry, 'period' | 'updatedAt' | 'aiAnalysis'>; tKey: string }[] = [
  { key: 'turnover', tKey: 'turnover' },
  { key: 'purchases', tKey: 'purchases' },
  { key: 'rawWages', tKey: 'rawWages' },
  { key: 'salaryExpenses', tKey: 'salaryExpenses' },
  { key: 'operatingCosts', tKey: 'operatingCosts' },
  { key: 'financialCharges', tKey: 'financialCharges' },
  { key: 'otherCharges', tKey: 'otherCharges' },
  { key: 'profitOrLoss', tKey: 'profitOrLoss' },
];

const EMPTY_FIGURES = (): Record<string, string> =>
  Object.fromEntries(FIELDS.map((f) => [f.key, '']));

export default function AdminFinancialAccountsPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('FinancialAccounts');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const formatDateToSwiss = (iso: string) => {
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    return `${day}.${month}.${year}`;
  };
  const periodLabel =
    periodFrom && periodTo
      ? `${formatDateToSwiss(periodFrom)} – ${formatDateToSwiss(periodTo)}`
      : '';
  const [figures, setFigures] = useState<Record<string, string>>(EMPTY_FIGURES());
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [history, setHistory] = useState<CFOEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Custom cost centres state
  const [customCostCentres, setCustomCostCentres] = useState<CustomCostCentre[]>([]);
  const [customCostCentresLoading, setCustomCostCentresLoading] = useState(false);
  const [customCCValues, setCustomCCValues] = useState<Record<string, string>>({});
  const [costCentreDialogOpen, setCostCentreDialogOpen] = useState(false);
  const [newCostCentreName, setNewCostCentreName] = useState('');
  const [newCostCentreDesc, setNewCostCentreDesc] = useState('');
  const [addingCostCentre, setAddingCostCentre] = useState(false);

  // Load companies list
  useEffect(() => {
    const q = query(collection(firestore, 'companies'), orderBy('companyName'));
    const unsub = onSnapshot(q, (snap) => {
      setCompanies(
        snap.docs.map((d) => ({
          id: d.id,
          companyName: String(d.data().companyName ?? d.id),
        }))
      );
    });
    return unsub;
  }, []);

  // Load history when company changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    const q = query(
      collection(firestore, 'companies', selectedCompanyId, 'cfo_summaries'),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => ({ ...(d.data() as CFOEntry), period: d.id })));
      setHistoryLoading(false);
    });
    return unsub;
  }, [selectedCompanyId]);

  // Load custom cost centres when company changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setCustomCostCentres([]);
      setCustomCCValues({});
      return;
    }
    setCustomCostCentresLoading(true);
    const q = query(
      collection(firestore, 'companies', selectedCompanyId, 'cost_centres'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const centres = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomCostCentre, 'id'>) }));
      setCustomCostCentres(centres);
      // Initialize values for any new centres
      setCustomCCValues(prev => {
        const updated = { ...prev };
        centres.forEach(cc => {
          if (!(cc.id in updated)) updated[cc.id] = '';
        });
        return updated;
      });
      setCustomCostCentresLoading(false);
    });
    return unsub;
  }, [selectedCompanyId]);

  // Add a new custom cost centre
  const handleAddCostCentre = async () => {
    if (!selectedCompanyId || !newCostCentreName.trim()) return;
    setAddingCostCentre(true);
    try {
      await addDoc(collection(firestore, 'companies', selectedCompanyId, 'cost_centres'), {
        name: newCostCentreName.trim(),
        description: newCostCentreDesc.trim() || '',
        createdAt: serverTimestamp(),
      });
      toast({ title: t('toast.costCentreAdded'), description: t('toast.costCentreAddedDesc', { name: newCostCentreName }) });
      setNewCostCentreName('');
      setNewCostCentreDesc('');
    } catch (err) {
      console.error('Failed to add cost centre:', err);
      toast({ title: t('toast.error'), description: t('toast.costCentreAddFailed'), variant: 'destructive' });
    } finally {
      setAddingCostCentre(false);
    }
  };

  // Remove a custom cost centre
  const handleRemoveCostCentre = async (ccId: string, ccName: string) => {
    if (!selectedCompanyId) return;
    try {
      await deleteDoc(doc(firestore, 'companies', selectedCompanyId, 'cost_centres', ccId));
      setCustomCCValues(prev => {
        const updated = { ...prev };
        delete updated[ccId];
        return updated;
      });
      toast({ title: t('toast.costCentreRemoved'), description: t('toast.costCentreRemovedDesc', { name: ccName }) });
    } catch (err) {
      console.error('Failed to remove cost centre:', err);
      toast({ title: t('toast.error'), description: t('toast.costCentreRemoveFailed'), variant: 'destructive' });
    }
  };

  // Notify company users that financial analysis is ready
  const notifyCompanyUsers = async (companyId: string, periodName: string, companyName: string) => {
    try {
      // Find all users associated with this company
      const usersQuery = query(collection(firestore, 'users'), where('companyId', '==', companyId));
      const usersSnap = await getDocs(usersQuery);

      for (const userDoc of usersSnap.docs) {
        await addDoc(collection(firestore, 'users', userDoc.id, 'notifications'), {
          title: 'Financial analysis ready',
          description: `Your financial analysis is ready for ${periodName} 2026. You can generate it now.`,
          type: 'cfo_analysis_ready',
          read: false,
          link: '/business/virtual-cfo',
          companyId,
          companyName,
          period: periodName,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Failed to notify company users:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedCompanyId || !periodLabel) {
      toast({ title: t('toast.missingFields'), description: t('toast.missingFieldsDesc'), variant: 'destructive' });
      return;
    }

    const parsed: Record<string, number> = {};
    for (const f of FIELDS) {
      const val = Number(figures[f.key]);
      if (isNaN(val)) {
        toast({ title: t('toast.invalidNumber'), description: t('toast.invalidNumberDesc', { field: t(`figures.${f.tKey}`) }), variant: 'destructive' });
        return;
      }
      parsed[f.key] = val;
    }

    // Parse custom cost centre values
    const customCCParsed: Record<string, number> = {};
    for (const cc of customCostCentres) {
      const val = Number(customCCValues[cc.id] || 0);
      if (isNaN(val)) {
        toast({ title: t('toast.invalidNumber'), description: t('toast.customCCInvalidDesc', { name: cc.name }), variant: 'destructive' });
        return;
      }
      customCCParsed[cc.id] = val;
    }

    setSaving(true);
    try {
      const entry = {
        ...parsed,
        customCostCentres: customCCParsed,
        period: periodLabel,
        periodFrom,
        periodTo,
        updatedAt: serverTimestamp(),
      };

      // Write to period-specific doc AND to 'latest'
      await setDoc(doc(firestore, 'companies', selectedCompanyId, 'cfo_summaries', periodLabel), entry);
      await setDoc(doc(firestore, 'companies', selectedCompanyId, 'cfo_summaries', 'latest'), entry);

      toast({ title: t('toast.accountsSaved'), description: t('toast.accountsSavedDesc', { period: periodLabel }) });

      // Trigger AI analysis
      setAnalyzing(true);
      try {
        const companySnap = await getDoc(doc(firestore, 'companies', selectedCompanyId));
        const companyName = String(companySnap.data()?.companyName ?? selectedCompanyId);

        const aiResult = await cfoFinancialAnalyzer({
          companyId: selectedCompanyId,
          companyName,
          period: periodLabel,
          ...parsed,
        } as Parameters<typeof cfoFinancialAnalyzer>[0]);

        // Store analysis back onto both docs
        const withAnalysis = { aiAnalysis: aiResult };
        await setDoc(
          doc(firestore, 'companies', selectedCompanyId, 'cfo_summaries', periodLabel),
          withAnalysis,
          { merge: true }
        );
        await setDoc(
          doc(firestore, 'companies', selectedCompanyId, 'cfo_summaries', 'latest'),
          withAnalysis,
          { merge: true }
        );

        // Log the event
        await addDoc(collection(firestore, 'system_logs'), {
          timestamp: serverTimestamp(),
          level: 'INFO',
          service: 'CFO-AI',
          message: `Financial accounts + AI analysis saved for company ${companyName}`,
          details: { companyId: selectedCompanyId, period: periodLabel, adminUid: user?.uid },
        });

        // Notify company users that their financial analysis is ready
        await notifyCompanyUsers(selectedCompanyId, periodLabel, companyName);

        toast({ title: t('toast.aiComplete'), description: t('toast.aiCompleteDesc') });
      } catch (aiErr) {
        console.error('AI analysis failed:', aiErr);
        toast({ title: t('toast.aiFailed'), description: t('toast.aiFailedDesc'), variant: 'destructive' });
      } finally {
        setAnalyzing(false);
      }

      // Reset form
      setPeriodFrom('');
      setPeriodTo('');
      setFigures(EMPTY_FIGURES());
      setCustomCCValues({});
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: t('toast.saveFailed'), description: t('toast.saveFailedDesc'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedCompanyName = companies.find((c) => c.id === selectedCompanyId)?.companyName ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      {/* Entry form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('entryTitle')}
          </CardTitle>
          <CardDescription>{t('entryDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('companyLabel')}</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCompany')} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {c.companyName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('periodLabel')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="periodFrom" className="text-xs text-muted-foreground">{t('periodFrom')}</Label>
                  <input
                    id="periodFrom"
                    type="date"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="periodTo" className="text-xs text-muted-foreground">{t('periodTo')}</Label>
                  <input
                    id="periodTo"
                    type="date"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={periodTo}
                    min={periodFrom || undefined}
                    onChange={(e) => setPeriodTo(e.target.value)}
                  />
                </div>
              </div>
              {periodLabel && (
                <p className="text-xs text-muted-foreground">
                  Period: <strong>{periodLabel}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{t(`figures.${f.tKey}`)}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CHF</span>
                  <Input
                    id={f.key}
                    type="number"
                    className="pl-10"
                    placeholder="0"
                    value={figures[f.key]}
                    onChange={(e) => setFigures((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Custom Cost Centres Section */}
          {selectedCompanyId && (
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t('costCentresTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t('costCentresDescription')}</p>
                </div>
                <Dialog open={costCentreDialogOpen} onOpenChange={setCostCentreDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('manageCostCentres')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('manageCostCentres')}</DialogTitle>
                      <DialogDescription>
                        {t('manageCostCentresDesc', { name: selectedCompanyName || t('thisCompany') })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Add new cost centre */}
                      <div className="space-y-3 border-b pb-4">
                        <Label>{t('addCostCentre')}</Label>
                        <Input
                          placeholder={t('costCentreNamePlaceholder')}
                          value={newCostCentreName}
                          onChange={(e) => setNewCostCentreName(e.target.value)}
                        />
                        <Input
                          placeholder={t('costCentreDescPlaceholder')}
                          value={newCostCentreDesc}
                          onChange={(e) => setNewCostCentreDesc(e.target.value)}
                        />
                        <Button
                          onClick={handleAddCostCentre}
                          disabled={addingCostCentre || !newCostCentreName.trim()}
                          size="sm"
                        >
                          {addingCostCentre ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('adding')}</>
                          ) : (
                            <><Plus className="mr-2 h-4 w-4" />{t('addCostCentre')}</>
                          )}
                        </Button>
                      </div>

                      {/* Existing cost centres */}
                      <div className="space-y-2">
                        <Label>{t('existingCostCentres')}</Label>
                        {customCostCentresLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground py-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                          </div>
                        ) : customCostCentres.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">
                            {t('noCostCentres')}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {customCostCentres.map((cc) => (
                              <div
                                key={cc.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div>
                                  <p className="font-medium">{cc.name}</p>
                                  {cc.description && (
                                    <p className="text-sm text-muted-foreground">{cc.description}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveCostCentre(cc.id, cc.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCostCentreDialogOpen(false)}>
                        {t('done')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Custom cost centre input fields */}
              {customCostCentresLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading cost centres…
                </div>
              ) : customCostCentres.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t('noCostCentresHint')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {customCostCentres.map((cc) => (
                    <div key={cc.id} className="space-y-2">
                      <Label htmlFor={`cc-${cc.id}`}>{cc.name}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CHF</span>
                        <Input
                          id={`cc-${cc.id}`}
                          type="number"
                          className="pl-10"
                          placeholder="0"
                          value={customCCValues[cc.id] || ''}
                          onChange={(e) =>
                            setCustomCCValues((prev) => ({ ...prev, [cc.id]: e.target.value }))
                          }
                        />
                      </div>
                      {cc.description && (
                        <p className="text-xs text-muted-foreground">{cc.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || analyzing || !selectedCompanyId}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</>
              ) : analyzing ? (
                <><Bot className="mr-2 h-4 w-4 animate-spin" />{t('analyzing')}</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" />{t('saveButton')}</>
              )}
            </Button>
            {analyzing && (
              <p className="text-sm text-muted-foreground">{t('analyzingHint')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History table */}
      {selectedCompanyId && (
        <Card>
          <CardHeader>
            <CardTitle>{t('historyTitle', { name: selectedCompanyName })}</CardTitle>
            <CardDescription>{t('historyDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : history.filter((e) => e.period !== 'latest').length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t('history.empty')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('history.period')}</TableHead>
                    <TableHead className="text-right">{t('history.turnover')}</TableHead>
                    <TableHead className="text-right">{t('history.salaryExpenses')}</TableHead>
                    <TableHead className="text-right">{t('history.profitOrLoss')}</TableHead>
                    <TableHead>{t('history.aiAnalysis')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history
                    .filter((e) => e.period !== 'latest')
                    .map((entry) => (
                      <TableRow key={entry.period}>
                        <TableCell className="font-medium">{entry.period}</TableCell>
                        <TableCell className="text-right">
                          {entry.turnover?.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.salaryExpenses?.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={entry.profitOrLoss >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {entry.profitOrLoss >= 0 ? '+' : ''}
                            {entry.profitOrLoss?.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.aiAnalysis ? (
                            <Badge variant="secondary" className="gap-1">
                              <Bot className="h-3 w-3" /> {t('history.analysisDone')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">{t('history.analysisPending')}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
