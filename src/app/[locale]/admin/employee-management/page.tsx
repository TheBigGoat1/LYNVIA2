'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, collectionGroup, onSnapshot, query } from 'firebase/firestore';
import { firestore, auth } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Search,
  Pencil,
  Trash2,
  Eye,
  PlusCircle,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  Building,
  ArrowLeft,
  ShieldCheck,
  FileText,
  ChevronRight,
} from 'lucide-react';
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

/* =======================================================
   Types & Schema
======================================================= */
const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional().default(''),
  telephone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  position: z.string().min(1, 'Position is required'),
  startDate: z.string().optional().default(''),
  typeRemu: z.enum(['horaire', 'mensuel']).default('horaire'),
  salaireHoraire: z.coerce.number().min(0).default(25),
  salaireMensuel: z.coerce.number().min(0).default(5000),
  tauxActivite: z.coerce.number().min(0).max(100).default(100),
  semainesVacances: z.coerce.number().min(4).max(6).default(5),
  numeroAVS: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  rue: z.string().optional().default(''),
  ville: z.string().optional().default(''),
  codePostal: z.string().optional().default(''),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type AVSStatus = 'valide' | 'a_verifier' | 'invalide';
type RegistrationStatus = 'pending' | 'registered';
type PayslipStatus = 'none' | 'processed';

type Employee = EmployeeFormValues & {
  id: string;
  companyId: string;
  name: string;
  avsStatus: AVSStatus;
  registrationStatus: RegistrationStatus;
  registrationDate: string;
  payslipStatus: PayslipStatus;
  lastPayslipMonth: string;
};

type Company = {
  id: string;
  companyName: string;
  type: string;
};

/* =======================================================
   Helpers
======================================================= */
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);

const toEmployee = (id: string, companyId: string, data: Record<string, unknown>): Employee => {
  const firstName = str(data.firstName).trim();
  const lastName = str(data.lastName).trim();
  return {
    id,
    companyId,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || 'Unknown',
    dateOfBirth: str(data.dateOfBirth),
    telephone: str(data.telephone),
    email: str(data.email),
    position: str(data.position),
    startDate: str(data.startDate),
    typeRemu: data.typeRemu === 'mensuel' ? 'mensuel' : 'horaire',
    salaireHoraire: num(data.salaireHoraire, 25),
    salaireMensuel: num(data.salaireMensuel, 5000),
    tauxActivite: num(data.tauxActivite, 100),
    semainesVacances: num(data.semainesVacances, 5),
    numeroAVS: str(data.numeroAVS),
    iban: str(data.iban),
    rue: str(data.rue),
    ville: str(data.ville),
    codePostal: str(data.codePostal),
    avsStatus:
      data.avsStatus === 'valide' || data.avsStatus === 'invalide'
        ? (data.avsStatus as AVSStatus)
        : 'a_verifier',
    registrationStatus:
      data.registrationStatus === 'registered' ? 'registered' : 'pending',
    registrationDate: str(data.registrationDate),
    payslipStatus: data.payslipStatus === 'processed' ? 'processed' : 'none',
    lastPayslipMonth: str(data.lastPayslipMonth),
  };
};

const initials = (name: string) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'NA';

function pctVacFromWeeks(weeks: number) {
  if (weeks === 5) return 0.1064;
  if (weeks === 6) return 0.1304;
  return 0.0833;
}
function calcBrut(hourly: number, weeks: number) {
  const pctVac = pctVacFromWeeks(weeks);
  const vVac = hourly * pctVac;
  const vFer = hourly * 0.0227;
  const base = hourly + vVac + vFer;
  const v13 = base * 0.0833;
  return { pctVac, vVac, vFer, base, v13, gross: base + v13 };
}
const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '0.00');

/* =======================================================
   Status Badges
======================================================= */
function AVSBadge({ status }: { status: AVSStatus }) {
  if (status === 'valide')
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />AVS Valid
      </Badge>
    );
  if (status === 'invalide')
    return <Badge className="bg-red-100 text-red-800 border-red-200">AVS Invalid</Badge>;
  return (
    <Badge className="bg-orange-100 text-orange-800 border-orange-200">
      <AlertTriangle className="h-3 w-3 mr-1" />AVS Pending
    </Badge>
  );
}

