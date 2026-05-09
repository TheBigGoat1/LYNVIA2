'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { useLocale, useTranslations } from 'next-intl';
import { firestore } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Users, Banknote, Settings2, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import {
  computeEstimatedGross,
  VEHICLE_RATE_CHF_PER_KM,
} from '@/lib/business/monthly-payroll-compute';

type CompanyRates = {
  avs: number;
  ac: number;
  laa: number;
  ijm: number;
  lpp: number;
  caf: number;
};

const DEFAULT_RATES: CompanyRates = {
  avs: 0.0530,
  ac: 0.0110,
  laa: 0.0150,
  ijm: 0.0210,
  lpp: 0.0350,
  caf: 0.00171,
};

type Employee = {
  id: string;
  prenom: string;
  nom: string;
  typeRemu: 'horaire' | 'mensuel';
  salaireMensuel: number;
  salaireHoraire: number;
  tauxActivite: number;
  fonction: string;
};

type MonthlySubmissionData = {
  month: string;
  hours: number;
  feesToReimburse: number;
  feesToDeduct: number;
  privateVehicleKm: number;
  mealsToReimburse: number;
  mealsToDeduct: number;
  bonus: number;
  prime: number;
  estimatedGross: number;
  submittedAt: string;
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function computeCosts(monthlySalary: number, rates: CompanyRates) {
  const avs = monthlySalary * rates.avs;
  const ac = monthlySalary * rates.ac;
  const laa = monthlySalary * rates.laa;
  const ijm = monthlySalary * rates.ijm;
  const lpp = monthlySalary * rates.lpp;
  const caf = monthlySalary * rates.caf;
  const totalCharges = avs + ac + laa + ijm + lpp + caf;
  const totalCost = monthlySalary + totalCharges;
  return { totalCharges, totalCost };
}

function resolveSwissLocale(locale: string) {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'en') {
    return `${normalized}-CH`;
  }
  return 'en-CH';
}

