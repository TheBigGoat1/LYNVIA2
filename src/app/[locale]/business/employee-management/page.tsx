
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { firestore, storage } from '@/firebase/config';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFieldArray } from 'react-hook-form';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { resolveClaForBusiness } from '@/lib/business/cct-resolution';
import {
  claSuggestsThirteenthSalary,
  companyHasLppPlan,
  getRequiredVacationWeeks,
} from '@/lib/business/swiss-compliance';
import { employeeFirestoreSchema, type EmployeeFormValues } from '@/lib/business/employee-firestore-schema';
import { getMonthlySalaryEquivalent } from '@/lib/business/employee-compensation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  Search,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
  PlusCircle,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  ShieldCheck,
  FileText,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { checkLppEnrollment, calculateLppContribution, LPP_2026, type LppContributionResult } from '@/lib/lpp-rules';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type AVSStatus = 'valide' | 'a_verifier' | 'invalide';

type Employee = EmployeeFormValues & {
  id: string;
  name: string;
  avsStatus: AVSStatus;
  registrationStatus?: 'pending' | 'registered';
  registrationDate?: string;
  payslipStatus?: 'none' | 'processed';
  lastPayslipMonth?: string;
};

type CompanyCla = {
  id?: string;
  name: string;
  minimumMonthlyWage: number;
  cctUrl?: string;
};

const toStringValue = (value: unknown): string => (typeof value === 'string' ? value : '');
const toNumberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

const toEmployee = (id: string, data: Record<string, unknown>): Employee => {
  const firstName = toStringValue(data.firstName).trim();
  const lastName = toStringValue(data.lastName).trim();
  const name = `${firstName} ${lastName}`.trim() || 'Unknown Employee';
  return {
    id,
    firstName,
    lastName,
    name,
    dateOfBirth: toStringValue(data.dateOfBirth),
    telephone: toStringValue(data.telephone),
    email: toStringValue(data.email),
    position: toStringValue(data.position),
    startDate: toStringValue(data.startDate),
    typeRemu: data.typeRemu === 'mensuel' ? 'mensuel' : 'horaire',
    salaireHoraire: toNumberValue(data.salaireHoraire, 25),
    salaireMensuel: toNumberValue(data.salaireMensuel, 5000),
    tauxActivite: toNumberValue(data.tauxActivite, 100),
    semainesVacances: toNumberValue(data.semainesVacances, 5),
    numeroAVS: toStringValue(data.numeroAVS),
    iban: toStringValue(data.iban),
    rue: toStringValue(data.rue),
    ville: toStringValue(data.ville),
    codePostal: toStringValue(data.codePostal),
    avsStatus: (data.avsStatus === 'valide' || data.avsStatus === 'a_verifier' || data.avsStatus === 'invalide')
      ? data.avsStatus as AVSStatus
      : 'a_verifier',
    registrationStatus: data.registrationStatus === 'registered' ? 'registered' : 'pending',
    registrationDate: toStringValue(data.registrationDate),
    payslipStatus: data.payslipStatus === 'processed' ? 'processed' : 'none',
    lastPayslipMonth: toStringValue(data.lastPayslipMonth),
    residencePermit: (['L','B','C','F','G','none'].includes(data.residencePermit as string)
      ? data.residencePermit as 'L'|'B'|'C'|'F'|'G'|'none' : 'none'),
    maritalStatus: (['single','married','divorced','separated'].includes(data.maritalStatus as string)
      ? data.maritalStatus as 'single'|'married'|'divorced'|'separated' : 'single'),
    hasChildren: Boolean(data.hasChildren),
    children: Array.isArray(data.children) ? (data.children as any[]).map(c => ({
      firstName: toStringValue(c.firstName),
      lastName: toStringValue(c.lastName),
      dateOfBirth: toStringValue(c.dateOfBirth),
      sharedCustody: Boolean(c.sharedCustody),
      otherParentFirstName: toStringValue(c.otherParentFirstName),
      otherParentLastName: toStringValue(c.otherParentLastName),
      otherParentAddress: toStringValue(c.otherParentAddress),
      otherParentAVS: toStringValue(c.otherParentAVS),
    })) : [],
    taxAtSource: Boolean(data.taxAtSource),
    documentUrl: toStringValue(data.documentUrl),
    documentName: toStringValue(data.documentName),
  };
};