function RegBadge({ status }: { status: RegistrationStatus }) {
  if (status === 'registered')
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        <ShieldCheck className="h-3 w-3 mr-1" />Registered
      </Badge>
    );
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200">
      <Clock className="h-3 w-3 mr-1" />Awaiting Reg.
    </Badge>
  );
}

function PayslipBadge({ status, month }: { status: PayslipStatus; month: string }) {
  if (status === 'processed')
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
        <FileText className="h-3 w-3 mr-1" />Payslip {month}
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-gray-500">
      No payslip yet
    </Badge>
  );
}

/* =======================================================
   Main Page Component
======================================================= */
export default function AdminEmployeeManagementPage() {
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [payslipMonth, setPayslipMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  /* ── Load all companies ── */
  useEffect(() => {
    setIsLoadingCompanies(true);
    return onSnapshot(
      query(collection(firestore, 'companies')),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            companyName: str(d.data().companyName) || d.id,
            type: str(d.data().type),
          }))
          .sort((a, b) => a.companyName.localeCompare(b.companyName));
        setCompanies(list);
        setIsLoadingCompanies(false);
      },
      () => {
        toast({ title: 'Error', description: 'Could not load companies.', variant: 'destructive' });
        setIsLoadingCompanies(false);
      }
    );
  }, [toast]);

  /* ── Load all employees via collectionGroup ── */
  useEffect(() => {
    setIsLoadingEmployees(true);
    return onSnapshot(
      query(collectionGroup(firestore, 'employees')),
      (snap) => {
        const list = snap.docs.map((d) => {
          const companyId = d.ref.parent.parent?.id ?? '';
          return toEmployee(d.id, companyId, d.data() as Record<string, unknown>);
        });
        setAllEmployees(list);
        setIsLoadingEmployees(false);
      },
      () => setIsLoadingEmployees(false)
    );
  }, []);

  const getToken = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    return auth.currentUser.getIdToken();
  }, []);

  /* ── Derived data for selected company ── */
  const companyEmployees = useMemo(
    () => (selectedCompany ? allEmployees.filter((e) => e.companyId === selectedCompany.id) : []),
    [allEmployees, selectedCompany]
  );

  const filteredEmployees = useMemo(
    () =>
      companyEmployees.filter(
        (e) =>
          e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [companyEmployees, searchTerm]
  );

  const awaitingReg = useMemo(
    () => companyEmployees.filter((e) => e.registrationStatus !== 'registered'),
    [companyEmployees]
  );
  const registered = useMemo(
    () => companyEmployees.filter((e) => e.registrationStatus === 'registered'),
    [companyEmployees]
  );

  /* ── Stats per company for the table ── */
  const countByCompany = useMemo(() => {
    const map: Record<string, { total: number; awaiting: number; payslips: number }> = {};
    allEmployees.forEach((e) => {
      if (!map[e.companyId]) map[e.companyId] = { total: 0, awaiting: 0, payslips: 0 };
      map[e.companyId].total += 1;
      if (e.registrationStatus !== 'registered') map[e.companyId].awaiting += 1;
      if (e.payslipStatus === 'processed') map[e.companyId].payslips += 1;
    });
    return map;
  }, [allEmployees]);

  /* ── CRUD ── */
  const handleFormSubmit = async (values: EmployeeFormValues) => {
    if (!selectedCompany) return;
    const token = await getToken();
    const url = '/api/admin/employee-management';
    if (editingEmployee) {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: selectedCompany.id, employeeId: editingEmployee.id, ...values }),
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error || 'Update failed');
      toast({ title: 'Employee updated' });
    } else {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: selectedCompany.id, ...values }),
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error || 'Create failed');
      toast({ title: 'Employee added', description: `${values.firstName} ${values.lastName}` });
    }
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = async (employeeId: string) => {
    if (!selectedCompany) return;
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/employee-management', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: selectedCompany.id, employeeId }),
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error || 'Delete failed');
      toast({ title: 'Employee removed' });
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleAdminAction = async (
    employeeId: string,
    action: 'register_social_insurance' | 'process_payslip',
    extra?: Record<string, unknown>
  ) => {
    if (!selectedCompany) return;
    const key = `${action}_${employeeId}`;
    setActionLoading(key);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/employee-management', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: selectedCompany.id, employeeId, action, data: extra }),
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error || 'Action failed');
      toast({
        title:
          action === 'register_social_insurance'
            ? 'Registered with social insurance ✓'
            : `Payslip processed — ${p.month}`,
      });
    } catch (error: any) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  /* =====================================================
     VIEW 1: Companies Table
  ===================================================== */
  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            Select a company to manage its employees.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Companies</p>
                <p className="text-2xl font-bold">{companies.length}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Employees</p>
                <p className="text-2xl font-bold">{allEmployees.length}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Awaiting Registration</p>
                <p className="text-2xl font-bold">
                  {allEmployees.filter((e) => e.registrationStatus !== 'registered').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Companies
            </CardTitle>
            <CardDescription>
              Click a row to manage that company&apos;s employees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCompanies || isLoadingEmployees ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </div>
            ) : companies.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">No companies found.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Employees</TableHead>
                      <TableHead className="text-center">Awaiting Reg.</TableHead>
                      <TableHead className="text-center">Payslips Done</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => {
                      const s = countByCompany[company.id] ?? { total: 0, awaiting: 0, payslips: 0 };
                      return (
                        <TableRow
                          key={company.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCompany(company);
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                                {company.companyName[0]?.toUpperCase() ?? 'C'}
                              </div>
                              <span className="font-medium">{company.companyName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {company.type || 'Business'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">{s.total}</TableCell>
                          <TableCell className="text-center">
                            {s.total > 0 && s.awaiting === 0 ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">All done</Badge>
                            ) : s.awaiting > 0 ? (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">{s.awaiting}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground text-sm">
                            {s.total > 0 ? `${s.payslips} / ${s.total}` : '—'}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* =====================================================
     VIEW 2: Company Employees with Tabs
  ===================================================== */
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => {
                setSelectedCompany(null);
                setSearchTerm('');
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              All Companies
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{selectedCompany.companyName}</h1>
              <p className="text-muted-foreground">Employee management</p>
            </div>
          </div>
          <Button onClick={() => { setEditingEmployee(null); setIsDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4">
          {([
            ['Total', companyEmployees.length, Users, 'text-blue-500'],
            ['Hourly', companyEmployees.filter((e) => e.typeRemu === 'horaire').length, Clock, 'text-green-500'],
            ['Awaiting Reg.', awaitingReg.length, AlertTriangle, 'text-orange-500'],
            ['Registered', registered.length, ShieldCheck, 'text-blue-600'],
          ] as const).map(([label, value, Icon, color]) => (
            <Card key={label}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
                <Icon className={`h-8 w-8 ${color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <TabsList>
              <TabsTrigger value="all">All ({companyEmployees.length})</TabsTrigger>
              <TabsTrigger value="waiting">
                Waiting for Registration ({awaitingReg.length})
              </TabsTrigger>
              <TabsTrigger value="registered">Registered ({registered.length})</TabsTrigger>
              <TabsTrigger value="payslips">Payslips</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchEmployees')}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="all">
            <EmployeeList
              employees={filteredEmployees}
              onView={setViewEmployee}
              onEdit={(emp) => { setEditingEmployee(emp); setIsDialogOpen(true); }}
              onDelete={handleDelete}
              onRegister={(id) => handleAdminAction(id, 'register_social_insurance')}
              onPayslip={(id) => handleAdminAction(id, 'process_payslip', { month: payslipMonth })}
              actionLoading={actionLoading}
            />
          </TabsContent>

          <TabsContent value="waiting">
            <EmployeeList
              employees={awaitingReg.filter(
                (e) =>
                  e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  e.position.toLowerCase().includes(searchTerm.toLowerCase())
              )}
              emptyMsg="All employees are registered with social insurance."
              onView={setViewEmployee}
              onEdit={(emp) => { setEditingEmployee(emp); setIsDialogOpen(true); }}
              onDelete={handleDelete}
              onRegister={(id) => handleAdminAction(id, 'register_social_insurance')}
              onPayslip={(id) => handleAdminAction(id, 'process_payslip', { month: payslipMonth })}
              actionLoading={actionLoading}
            />
          </TabsContent>

          <TabsContent value="registered">
            <EmployeeList
              employees={registered.filter(
                (e) =>
                  e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  e.position.toLowerCase().includes(searchTerm.toLowerCase())
              )}
              emptyMsg="No registered employees yet."
              onView={setViewEmployee}
              onEdit={(emp) => { setEditingEmployee(emp); setIsDialogOpen(true); }}
              onDelete={handleDelete}
              onRegister={(id) => handleAdminAction(id, 'register_social_insurance')}
              onPayslip={(id) => handleAdminAction(id, 'process_payslip', { month: payslipMonth })}
              actionLoading={actionLoading}
            />
          </TabsContent>

          <TabsContent value="payslips">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Process Payslips</CardTitle>
                    <CardDescription>
                      Select a month and generate payslips for each employee.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">Month:</span>
                    <Input
                      type="month"
                      value={payslipMonth}
                      onChange={(e) => setPayslipMonth(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {companyEmployees.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">No employees.</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Last Payslip</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyEmployees.map((emp) => {
                          const isCurrentMonth = emp.lastPayslipMonth === payslipMonth;
                          const loading = actionLoading === `process_payslip_${emp.id}`;
                          return (
                            <TableRow key={emp.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                                      {initials(emp.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{emp.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{emp.position}</TableCell>
                              <TableCell>
                                {emp.typeRemu === 'horaire'
                                  ? `${emp.salaireHoraire} CHF/h`
                                  : `${emp.salaireMensuel?.toLocaleString()} CHF/mo`}
                              </TableCell>
                              <TableCell>
                                {emp.lastPayslipMonth ? (
                                  <Badge
                                    className={
                                      isCurrentMonth
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-600'
                                    }
                                  >
                                    {emp.lastPayslipMonth}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant={isCurrentMonth ? 'outline' : 'default'}
                                  disabled={!!loading}
                                  onClick={() =>
                                    handleAdminAction(emp.id, 'process_payslip', { month: payslipMonth })
                                  }
                                >
                                  {loading ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <FileText className="h-3 w-3 mr-1" />
                                  )}
                                  {isCurrentMonth ? 'Regenerate' : 'Generate'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? 'Update employee information.'
                : `Register a new employee for ${selectedCompany?.companyName}.`}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            key={editingEmployee?.id ?? 'new'}
            onSubmit={handleFormSubmit}
            defaultValues={editingEmployee}
            onClose={() => { setIsDialogOpen(false); setEditingEmployee(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* View / Detail Dialog */}
      <Dialog open={!!viewEmployee} onOpenChange={(open) => !open && setViewEmployee(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewEmployee?.name}</DialogTitle>
            <DialogDescription>
              {viewEmployee?.position} — {viewEmployee?.tauxActivite}%
            </DialogDescription>
          </DialogHeader>
          {viewEmployee && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <AVSBadge status={viewEmployee.avsStatus} />
                <RegBadge status={viewEmployee.registrationStatus} />
                <PayslipBadge status={viewEmployee.payslipStatus} month={viewEmployee.lastPayslipMonth} />
              </div>
              <Separator />
              <section>
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-2">Identity</p>
                <div className="space-y-1">
                  <p><strong>Date of birth:</strong> {viewEmployee.dateOfBirth || '—'}</p>
                  <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {viewEmployee.telephone || '—'}</p>
                  <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {viewEmployee.email || '—'}</p>
                </div>
              </section>
              <Separator />
              <section>
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-2">Contract</p>
                <div className="space-y-1">
                  <p><strong>Position:</strong> {viewEmployee.position}</p>
                  <p><strong>Start date:</strong> {viewEmployee.startDate || '—'}</p>
                  <p><strong>Type:</strong> {viewEmployee.typeRemu === 'horaire' ? 'Hourly' : 'Monthly'}</p>
                  {viewEmployee.typeRemu === 'horaire' ? (
                    <p><strong>Rate:</strong> CHF {viewEmployee.salaireHoraire}/h</p>
                  ) : (
                    <p><strong>Salary:</strong> CHF {viewEmployee.salaireMensuel?.toLocaleString()}/mo</p>
                  )}
                  <p><strong>Activity:</strong> {viewEmployee.tauxActivite}%</p>
                  <p><strong>Vacation:</strong> {viewEmployee.semainesVacances} weeks</p>
                </div>
              </section>
              <Separator />
              <section>
                <p className="font-semibold text-muted-foreground uppercase text-xs tracking-wide mb-2">Administrative</p>
                <div className="space-y-1">
                  <p><strong>AVS Number:</strong> {viewEmployee.numeroAVS || '—'}</p>
                  <p><strong>IBAN:</strong> {viewEmployee.iban || '—'}</p>
                  {(viewEmployee.rue || viewEmployee.ville) && (
                    <p><strong>Address:</strong> {viewEmployee.rue}, {viewEmployee.codePostal} {viewEmployee.ville}</p>
                  )}
                </div>
              </section>
              {viewEmployee.registrationDate && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Registered on {new Date(viewEmployee.registrationDate).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {viewEmployee && viewEmployee.registrationStatus !== 'registered' && (
              <Button
                size="sm"
                variant="outline"
                disabled={!!actionLoading}
                onClick={() => {
                  handleAdminAction(viewEmployee.id, 'register_social_insurance');
                  setViewEmployee(null);
                }}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                Register with AVS
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* =======================================================
   EmployeeList sub-component
======================================================= */
function EmployeeList({
  employees,
  emptyMsg = 'No employees found.',
  onView,
  onEdit,
  onDelete,
  onRegister,
  onPayslip,
  actionLoading,
}: {
  employees: Employee[];
  emptyMsg?: string;
  onView: (emp: Employee) => void;
  onEdit: (emp: Employee) => void;
  onDelete: (id: string) => void;
  onRegister: (id: string) => void;
  onPayslip: (id: string) => void;
  actionLoading: string | null;
}) {
  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-muted-foreground">{emptyMsg}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {employees.map((emp) => {
            const regLoading = actionLoading === `register_social_insurance_${emp.id}`;
            const payLoading = actionLoading === `process_payslip_${emp.id}`;
            return (
              <div
                key={emp.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {initials(emp.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-lg">{emp.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {emp.position} • {emp.tauxActivite}%
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {emp.telephone && (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 mr-1" />{emp.telephone}
                        </span>
                      )}
                      {emp.email && (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 mr-1" />{emp.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-0 sm:ml-auto">
                  <div className="text-right hidden md:block text-sm">
                    <div className="font-medium">
                      {emp.typeRemu === 'horaire'
                        ? `${emp.salaireHoraire} CHF/h`
                        : `${emp.salaireMensuel?.toLocaleString()} CHF/mo`}
                    </div>
                    <div className="text-muted-foreground">{emp.semainesVacances} wks vacation</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <RegBadge status={emp.registrationStatus} />
                    <AVSBadge status={emp.avsStatus} />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {emp.registrationStatus !== 'registered' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                        disabled={!!actionLoading}
                        onClick={() => onRegister(emp.id)}
                      >
                        {regLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        )}
                        Register AVS
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-700 border-purple-200 hover:bg-purple-50"
                      disabled={!!actionLoading}
                      onClick={() => onPayslip(emp.id)}
                    >
                      {payLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <FileText className="h-3 w-3 mr-1" />
                      )}
                      Payslip
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onView(emp)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(emp)}>
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
                          <AlertDialogTitle>Delete employee?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove {emp.name} from the system.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(emp.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* =======================================================
   Employee Form
======================================================= */
function EmployeeForm({
  onSubmit,
  defaultValues,
  onClose,
}: {
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
  defaultValues: Employee | null;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: defaultValues ?? {
      firstName: '', lastName: '', dateOfBirth: '', telephone: '', email: '',
      position: '', startDate: '', typeRemu: 'horaire',
      salaireHoraire: 25, salaireMensuel: 5000, tauxActivite: 100, semainesVacances: 5,
      numeroAVS: '', iban: '', rue: '', ville: '', codePostal: '',
    },
  });

  const typeRemu = form.watch('typeRemu');
  const salaireHoraire = form.watch('salaireHoraire');
  const semainesVacances = form.watch('semainesVacances');
  const hourlyCalc = useMemo(() => calcBrut(salaireHoraire, semainesVacances), [salaireHoraire, semainesVacances]);

  const handleSubmit = async (values: EmployeeFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Identity */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Identity</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem><FormLabel>First name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem><FormLabel>Last name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
              <FormItem><FormLabel>Date of birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <FormField control={form.control} name="telephone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+41 XX XXX XX XX" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>
        <Separator />

        {/* Contract */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Contract</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <FormField control={form.control} name="position" render={({ field }) => (
              <FormItem><FormLabel>Position *</FormLabel><FormControl><Input placeholder="e.g. Developer, Accountant..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem><FormLabel>Start date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="typeRemu" render={({ field }) => (
            <FormItem>
              <FormLabel>Remuneration type</FormLabel>
              <div className="flex gap-2">
                <Button type="button" variant={field.value === 'horaire' ? 'default' : 'outline'} size="sm" onClick={() => field.onChange('horaire')}>Hourly</Button>
                <Button type="button" variant={field.value === 'mensuel' ? 'default' : 'outline'} size="sm" onClick={() => field.onChange('mensuel')}>Monthly</Button>
              </div>
              <FormMessage />
            </FormItem>
          )} />
          <div className="mt-4">
            {typeRemu === 'horaire' ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="salaireHoraire" render={({ field }) => (
                    <FormItem><FormLabel>Hourly rate (CHF) *</FormLabel><FormControl><Input type="number" step="0.05" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="semainesVacances" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vacation weeks *</FormLabel>
                      <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseInt(v))}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="4">4 weeks (8.33%)</SelectItem>
                          <SelectItem value="5">5 weeks (10.64%)</SelectItem>
                          <SelectItem value="6">6 weeks (13.04%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="rounded-lg border p-4 bg-card shadow-sm font-mono text-sm space-y-1">
                  <div className="font-sans font-medium text-sm mb-2">Hourly breakdown</div>
                  <div className="flex justify-between"><span>Base</span><span>CHF {fmt(salaireHoraire)}</span></div>
                  <div className="flex justify-between"><span>Vacation ({(hourlyCalc.pctVac * 100).toFixed(2)}%)</span><span>+ CHF {fmt(hourlyCalc.vVac)}</span></div>
                  <div className="flex justify-between"><span>Public holidays (2.27%)</span><span>+ CHF {fmt(hourlyCalc.vFer)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span>Sub-total</span><span>CHF {fmt(hourlyCalc.base)}</span></div>
                  <div className="flex justify-between"><span>13th salary (8.33%)</span><span>+ CHF {fmt(hourlyCalc.v13)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold text-green-700"><span>GROSS ALL-IN</span><span>CHF {fmt(hourlyCalc.gross)}</span></div>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="salaireMensuel" render={({ field }) => (
                  <FormItem><FormLabel>Monthly salary (CHF) *</FormLabel><FormControl><Input type="number" step="5" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="semainesVacances" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vacation weeks *</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseInt(v))}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="4">4 weeks</SelectItem>
                        <SelectItem value="5">5 weeks</SelectItem>
                        <SelectItem value="6">6 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tauxActivite" render={({ field }) => (
                  <FormItem><FormLabel>Activity rate (%) *</FormLabel><FormControl><Input type="number" min={0} max={100} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 100)} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            )}
          </div>
        </div>
        <Separator />

        {/* Administrative */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Administrative Info</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <FormField control={form.control} name="numeroAVS" render={({ field }) => (
              <FormItem><FormLabel>AVS Number</FormLabel><FormControl><Input placeholder="756.XXXX.XXXX.XX" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="iban" render={({ field }) => (
              <FormItem><FormLabel>IBAN</FormLabel><FormControl><Input placeholder="CH XX XXXX XXXX XXXX XXXX X" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <FormField control={form.control} name="rue" render={({ field }) => (
              <FormItem><FormLabel>Street</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="ville" render={({ field }) => (
              <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="codePostal" render={({ field }) => (
              <FormItem><FormLabel>Postal code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Employee'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