function fmtCHF(value: number, locale: string) {
  return value.toLocaleString(resolveSwissLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(value: number, locale: string) {
  const formatter = new Intl.NumberFormat(resolveSwissLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatter.format(value * 100)}%`;
}

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNum(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function toEmployee(id: string, data: Record<string, unknown>): Employee {
  const typeRemu = data.typeRemu === 'horaire' ? 'horaire' : 'mensuel';
  const prenom = toStr(data.prenom) || toStr(data.firstName);
  const nom = toStr(data.nom) || toStr(data.lastName);
  const fonction = toStr(data.fonction) || toStr(data.position);
  return {
    id,
    prenom,
    nom,
    typeRemu,
    salaireMensuel: toNum(data.salaireMensuel),
    salaireHoraire: toNum(data.salaireHoraire),
    tauxActivite: toNum(data.tauxActivite) || 100,
    fonction,
  };
}

function parseNum(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

export default function PayslipsCommunicationsPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const locale = useLocale();
  const t = useTranslations('PayrollProcessing');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rates, setRates] = useState<CompanyRates>(DEFAULT_RATES);
  const [editedRates, setEditedRates] = useState<CompanyRates>(DEFAULT_RATES);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [showRatesEditor, setShowRatesEditor] = useState(false);

  /** Calendar month (YYYY-MM) driving the payroll table, Firestore `monthlyPayroll/{month}` doc, and breakdown estimates. */
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState(getCurrentMonth);
  const [monthlySubmissions, setMonthlySubmissions] = useState<Record<string, MonthlySubmissionData>>({});

  // Submission dialog state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formMonth, setFormMonth] = useState(getCurrentMonth);
  const [formHours, setFormHours] = useState('');
  const [formFeesToReimburse, setFormFeesToReimburse] = useState('');
  const [formFeesToDeduct, setFormFeesToDeduct] = useState('');
  const [formPrivateVehicleKm, setFormPrivateVehicleKm] = useState('');
  const [formMealsToReimburse, setFormMealsToReimburse] = useState('');
  const [formMealsToDeduct, setFormMealsToDeduct] = useState('');
  const [formBonus, setFormBonus] = useState('');
  const [formPrime, setFormPrime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rateLabels: Record<keyof CompanyRates, string> = {
    avs: t('salaryCostOverview.rateLabels.avs'),
    ac: t('salaryCostOverview.rateLabels.ac'),
    laa: t('salaryCostOverview.rateLabels.laa'),
    ijm: t('salaryCostOverview.rateLabels.ijm'),
    lpp: t('salaryCostOverview.rateLabels.lpp'),
    caf: t('salaryCostOverview.rateLabels.caf'),
  };

  useEffect(() => {
    if (!user) return;
    getDoc(doc(firestore, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        const cid = snap.data().companyId as string | undefined;
        if (cid) setCompanyId(cid);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!companyId) return;
    getDoc(doc(firestore, 'companies', companyId, 'settings', 'rates')).then((snap) => {
      if (snap.exists()) {
        const merged = { ...DEFAULT_RATES, ...(snap.data() as Partial<CompanyRates>) };
        setRates(merged);
        setEditedRates(merged);
      }
    });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setIsLoadingEmployees(false);
      return;
    }
    const employeesQuery = query(
      collection(firestore, 'companies', companyId, 'employees'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(
      employeesQuery,
      (snap) => {
        setEmployees(snap.docs.map((employeeDoc) => toEmployee(employeeDoc.id, employeeDoc.data())));
        setIsLoadingEmployees(false);
      },
      () => setIsLoadingEmployees(false)
    );
    return () => unsubscribe();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const unsub = onSnapshot(
      doc(firestore, 'companies', companyId, 'monthlyPayroll', selectedPayrollMonth),
      (snap) => {
        if (snap.exists()) {
          setMonthlySubmissions(snap.data() as Record<string, MonthlySubmissionData>);
        } else {
          setMonthlySubmissions({});
        }
      }
    );
    return () => unsub();
  }, [companyId, selectedPayrollMonth]);

  const handleSaveRates = async () => {
    if (!companyId || !user) return;
    setIsSavingRates(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/business/company-rates', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedRates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : res.statusText);
      }
      setRates(editedRates);
      setShowRatesEditor(false);
      toast({
        title: t('salaryCostOverview.toast.savedTitle'),
        description: t('salaryCostOverview.toast.savedDescription'),
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t('salaryCostOverview.toast.savedTitle'),
        description: e instanceof Error ? e.message : 'Failed to save rates',
      });
    } finally {
      setIsSavingRates(false);
    }
  };

  function openEmployeeForm(employee: Employee) {
    setSelectedEmployee(employee);
    const existing = monthlySubmissions[employee.id];
    if (existing) {
      setFormMonth(existing.month);
      setFormHours(existing.hours ? String(existing.hours) : '');
      setFormFeesToReimburse(existing.feesToReimburse ? String(existing.feesToReimburse) : '');
      setFormFeesToDeduct(existing.feesToDeduct ? String(existing.feesToDeduct) : '');
      setFormPrivateVehicleKm(existing.privateVehicleKm ? String(existing.privateVehicleKm) : '');
      setFormMealsToReimburse(existing.mealsToReimburse ? String(existing.mealsToReimburse) : '');
      setFormMealsToDeduct(existing.mealsToDeduct ? String(existing.mealsToDeduct) : '');
      setFormBonus(existing.bonus ? String(existing.bonus) : '');
      setFormPrime(existing.prime ? String(existing.prime) : '');
    } else {
      setFormMonth(selectedPayrollMonth);
      setFormHours('');
      setFormFeesToReimburse('');
      setFormFeesToDeduct('');
      setFormPrivateVehicleKm('');
      setFormMealsToReimburse('');
      setFormMealsToDeduct('');
      setFormBonus('');
      setFormPrime('');
    }
  }

  const handleSubmitMonthlyPayroll = async () => {
    if (!companyId || !selectedEmployee || !user) return;
    setIsSubmitting(true);
    try {
      const fields = {
        hours: parseNum(formHours),
        feesToReimburse: parseNum(formFeesToReimburse),
        feesToDeduct: parseNum(formFeesToDeduct),
        privateVehicleKm: parseNum(formPrivateVehicleKm),
        mealsToReimburse: parseNum(formMealsToReimburse),
        mealsToDeduct: parseNum(formMealsToDeduct),
        bonus: parseNum(formBonus),
        prime: parseNum(formPrime),
      };
      const token = await user.getIdToken();
      const res = await fetch('/api/business/monthly-payroll-submissions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: formMonth,
          employeeId: selectedEmployee.id,
          ...fields,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : res.statusText);
      }
      setSelectedEmployee(null);
      toast({
        title: t('salaryCostOverview.monthlyPayroll.toastTitle'),
        description: t('salaryCostOverview.monthlyPayroll.toastDescription', {
          name: `${selectedEmployee.prenom} ${selectedEmployee.nom}`,
        }),
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: t('salaryCostOverview.monthlyPayroll.toastTitle'),
        description: e instanceof Error ? e.message : t('salaryCostOverview.monthlyPayroll.submitting'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthlyEmployees = employees.filter((employee) => employee.typeRemu === 'mensuel');
  const totalMonthlyGross = monthlyEmployees.reduce((sum, employee) => sum + employee.salaireMensuel, 0);
  const totalMonthlyCharges = monthlyEmployees.reduce(
    (sum, employee) => sum + computeCosts(employee.salaireMensuel, rates).totalCharges,
    0
  );
  const totalMonthlyCost = totalMonthlyGross + totalMonthlyCharges;

  // Live gross estimate shown inside the dialog
  const liveEstimate = useMemo(() => {
    if (!selectedEmployee) return 0;
    return computeEstimatedGross(selectedEmployee, {
      hours: parseNum(formHours),
      feesToReimburse: parseNum(formFeesToReimburse),
      feesToDeduct: parseNum(formFeesToDeduct),
      privateVehicleKm: parseNum(formPrivateVehicleKm),
      mealsToReimburse: parseNum(formMealsToReimburse),
      mealsToDeduct: parseNum(formMealsToDeduct),
      bonus: parseNum(formBonus),
      prime: parseNum(formPrime),
    });
  }, [selectedEmployee, formHours, formFeesToReimburse, formFeesToDeduct, formPrivateVehicleKm, formMealsToReimburse, formMealsToDeduct, formBonus, formPrime]);

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('salaryCostOverview.title')}</h1>
          <p className="text-muted-foreground">{t('salaryCostOverview.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => setShowRatesEditor((value) => !value)}>
          <Settings2 className="mr-2 h-4 w-4" />
          {showRatesEditor ? t('salaryCostOverview.hideRates') : t('salaryCostOverview.configureRates')}
        </Button>
      </div>

      {showRatesEditor && (
        <Card>
          <CardHeader>
            <CardTitle>{t('salaryCostOverview.ratesTitle')}</CardTitle>
            <CardDescription>{t('salaryCostOverview.ratesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {(Object.keys(editedRates) as (keyof CompanyRates)[]).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{rateLabels[key]}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      max="1"
                      value={editedRates[key]}
                      onChange={(event) =>
                        setEditedRates((previous) => ({
                          ...previous,
                          [key]: parseFloat(event.target.value) || 0,
                        }))
                      }
                      className="font-mono text-sm"
                    />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtPct(editedRates[key], locale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveRates} disabled={isSavingRates}>
                {isSavingRates ? t('salaryCostOverview.savingRates') : t('salaryCostOverview.saveRates')}
              </Button>
              <Button variant="ghost" onClick={() => setEditedRates(DEFAULT_RATES)}>
                {t('salaryCostOverview.resetDefaults')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('salaryCostOverview.kpis.employees')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoadingEmployees ? t('loadingPlaceholder') : monthlyEmployees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('salaryCostOverview.kpis.monthlyGrossPayroll')}</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('currencyPrefix')}{fmtCHF(totalMonthlyGross, locale)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('salaryCostOverview.kpis.totalMonthlyEmployerCost')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t('currencyPrefix')}{fmtCHF(totalMonthlyCost, locale)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('salaryCostOverview.kpis.ofWhichCharges')}: {t('currencyPrefix')}{fmtCHF(totalMonthlyCharges, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ===== Monthly Payroll Section ===== */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>{t('salaryCostOverview.monthlyPayroll.title')}</CardTitle>
              <CardDescription>{t('salaryCostOverview.monthlyPayroll.subtitle')}</CardDescription>
            </div>
            <div className="space-y-1 sm:w-56">
              <Label htmlFor="payroll-month-picker" className="text-xs">
                {t('salaryCostOverview.monthlyPayroll.payrollMonthLabel')}
              </Label>
              <Input
                id="payroll-month-picker"
                type="month"
                value={selectedPayrollMonth}
                onChange={(e) => setSelectedPayrollMonth(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('salaryCostOverview.monthlyPayroll.payrollMonthHelp')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('salaryCostOverview.table.employee')}</TableHead>
                <TableHead>{t('salaryCostOverview.table.role')}</TableHead>
                <TableHead>{t('salaryCostOverview.monthlyPayroll.salaryType')}</TableHead>
                <TableHead>{t('salaryCostOverview.monthlyPayroll.statusCol')}</TableHead>
                <TableHead className="text-right">{t('salaryCostOverview.monthlyPayroll.estimatedGrossCol')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEmployees &&
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoadingEmployees && employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t('salaryCostOverview.noEmployees')}
                  </TableCell>
                </TableRow>
              )}

              {!isLoadingEmployees &&
                employees.map((employee) => {
                  const sub = monthlySubmissions[employee.id];
                  return (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEmployeeForm(employee)}
                    >
                      <TableCell className="font-medium">
                        {employee.prenom} {employee.nom}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{employee.fonction}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {employee.typeRemu === 'horaire'
                            ? t('salaryCostOverview.monthlyPayroll.hourly')
                            : t('salaryCostOverview.monthlyPayroll.monthly')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub ? (
                          <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle2 className="h-3 w-3" />
                            {t('salaryCostOverview.monthlyPayroll.submitted')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t('salaryCostOverview.monthlyPayroll.pending')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {sub ? `${t('currencyPrefix')}${fmtCHF(sub.estimatedGross, locale)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== Monthly Payroll Dialog ===== */}
      <Dialog
        open={!!selectedEmployee}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployee(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? `${selectedEmployee.prenom} ${selectedEmployee.nom}` : ''}
            </DialogTitle>
            <DialogDescription>
              {t('salaryCostOverview.monthlyPayroll.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Month selector */}
            <div className="space-y-1">
              <Label>{t('salaryCostOverview.monthlyPayroll.month')}</Label>
              <Input
                type="month"
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
              />
            </div>

            {/* Hours — hourly employees only */}
            {selectedEmployee?.typeRemu === 'horaire' && (
              <div className="space-y-1">
                <Label>{t('salaryCostOverview.monthlyPayroll.hours')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder={t('placeholders.zero')}
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                />
              </div>
            )}

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">
              {t('salaryCostOverview.monthlyPayroll.additionalFields')}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('salaryCostOverview.monthlyPayroll.feesToReimburse')} {t('units.chf')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('placeholders.zeroDecimal')}
                  value={formFeesToReimburse}
                  onChange={(e) => setFormFeesToReimburse(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('salaryCostOverview.monthlyPayroll.feesToDeduct')} {t('units.chf')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('placeholders.zeroDecimal')}
                  value={formFeesToDeduct}
                  onChange={(e) => setFormFeesToDeduct(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('salaryCostOverview.monthlyPayroll.privateVehicleKm')} {t('units.km')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={t('placeholders.zero')}
                  value={formPrivateVehicleKm}
                  onChange={(e) => setFormPrivateVehicleKm(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('salaryCostOverview.monthlyPayroll.mealsToReimburse')} {t('units.chf')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('placeholders.zeroDecimal')}
                  value={formMealsToReimburse}
                  onChange={(e) => setFormMealsToReimburse(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('salaryCostOverview.monthlyPayroll.mealsToDeduct')} {t('units.chf')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('placeholders.zeroDecimal')}
                  value={formMealsToDeduct}
                  onChange={(e) => setFormMealsToDeduct(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('salaryCostOverview.monthlyPayroll.bonus')} {t('units.chf')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('placeholders.zeroDecimal')}
                  value={formBonus}
                  onChange={(e) => setFormBonus(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">
                  {t('salaryCostOverview.monthlyPayroll.prime')} {t('units.chf')}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('placeholders.zeroDecimal')}
                  value={formPrime}
                  onChange={(e) => setFormPrime(e.target.value)}
                />
              </div>
            </div>

            {/* Live estimation preview */}
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('salaryCostOverview.monthlyPayroll.estimatedGrossLabel')}
                </span>
                <span className="font-mono font-semibold">{t('currencyPrefix')}{fmtCHF(liveEstimate, locale)}</span>
              </div>
              {parseNum(formPrivateVehicleKm) > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('salaryCostOverview.monthlyPayroll.vehicleRateNote', {
                    rate: fmtCHF(VEHICLE_RATE_CHF_PER_KM, locale),
                  })}
                </p>
              )}
            </div>

            {/* Disclaimer alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {t('salaryCostOverview.monthlyPayroll.disclaimer')}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedEmployee(null)}>
              {t('salaryCostOverview.monthlyPayroll.cancel')}
            </Button>
            <Button onClick={handleSubmitMonthlyPayroll} disabled={isSubmitting}>
              {isSubmitting
                ? t('salaryCostOverview.monthlyPayroll.submitting')
                : t('salaryCostOverview.monthlyPayroll.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Employee Breakdown ===== */}
      <Card>
        <CardHeader>
          <CardTitle>{t('salaryCostOverview.employeeDetailTitle')}</CardTitle>
          <CardDescription>{t('salaryCostOverview.employeeDetailDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('salaryCostOverview.table.employee')}</TableHead>
                <TableHead>{t('salaryCostOverview.table.role')}</TableHead>
                <TableHead>{t('salaryCostOverview.table.activityRate')}</TableHead>
                <TableHead className="text-right">{t('salaryCostOverview.table.monthlySalary')}</TableHead>
                <TableHead className="text-right">{t('salaryCostOverview.table.charges')}</TableHead>
                <TableHead className="text-right">{t('salaryCostOverview.table.monthlyCost')}</TableHead>
                <TableHead className="text-right">{t('salaryCostOverview.table.annualCost')}</TableHead>
                <TableHead className="text-right">{t('salaryCostOverview.monthlyPayroll.estimatedGrossCol')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEmployees &&
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 8 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoadingEmployees && employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t('salaryCostOverview.noEmployees')}
                  </TableCell>
                </TableRow>
              )}

              {!isLoadingEmployees &&
                employees.map((employee) => {
                  const isHourly = employee.typeRemu === 'horaire';
                  const { totalCharges, totalCost } = computeCosts(employee.salaireMensuel, rates);
                  const sub = monthlySubmissions[employee.id];

                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.prenom} {employee.nom}</TableCell>
                      <TableCell className="text-muted-foreground">{employee.fonction}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.tauxActivite}%</Badge>
                      </TableCell>
                      {isHourly ? (
                        <>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {t('currencyPrefix')}{fmtCHF(employee.salaireHoraire, locale)}{t('units.perHour')}
                          </TableCell>
                          <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                            {t('salaryCostOverview.hourlyEmployeeNotice')}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right">{t('currencyPrefix')}{fmtCHF(employee.salaireMensuel, locale)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{t('currencyPrefix')}{fmtCHF(totalCharges, locale)}</TableCell>
                          <TableCell className="text-right font-semibold">{t('currencyPrefix')}{fmtCHF(totalCost, locale)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{t('currencyPrefix')}{fmtCHF(totalCost * 13, locale)}</TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        {sub ? (
                          <span className="font-mono text-sm font-medium text-green-700">
                            {t('currencyPrefix')}{fmtCHF(sub.estimatedGross, locale)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

              {!isLoadingEmployees && monthlyEmployees.length > 0 && (
                <TableRow className="border-t-2 bg-muted/40 font-semibold">
                  <TableCell colSpan={3} className="pr-4 text-right">{t('salaryCostOverview.totalMonthly')}</TableCell>
                  <TableCell className="text-right">{t('currencyPrefix')}{fmtCHF(totalMonthlyGross, locale)}</TableCell>
                  <TableCell className="text-right">{t('currencyPrefix')}{fmtCHF(totalMonthlyCharges, locale)}</TableCell>
                  <TableCell className="text-right">{t('currencyPrefix')}{fmtCHF(totalMonthlyCost, locale)}</TableCell>
                  <TableCell className="text-right">{t('currencyPrefix')}{fmtCHF(totalMonthlyCost * 13, locale)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('salaryCostOverview.appliedRatesTitle')}</CardTitle>
          <CardDescription>{t('salaryCostOverview.appliedRatesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {(Object.keys(rates) as (keyof CompanyRates)[]).map((key) => (
              <div key={key} className="flex items-center justify-between rounded border p-2">
                <span className="text-xs text-muted-foreground">{rateLabels[key]}</span>
                <span className="font-mono font-medium">{fmtPct(rates[key], locale)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