const initialsFromName = (name: string): string => {
  const value = name?.trim() || '';
  if (!value) return 'NA';
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'NA';
};

function pctVacancesFromWeeks(weeks: number) {
  if (weeks === 5) return 0.1064;
  if (weeks === 6) return 0.1304;
  return 0.0833;
}

function calcBrutToutCompris(salaireHoraire: number, semainesVacances: number) {
  const pctVac = pctVacancesFromWeeks(semainesVacances);
  const pctFeries = 0.0227;
  const pct13e = 0.0833;
  const vVac = salaireHoraire * pctVac;
  const vFer = salaireHoraire * pctFeries;
  const base = salaireHoraire + vVac + vFer;
  const v13 = base * pct13e;
  const brut = base + v13;
  return { montantVacances: vVac, montantFeries: vFer, baseAugmentee: base, montant13e: v13, brutToutCompris: brut, pctVac };
}

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

export default function EmployeeManagementPage() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const t = useTranslations('EmployeeManagement');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyHasEmployeesFlag, setCompanyHasEmployeesFlag] = useState(false);
  const [companyEmployeeInsurances, setCompanyEmployeeInsurances] = useState<string[]>([]);
  const [companyCla, setCompanyCla] = useState<CompanyCla | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);

  const organizationCctUrl = companyCla?.cctUrl || 'https://www.service-cct.ch/';

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    getDoc(userDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        setCompanyId(docSnap.data().companyId);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!companyId) {
      setCompanyCla(null);
      return;
    }

    const loadCompanyCla = async () => {
      try {
        const companyDocRef = doc(firestore, 'companies', companyId);
        const companyDoc = await getDoc(companyDocRef);
        const data = companyDoc.data();
        const industry = (data?.industry as string | undefined)?.trim() ?? '';
        const canton = (data?.canton as string | undefined)?.trim() ?? '';
        setCompanyHasEmployeesFlag(data?.hasEmployees === true);
        setCompanyEmployeeInsurances(Array.isArray(data?.employeeInsurances) ? (data?.employeeInsurances as string[]) : []);

        if (industry) {
          const resolution = resolveClaForBusiness(industry, canton || null);
          setCompanyCla({
            id: resolution.cla.id,
            name: resolution.cla.name,
            minimumMonthlyWage: resolution.cla.minimumMonthlyWage,
            cctUrl: resolution.cla.cctUrl,
          });
        } else {
          const cla = data?.cla as CompanyCla | undefined;
          setCompanyCla(cla ?? null);
        }
        setCompanyName(data?.companyName || data?.name || companyId);
      } catch (error) {
        console.error('Error loading company CLA: ', error);
      }
    };

    loadCompanyCla();
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const employeesQuery = query(collection(firestore, 'companies', companyId, 'employees'));
    const unsub = onSnapshot(
      employeesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((d) => toEmployee(d.id, d.data()));
        setEmployees(list);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching employees: ', error);
        toast({ title: t('toast.errorTitle'), description: 'Could not fetch employees.', variant: 'destructive' });
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [companyId, t, toast]);

  const handleOpenDialog = (employee: Employee | null = null) => {
    setViewEmployee(null);
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (values: EmployeeFormValues) => {
    if (!companyId || !user) return;

    const claMinimum = companyCla?.minimumMonthlyWage;
    const monthlyEquivalent = getMonthlySalaryEquivalent(values);
    if (claMinimum && monthlyEquivalent < claMinimum) {
      toast({
        title: 'CLA salary alert',
        description: `The salary is below the CLA minimum (CHF ${claMinimum.toLocaleString()}/month) for ${companyCla?.name || 'this company'}.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = await user.getIdToken();
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      if (editingEmployee) {
        const res = await fetch(`/api/business/company-employees/${editingEmployee.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(typeof err.error === 'string' ? err.error : res.statusText);
        }
        toast({ title: t('toast.updateSuccessTitle'), description: t('toast.updateSuccessDescription', { name: `${values.firstName} ${values.lastName}` }) });
      } else {
        const res = await fetch('/api/business/company-employees', {
          method: 'POST',
          headers,
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(typeof err.error === 'string' ? err.error : res.statusText);
        }
        toast({ title: t('toast.addSuccessTitle'), description: t('toast.addSuccessDescription', { name: `${values.firstName} ${values.lastName}` }) });
      }
      setIsDialogOpen(false);
      setEditingEmployee(null);
    } catch (error: unknown) {
      console.error('Error saving employee: ', error);
      const message = error instanceof Error ? error.message : t('toast.saveErrorDescription');
      toast({ title: t('toast.errorTitle'), description: message, variant: 'destructive' });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!companyId) return;
    try {
      await deleteDoc(doc(firestore, 'companies', companyId, 'employees', employeeId));
      toast({ title: t('toast.deleteSuccessTitle') });
    } catch (error) {
      console.error('Error deleting employee: ', error);
      toast({ title: t('toast.errorTitle'), description: t('toast.deleteErrorDescription'), variant: 'destructive' });
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ── CCT / Swiss law compliance alerts ── */
  const complianceAlerts = useMemo(() => {
    type AlertRow = {
      employeeId: string;
      employeeName: string;
      type: 'minWage' | 'vacationLow' | 'lppRequired' | 'thirteenthHint';
      extra?: Record<string, string | number>;
    };
    const alerts: AlertRow[] = [];
    const claId = companyCla?.id;
    const employerHasLpp = companyHasLppPlan(companyEmployeeInsurances);

    employees.forEach((emp) => {
      const monthly = getMonthlySalaryEquivalent(emp);
      if (companyCla?.minimumMonthlyWage && monthly < companyCla.minimumMonthlyWage) {
        alerts.push({
          employeeId: emp.id,
          employeeName: emp.name,
          type: 'minWage',
          extra: { minimum: companyCla.minimumMonthlyWage },
        });
      }
      const requiredWeeks = getRequiredVacationWeeks(claId, emp.dateOfBirth);
      if (emp.semainesVacances < requiredWeeks) {
        alerts.push({
          employeeId: emp.id,
          employeeName: emp.name,
          type: 'vacationLow',
          extra: { required: requiredWeeks },
        });
      }
      const lppCheck = checkLppEnrollment(monthly);
      const rosterHasStaff = employees.length > 0;
      const lppRelevant =
        !employerHasLpp &&
        lppCheck.mustEnroll &&
        (companyHasEmployeesFlag || rosterHasStaff);
      if (lppRelevant) {
        alerts.push({
          employeeId: emp.id,
          employeeName: emp.name,
          type: 'lppRequired',
          extra: { threshold: lppCheck.threshold },
        });
      }
      if (claId && claSuggestsThirteenthSalary(claId) && emp.typeRemu === 'mensuel') {
        alerts.push({ employeeId: emp.id, employeeName: emp.name, type: 'thirteenthHint' });
      }
    });
    return alerts;
  }, [employees, companyCla, companyEmployeeInsurances, companyHasEmployeesFlag]);

  const getAVSBadge = (status: AVSStatus) => {
    switch (status) {
      case 'valide':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />{t('avs.valide')}</Badge>;
      case 'a_verifier':
        return <Badge className="bg-orange-100 text-orange-800"><AlertTriangle className="h-3 w-3 mr-1" />{t('avs.a_verifier')}</Badge>;
      case 'invalide':
        return <Badge className="bg-red-100 text-red-800">{t('avs.invalide')}</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <a href={organizationCctUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('cctButton')}
              </a>
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('addEmployee')}
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('stats.total')}</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('stats.hourly')}</p>
                  <p className="text-2xl font-bold">{employees.filter((e) => e.typeRemu === 'horaire').length}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('stats.avsToVerify')}</p>
                  <p className="text-2xl font-bold">{employees.filter((e) => e.avsStatus === 'a_verifier').length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CCT / Swiss law compliance alerts */}
        {complianceAlerts.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-orange-600" />
                {t('cctAlerts.title')}
                <Badge variant="destructive">{complianceAlerts.length}</Badge>
              </CardTitle>
              <CardDescription>{t('cctAlerts.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {complianceAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-700">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">{alert.employeeName}</span>
                    {' — '}
                    {alert.type === 'minWage' && t('cctAlerts.minWage', { minimum: alert.extra?.minimum as number })}
                    {alert.type === 'vacationLow' && t('cctAlerts.vacationLow', { required: alert.extra?.required as number })}
                    {alert.type === 'lppRequired' &&
                      t('cctAlerts.lppRequired', { threshold: (alert.extra?.threshold as number) ?? 1890 })}
                    {alert.type === 'thirteenthHint' && t('cctAlerts.thirteenth')}
                  </div>
                  <Button size="sm" variant="ghost" className="ml-auto shrink-0 text-xs" onClick={() => handleOpenDialog(employees.find(e => e.id === alert.employeeId) ?? null)}>
                    {t('cctAlerts.fixAction')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Employee list */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>{t('rosterTitle')}</CardTitle>
                <CardDescription>{t('rosterDescription')}</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t('noEmployees')}</p>
            ) : (
              <div className="space-y-4">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {initialsFromName(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-lg">{employee.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {employee.position} • {employee.tauxActivite}%
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          {employee.telephone && (
                            <span className="flex items-center text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 mr-1" />{employee.telephone}
                            </span>
                          )}
                          {employee.email && (
                            <span className="flex items-center text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 mr-1" />{employee.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right hidden md:block">
                        <div className="font-medium">
                          {employee.typeRemu === 'horaire'
                            ? `${employee.salaireHoraire} CHF/h`
                            : `${employee.salaireMensuel?.toLocaleString()} CHF/mois`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee.semainesVacances} sem. vacances
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        {getAVSBadge(employee.avsStatus)}
                        <Badge variant="outline" className={employee.typeRemu === 'horaire' ? 'text-green-600' : 'text-blue-600'}>
                          {t(`remu.${employee.typeRemu}`)}
                        </Badge>
                        {employee.registrationStatus === 'registered' ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                            <ShieldCheck className="h-3 w-3 mr-1" />AVS Registered
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">
                            <Clock className="h-3 w-3 mr-1" />Awaiting Reg.
                          </Badge>
                        )}
                        {employee.payslipStatus === 'processed' && employee.lastPayslipMonth && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                            <FileText className="h-3 w-3 mr-1" />Payslip {employee.lastPayslipMonth}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewEmployee(employee)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(employee)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('dialog.deleteTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('dialog.deleteDescription')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('dialog.buttons.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)}>
                                {t('dialog.buttons.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingEmployee(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? t('dialog.editDescription') : t('dialog.addDescription')}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleFormSubmit}
            defaultValues={editingEmployee}
            cctUrl={organizationCctUrl}
            onClose={() => { setIsDialogOpen(false); setEditingEmployee(null); }}
            companyId={companyId}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewEmployee} onOpenChange={(open) => !open && setViewEmployee(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewEmployee?.name}</DialogTitle>
            <DialogDescription>{viewEmployee?.position} — {viewEmployee?.tauxActivite}%</DialogDescription>
          </DialogHeader>
          {viewEmployee && (
            <div className="space-y-3 text-sm">
              <Separator />
              <p><strong>{t('dialog.labels.dateNaissance')}:</strong> {viewEmployee.dateOfBirth || '—'}</p>
              <p><strong>{t('dialog.labels.telephone')}:</strong> {viewEmployee.telephone || '—'}</p>
              <p><strong>{t('dialog.labels.email')}:</strong> {viewEmployee.email || '—'}</p>
              <Separator />
              <p><strong>{t('dialog.labels.fonction')}:</strong> {viewEmployee.position}</p>
              <p><strong>{t('dialog.labels.dateDebut')}:</strong> {viewEmployee.startDate || '—'}</p>
              <p><strong>{t('dialog.labels.typeRemu')}:</strong> {t(`remu.${viewEmployee.typeRemu}`)}</p>
              {viewEmployee.typeRemu === 'horaire' ? (
                <p><strong>{t('dialog.labels.salaireHoraire')}:</strong> {viewEmployee.salaireHoraire} CHF/h</p>
              ) : (
                <p><strong>{t('dialog.labels.salaireMensuel')}:</strong> {viewEmployee.salaireMensuel?.toLocaleString()} CHF</p>
              )}
              <p><strong>{t('dialog.labels.tauxActivite')}:</strong> {viewEmployee.tauxActivite}%</p>
              <p><strong>{t('dialog.labels.semainesVacances')}:</strong> {viewEmployee.semainesVacances}</p>
              <Separator />
              <p><strong>{t('dialog.labels.numeroAVS')}:</strong> {viewEmployee.numeroAVS || '—'}</p>
              <p><strong>{t('dialog.labels.iban')}:</strong> {viewEmployee.iban || '—'}</p>
              {(viewEmployee.rue || viewEmployee.ville) && (
                <p><strong>{t('dialog.labels.adresse')}:</strong> {viewEmployee.rue}, {viewEmployee.codePostal} {viewEmployee.ville}</p>
              )}
              <Separator />
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">{t('dialog.labels.adminStatus')}</p>
              <p><strong>{t('dialog.labels.registration')}:</strong> {viewEmployee.registrationStatus === 'registered' ? t('dialog.labels.registeredWithAvs') : t('dialog.labels.awaitingRegistration')}</p>
              {viewEmployee.registrationDate && (
                <p><strong>{t('dialog.labels.registrationDate')}:</strong> {new Date(viewEmployee.registrationDate).toLocaleDateString()}</p>
              )}
              <p><strong>{t('dialog.labels.lastPayslip')}:</strong> {viewEmployee.lastPayslipMonth || '—'}</p>
              <Separator />
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">{t('dialog.sections.personalStatus')}</p>
              <p><strong>{t('dialog.labels.residencePermit')}:</strong> {t(`dialog.permits.${viewEmployee.residencePermit || 'none'}`)}</p>
              <p><strong>{t('dialog.labels.maritalStatus')}:</strong> {t(`dialog.marital.${viewEmployee.maritalStatus || 'single'}`)}</p>
              <p><strong>{t('dialog.labels.taxAtSource')}:</strong> {viewEmployee.taxAtSource ? t('dialog.options.yes') : t('dialog.options.no')}</p>
              <p><strong>{t('dialog.labels.hasChildren')}:</strong> {viewEmployee.hasChildren ? t('dialog.options.yes') : t('dialog.options.no')}</p>
              {viewEmployee.hasChildren && viewEmployee.children && viewEmployee.children.length > 0 && (
                <div className="ml-4 space-y-1">
                  {viewEmployee.children.map((c, i) => (
                    <p key={i} className="text-xs">{c.firstName} {c.lastName}{c.dateOfBirth ? ` (${c.dateOfBirth})` : ''}{c.sharedCustody ? ' — garde partagée' : ''}</p>
                  ))}
                </div>
              )}
              {viewEmployee.documentUrl && (
                <p><strong>{t('dialog.sections.documents')}:</strong> <a href={viewEmployee.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{viewEmployee.documentName || t('dialog.labels.viewDocument')}</a></p>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('dialog.buttons.close')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Employee Form ── */
function EmployeeForm({
  onSubmit,
  defaultValues,
  cctUrl,
  onClose,
  companyId,
}: {
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  defaultValues: Employee | null;
  cctUrl: string;
  onClose: () => void;
  companyId: string | null;
}) {
  const t = useTranslations('EmployeeManagement.dialog');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFirestoreSchema),
    defaultValues: defaultValues || {
      firstName: '', lastName: '', dateOfBirth: '', telephone: '', email: '',
      position: '', startDate: '', typeRemu: 'horaire',
      salaireHoraire: 25, salaireMensuel: 5000, tauxActivite: 100, semainesVacances: 5,
      numeroAVS: '', iban: '', rue: '', ville: '', codePostal: '',
      residencePermit: 'none', maritalStatus: 'single',
      hasChildren: false, children: [], taxAtSource: false,
      documentUrl: '', documentName: '',
    },
  });

  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: 'children',
  });

  const typeRemu = form.watch('typeRemu');
  const salaireHoraire = form.watch('salaireHoraire');
  const semainesVacances = form.watch('semainesVacances');
  const salaireMensuel = form.watch('salaireMensuel');
  const tauxActivite = form.watch('tauxActivite');
  const dateOfBirth = form.watch('dateOfBirth');
  const hasChildren = form.watch('hasChildren');

  const hourlyCalc = useMemo(
    () => calcBrutToutCompris(salaireHoraire, semainesVacances),
    [salaireHoraire, semainesVacances]
  );

  // ── LPP enrollment check & contribution calculation ──
  const lppResult = useMemo(() => {
    const monthly = getMonthlySalaryEquivalent({
      typeRemu,
      salaireHoraire,
      salaireMensuel,
      tauxActivite,
      semainesVacances,
    });
    if (!monthly || monthly <= 0) return null;
    const enrollment = checkLppEnrollment(monthly);
    const contribution = dateOfBirth
      ? calculateLppContribution(monthly, dateOfBirth)
      : null;
    return { enrollment, contribution, monthly };
  }, [typeRemu, salaireHoraire, salaireMensuel, tauxActivite, semainesVacances, dateOfBirth]);

  useEffect(() => {
    if (defaultValues) form.reset(defaultValues);
    else form.reset();
  }, [defaultValues, form]);

  const handleSubmit = async (values: EmployeeFormValues) => {
    setIsSubmitting(true);
    // Upload identity document if selected
    if (documentFile && companyId) {
      try {
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const fileRef = storageRef(storage, `companies/${companyId}/employees/documents/${fileId}/${documentFile.name}`);
        const snapshot = await uploadBytes(fileRef, documentFile);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        values.documentUrl = downloadUrl;
        values.documentName = documentFile.name;
      } catch (err) {
        console.error('Error uploading employee document:', err);
      }
    }
    await onSubmit(values);
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* ── Identity Section ── */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t('sections.identity')}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.prenom')} *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.nom')} *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.dateNaissance')}</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <FormField control={form.control} name="telephone" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.telephone')}</FormLabel>
                <FormControl><Input placeholder="+41 XX XXX XX XX" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.email')}</FormLabel>
                <FormControl><Input type="email" placeholder="prenom.nom@exemple.ch" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <Separator />

        {/* ── Contract Section ── */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t('sections.contract')}</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <FormField control={form.control} name="position" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.fonction')} *</FormLabel>
                <FormControl><Input placeholder="ex: Développeur, Comptable..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.dateDebut')}</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Remuneration type toggle */}
          <FormField control={form.control} name="typeRemu" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('labels.typeRemu')}</FormLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={field.value === 'horaire' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => field.onChange('horaire')}
                >
                  {t('labels.horaire')}
                </Button>
                <Button
                  type="button"
                  variant={field.value === 'mensuel' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => field.onChange('mensuel')}
                >
                  {t('labels.mensuel')}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <div className="mt-4">
            {typeRemu === 'horaire' ? (
              /* Hourly bloc with calculation card */
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="salaireHoraire" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.salaireHoraire')} *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.05" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="semainesVacances" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.semainesVacances')} *</FormLabel>
                      <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseInt(v))}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="4">4 semaines (8.33%)</SelectItem>
                          <SelectItem value="5">5 semaines (10.64%)</SelectItem>
                          <SelectItem value="6">6 semaines (13.04%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex items-end">
                    <a href={cctUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                      {t('labels.cctLink') || 'Consulter la CCT ↗'}
                    </a>
                  </div>
                </div>

                {/* Hourly calculation card */}
                <div className="rounded-lg border p-4 bg-card shadow-sm">
                  <div className="text-sm font-medium mb-3">Détail du calcul horaire</div>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between"><span>Salaire horaire de base</span><span>CHF {fmt(salaireHoraire)}</span></div>
                    <div className="flex justify-between"><span>Vacances ({(hourlyCalc.pctVac * 100).toFixed(2)}%)</span><span>+ CHF {fmt(hourlyCalc.montantVacances)}</span></div>
                    <div className="flex justify-between"><span>Jours fériés (2.27%)</span><span>+ CHF {fmt(hourlyCalc.montantFeries)}</span></div>
                    <Separator />
                    <div className="flex justify-between"><span>Sous-total</span><span>CHF {fmt(hourlyCalc.baseAugmentee)}</span></div>
                    <div className="flex justify-between"><span>13ᵉ salaire (8.33%)</span><span>+ CHF {fmt(hourlyCalc.montant13e)}</span></div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold text-green-700">
                      <span>BRUT TOUT COMPRIS</span><span>CHF {fmt(hourlyCalc.brutToutCompris)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Monthly bloc */
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="salaireMensuel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.salaireMensuel')} *</FormLabel>
                      <FormControl>
                        <Input type="number" step="5" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="semainesVacances" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.semainesVacances')} *</FormLabel>
                      <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseInt(v))}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="4">4 semaines</SelectItem>
                          <SelectItem value="5">5 semaines</SelectItem>
                          <SelectItem value="6">6 semaines</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tauxActivite" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.tauxActivite')} *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} step={1} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 100)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end">
                  <a href={cctUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                    {t('labels.cctLink') || 'Consulter la CCT ↗'}
                  </a>
                </div>
                <div className="rounded-lg border p-4 bg-card shadow-sm">
                  <div className="text-sm font-medium mb-3">Aperçu mensuel</div>
                  <div className="font-mono flex justify-between text-lg font-semibold text-blue-700">
                    <span>SALAIRE MENSUEL BRUT (saisi)</span>
                    <span>CHF {fmt(form.watch('salaireMensuel'))}</span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground bg-muted rounded p-2">
                    ℹ️ Les déductions sociales (AVS/AC/IJM/LAA/LPP), impôt à la source et CCT sont appliquées sur la fiche définitive par Lynvia. Ce bloc n&apos;est pas un calcul de paie.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ── LPP (2nd Pillar) Enrollment Alert & Contribution ── */}
        {lppResult && lppResult.enrollment.mustEnroll && (
          <div>
            <Alert variant="default" className="border-blue-300 bg-blue-50 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">LPP / 2nd Pillar Enrollment Required</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
                {lppResult.enrollment.message}
              </AlertDescription>
            </Alert>

            {lppResult.contribution && !lppResult.contribution.belowThreshold && (
              <div className="rounded-lg border p-4 bg-card shadow-sm mt-3">
                <div className="text-sm font-medium mb-3">LPP Contribution Estimate (2026)</div>
                <div className="space-y-1 font-mono text-sm">
                  <div className="flex justify-between">
                    <span>Gross monthly salary</span>
                    <span>CHF {fmt(lppResult.contribution.grossMonthly)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordination deduction</span>
                    <span>− CHF {fmt(lppResult.contribution.coordinationDeductionMonthly)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Insured (coordinated) salary</span>
                    <span>CHF {fmt(lppResult.contribution.insuredMonthly)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Age bracket</span>
                    <span>{lppResult.contribution.ageBracketLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LPP rate</span>
                    <span>{(lppResult.contribution.lppRate * 100).toFixed(1)}%</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold text-blue-700">
                    <span>LPP contribution (total)</span>
                    <span>CHF {fmt(lppResult.contribution.lppContributionMonthly)}/mo</span>
                  </div>
                  {!dateOfBirth && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ℹ️ Enter date of birth above for an age-specific rate. Currently using default 7%.
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    ℹ️ Contribution is shared between employer and employee. Actual rates may differ by insurer.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* ── Administrative Info Section ── */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t('sections.swissInfo')}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField control={form.control} name="numeroAVS" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.numeroAVS')}</FormLabel>
                <FormControl><Input placeholder="756.XXXX.XXXX.XX" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="iban" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.iban')}</FormLabel>
                <FormControl><Input placeholder="CH XX XXXX XXXX XXXX XXXX X" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <FormField control={form.control} name="rue" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.rue')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ville" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.ville')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="codePostal" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.codePostal')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <Separator />

        {/* ── Personal Status Section ── */}
        <div>
          <h3 className="text-lg font-medium mb-4">{t('sections.personalStatus')}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField control={form.control} name="residencePermit" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.residencePermit')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(['none','L','B','C','F','G'] as const).map(p => (
                      <SelectItem key={p} value={p}>{t(`permits.${p}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="maritalStatus" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.maritalStatus')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(['single','married','divorced','separated'] as const).map(s => (
                      <SelectItem key={s} value={s}>{t(`marital.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* Has Children */}
            <FormField control={form.control} name="hasChildren" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.hasChildren')}</FormLabel>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant={field.value ? 'default' : 'outline'} size="sm" onClick={() => field.onChange(true)}>
                    {t('options.yes')}
                  </Button>
                  <Button type="button" variant={!field.value ? 'default' : 'outline'} size="sm" onClick={() => { field.onChange(false); form.setValue('children', []); }}>
                    {t('options.no')}
                  </Button>
                </div>
              </FormItem>
            )} />
            {/* Tax at source */}
            <FormField control={form.control} name="taxAtSource" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('labels.taxAtSource')}</FormLabel>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant={field.value ? 'default' : 'outline'} size="sm" onClick={() => field.onChange(true)}>
                    {t('options.yes')}
                  </Button>
                  <Button type="button" variant={!field.value ? 'default' : 'outline'} size="sm" onClick={() => field.onChange(false)}>
                    {t('options.no')}
                  </Button>
                </div>
              </FormItem>
            )} />
          </div>

          {/* Children list */}
          {hasChildren && (
            <div className="mt-4 space-y-4">
              {childFields.map((child, idx) => (
                <div key={child.id} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm">{t('children.title')} {idx + 1}</p>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeChild(idx)}>
                      {t('children.remove')}
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <FormField control={form.control} name={`children.${idx}.firstName`} render={({ field }) => (
                      <FormItem><FormLabel>{t('children.firstName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`children.${idx}.lastName`} render={({ field }) => (
                      <FormItem><FormLabel>{t('children.lastName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`children.${idx}.dateOfBirth`} render={({ field }) => (
                      <FormItem><FormLabel>{t('children.dateOfBirth')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name={`children.${idx}.sharedCustody`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('children.sharedCustody')}</FormLabel>
                      <div className="flex gap-2 mt-1">
                        <Button type="button" variant={field.value ? 'default' : 'outline'} size="sm" onClick={() => field.onChange(true)}>{t('options.yes')}</Button>
                        <Button type="button" variant={!field.value ? 'default' : 'outline'} size="sm" onClick={() => field.onChange(false)}>{t('options.no')}</Button>
                      </div>
                    </FormItem>
                  )} />
                  {form.watch(`children.${idx}.sharedCustody`) && (
                    <div className="grid md:grid-cols-2 gap-3">
                      <FormField control={form.control} name={`children.${idx}.otherParentFirstName`} render={({ field }) => (
                        <FormItem><FormLabel>{t('children.otherParentFirstName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`children.${idx}.otherParentLastName`} render={({ field }) => (
                        <FormItem><FormLabel>{t('children.otherParentLastName')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`children.${idx}.otherParentAddress`} render={({ field }) => (
                        <FormItem><FormLabel>{t('children.otherParentAddress')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`children.${idx}.otherParentAVS`} render={({ field }) => (
                        <FormItem><FormLabel>{t('children.otherParentAVS')}</FormLabel><FormControl><Input placeholder="756.XXXX.XXXX.XX" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendChild({ firstName: '', lastName: '', dateOfBirth: '', sharedCustody: false, otherParentFirstName: '', otherParentLastName: '', otherParentAddress: '', otherParentAVS: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" />{t('children.add')}
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* ── Document Upload Section ── */}
        <div>
          <h3 className="text-lg font-medium mb-2">{t('sections.documents')}</h3>
          <p className="text-sm text-muted-foreground mb-3">{t('labels.documentUploadHint')}</p>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
              className="max-w-sm"
            />
            {(documentFile || (defaultValues?.documentUrl)) && (
              <span className="text-sm text-muted-foreground">
                {documentFile ? documentFile.name : defaultValues?.documentName || t('labels.viewDocument')}
                {!documentFile && defaultValues?.documentUrl && (
                  <a href={defaultValues.documentUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary underline">{t('labels.viewDocument')}</a>
                )}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>{t('buttons.cancel')}</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? t('buttons.saving') : t('buttons.save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
