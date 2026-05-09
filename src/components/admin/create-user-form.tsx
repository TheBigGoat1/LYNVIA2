'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { auth, firestore } from '@/firebase/config';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { type ClaRule, validateSalaryAgainstCla, type SalaryValidationResult, resolveClaSafe } from '@/lib/cla-rules';
import { LPP_2026, checkLppEnrollment, calculateLppContribution, type LppContributionResult, type LppAgeBracket } from '@/lib/lpp-rules';
import { Separator } from '@/components/ui/separator';

const createUserSchema = z.object({
  prenom: z.string().min(1, 'Prénom requis.'),
  nom: z.string().min(1, 'Nom requis.'),
  dateNaissance: z.string().min(1, 'Date de naissance requise.'),
  telephone: z.string().optional(),
  email: z.string().email('Email invalide').optional(),
  fonction: z.string().min(1, 'Fonction requise.'),
  dateDebut: z.string().min(1, 'Date de début requise.'),
  typeRemu: z.enum(['horaire', 'mensuel']),
  salaireHoraire: z.number().optional(),
  salaireAnnuel: z.number().optional(),
  salaireMensuel: z.number().optional(),
  semainesVacances: z.number().min(0, 'Semaines de vacances requises.'),
  tauxActivite: z.number().min(0, 'Taux d\'activité requis.'),
  numeroAVS: z.string().min(1, 'Numéro AVS requis.'),
  statutAVS: z.enum(['valide', 'a_verifier', 'invalide']),
  iban: z.string().optional(),
  rue: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  has3MonthsHistory: z.boolean().optional(),
  role: z.enum(['individual', 'business', 'accounting_firm', 'admin']),
  status: z.enum(['active', 'pending_approval', 'suspended']),
  companyId: z.string().optional(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

type CompanyOption = {
  id: string;
  name: string;
};

interface CreateUserFormProps {
  onClose: () => void;
}

export function CreateUserForm({ onClose }: CreateUserFormProps) {
  const t = useTranslations('AdminUserManagement');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(true);
  const [companyCla, setCompanyCla] = useState<ClaRule | null>(null);
  const [salaryWarning, setSalaryWarning] = useState<SalaryValidationResult | null>(null);
  const [claLabel, setClaLabel] = useState<string | null>(null);
  const [lppEnrollment, setLppEnrollment] = useState<ReturnType<typeof checkLppEnrollment> | null>(null);
  const [lppContribution, setLppContribution] = useState<LppContributionResult | null>(null);
  const [companyHasLppPlan, setCompanyHasLppPlan] = useState<boolean | null>(null);
  const [companyLppBrackets, setCompanyLppBrackets] = useState<LppAgeBracket[] | null>(null);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      prenom: '',
      nom: '',
      dateNaissance: '',
      telephone: '',
      email: '',
      fonction: '',
      dateDebut: '',
      typeRemu: 'horaire',
      salaireHoraire: undefined,
      salaireAnnuel: undefined,
      salaireMensuel: undefined,
      semainesVacances: 5,
      tauxActivite: 100,
      numeroAVS: '',
      statutAVS: 'a_verifier',
      iban: '',
      rue: '',
      ville: '',
      codePostal: '',
      has3MonthsHistory: false,
      role: 'individual',
      status: 'active',
      companyId: '',
    },
  });
  
  useEffect(() => {
    const fetchCompanies = async () => {
        try {
            const companiesQuery = query(collection(firestore, 'companies'));
            const querySnapshot = await getDocs(companiesQuery);
            const companyList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().companyName
            }));
            setCompanies(companyList);
        } catch (error) {
            console.error("Error fetching companies: ", error);
        } finally {
            setIsCompaniesLoading(false);
        }
    };
    fetchCompanies();
  }, []);

  // Fetch CLA when company selection changes
  const selectedCompanyId = form.watch('companyId');
  useEffect(() => {
    if (!selectedCompanyId || selectedCompanyId === 'none') {
      setCompanyCla(null);
      setSalaryWarning(null);
      return;
    }
    const fetchCompanyCla = async () => {
      try {
        const companyDocRef = doc(firestore, 'companies', selectedCompanyId);
        const companySnap = await getDoc(companyDocRef);
        if (companySnap.exists()) {
          const data = companySnap.data();
          if (data.cla) {
            // CLA already stored on the company document
            setCompanyCla(data.cla as ClaRule);
            setClaLabel(data.cla.name);
          } else if (data.industry || data.secteurActivite) {
            // Fallback: resolve from stored industry field
            const industry = data.industry || data.secteurActivite || '';
            const resolution = resolveClaSafe(industry);
            setCompanyCla(resolution.cla);
            setClaLabel(`${resolution.cla.name} (via industry: ${industry})`);
          } else {
            setCompanyCla(null);
            setClaLabel(null);
          }
        } else {
          setCompanyCla(null);
          setClaLabel(null);
        }
      } catch {
        setCompanyCla(null);
        setClaLabel(null);
      }
    };
    fetchCompanyCla();
  }, [selectedCompanyId]);

  // Check if selected company already has an LPP plan configured
  useEffect(() => {
    if (!selectedCompanyId || selectedCompanyId === 'none') {
      setCompanyHasLppPlan(null);
      setCompanyLppBrackets(null);
      return;
    }
    const checkLppPlan = async () => {
      try {
        const companySnap = await getDoc(doc(firestore, 'companies', selectedCompanyId));
        if (companySnap.exists()) {
          const data = companySnap.data();
          // A company has an LPP plan if custom brackets are saved OR a lppInsurerName is stored
          setCompanyHasLppPlan(!!(data.lppBrackets || data.lppInsurerName));
          setCompanyLppBrackets(data.lppBrackets ?? null);
        } else {
          setCompanyHasLppPlan(false);
          setCompanyLppBrackets(null);
        }
      } catch {
        setCompanyHasLppPlan(null);
        setCompanyLppBrackets(null);
      }
    };
    checkLppPlan();
  }, [selectedCompanyId]);

  // Validate salary against CLA whenever salary or function changes
  const watchedSalaireMensuel = form.watch('salaireMensuel');
  const watchedSalaireHoraire = form.watch('salaireHoraire');
  const watchedFonction = form.watch('fonction');
  const watchedTypeRemu = form.watch('typeRemu');

  useEffect(() => {
    if (!companyCla) {
      setSalaryWarning(null);
      return;
    }
    const rawMensuel = parseFloat(String(watchedSalaireMensuel ?? ''));
    const rawHoraire = parseFloat(String(watchedSalaireHoraire ?? ''));
    const monthly = watchedTypeRemu === 'mensuel' && !isNaN(rawMensuel) && rawMensuel > 0
      ? rawMensuel
      : watchedTypeRemu === 'horaire' && !isNaN(rawHoraire) && rawHoraire > 0
        ? rawHoraire * 173.33
        : null;
    if (monthly === null || monthly <= 0) {
      setSalaryWarning(null);
      return;
    }
    const result = validateSalaryAgainstCla(companyCla, monthly, watchedFonction);
    setSalaryWarning(result.severity !== 'ok' ? result : null);
  }, [companyCla, watchedSalaireMensuel, watchedSalaireHoraire, watchedFonction, watchedTypeRemu]);

  // LPP enrollment check & contribution calculation
  const watchedDateNaissance = form.watch('dateNaissance');
  useEffect(() => {
    const rawMensuel = parseFloat(String(watchedSalaireMensuel ?? ''));
    const rawHoraire = parseFloat(String(watchedSalaireHoraire ?? ''));
    const monthly = watchedTypeRemu === 'mensuel' && !isNaN(rawMensuel) && rawMensuel > 0
      ? rawMensuel
      : watchedTypeRemu === 'horaire' && !isNaN(rawHoraire) && rawHoraire > 0
        ? rawHoraire * 173.33
        : null;
    if (monthly === null || monthly <= 0) {
      setLppEnrollment(null);
      setLppContribution(null);
      return;
    }
    const enrollment = checkLppEnrollment(monthly);
    setLppEnrollment(enrollment);
    if (enrollment.mustEnroll && watchedDateNaissance) {
      setLppContribution(calculateLppContribution(monthly, watchedDateNaissance, companyLppBrackets ?? undefined));
    } else {
      setLppContribution(null);
    }
  }, [watchedSalaireMensuel, watchedSalaireHoraire, watchedTypeRemu, watchedDateNaissance, companyLppBrackets]);

  const handleCreateUser = async (values: CreateUserFormValues) => {
    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in as an admin to create users.');
      }

      const finalCompanyId = values.companyId && values.companyId !== 'none' ? values.companyId : null;
      const idToken = await currentUser.getIdToken();

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          ...values,
          companyId: finalCompanyId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user.');
      }

      toast({
        title: t('toast.createUserSuccess.title'),
        description: t('toast.createUserSuccess.description'),
      });

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'User creation failed',
        description: error.message || 'Unable to create user account.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>{t('dialog.title')}</DialogTitle>
        <DialogDescription>{t('dialog.description')}</DialogDescription>
      </DialogHeader>
      
      <div className="flex-1 overflow-y-auto px-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-6">
            {/* Company Selection — FIRST so CLA loads before salary is entered */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase">Company & CLA</h3>
              <FormField control={form.control} name="companyId" render={({ field }) => (
                <FormItem><FormLabel>{t('dialog.labels.company')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCompaniesLoading}>
                    <FormControl><SelectTrigger><SelectValue placeholder={isCompaniesLoading ? t('dialog.placeholders.loading') : t('dialog.placeholders.selectCompany')} /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t('dialog.placeholders.noCompany')}</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              {claLabel && (
                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <ShieldAlert className="h-3 w-3" />
                  <span>CLA applied: <strong>{claLabel}</strong></span>
                </div>
              )}
              {selectedCompanyId && selectedCompanyId !== 'none' && !claLabel && !isCompaniesLoading && (
                <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>No CLA found for this company — salary validation disabled.</span>
                </div>
              )}
            </div>

            {/* Personal Information Section */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase">{t('dialog.sections.personalInformation')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="prenom" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.firstName')} *</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.firstName')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="nom" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.lastName')} *</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.lastName')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateNaissance" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.birthDate')} *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase">{t('dialog.sections.contact')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.email')}</FormLabel><FormControl><Input type="email" {...field} placeholder={t('dialog.placeholders.email')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telephone" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.phone')}</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.phone')} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Employment Section */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase">{t('dialog.sections.employment')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="fonction" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.jobTitle')} *</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.jobTitle')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateDebut" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.startDate')} *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="typeRemu" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.remunerationType')} *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="horaire">{t('dialog.options.hourly')}</SelectItem><SelectItem value="mensuel">{t('dialog.options.monthly')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <FormField control={form.control} name="semainesVacances" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.vacationWeeks')} *</FormLabel><FormControl><Input type="number" step="0.5" {...field} placeholder={t('dialog.placeholders.vacationWeeks')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tauxActivite" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.activityRate')} *</FormLabel><FormControl><Input type="number" step="0.1" {...field} placeholder={t('dialog.placeholders.activityRate')} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Payroll Section */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase">{t('dialog.sections.payroll')}</h3>

              {/* CLA Salary Alert */}
              {salaryWarning && (
                <Alert variant={salaryWarning.severity === 'blocking' ? 'destructive' : 'default'} className="mb-4">
                  {salaryWarning.severity === 'blocking' ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <AlertTitle>
                    {salaryWarning.severity === 'blocking' ? 'CLA Minimum Wage Violation' : 'Salary Warning'}
                  </AlertTitle>
                  <AlertDescription>{salaryWarning.message}</AlertDescription>
                </Alert>
              )}

              {/* LPP Enrollment Alert */}
              {lppEnrollment && lppEnrollment.mustEnroll && (
                <Alert variant="default" className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                  <ShieldAlert className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800 dark:text-blue-200">LPP / 2nd Pillar Enrollment Required</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300 space-y-1.5">
                    <p>
                      Monthly salary <strong>CHF {lppEnrollment.grossMonthly.toLocaleString('fr-CH', { maximumFractionDigits: 2 })}</strong> exceeds
                      the LPP entry threshold of <strong>CHF {LPP_2026.entryThresholdMonthly.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}/month</strong> (CHF {LPP_2026.entryThresholdAnnual.toLocaleString('fr-CH')}/year).
                    </p>
                    {companyHasLppPlan === true ? (
                      <p>This company already has an LPP plan. <strong>Declare this employee to the existing insurer</strong> to add them to the current plan.</p>
                    ) : (
                      <p>This employee <strong>must be enrolled in an LPP insurance plan.</strong> If the company already has employees in an existing plan, declare to that insurer instead.</p>
                    )}
                    {lppContribution && lppContribution.insuredMonthly > 0 && (
                      <div className="mt-2 text-xs bg-white/60 dark:bg-white/5 rounded p-2 space-y-0.5">
                        <p>Insured monthly salary: <strong>CHF {lppContribution.insuredMonthly.toLocaleString('fr-CH', { maximumFractionDigits: 2 })}</strong></p>
                        <p>LPP rate applied: <strong>{(lppContribution.lppRate * 100).toFixed(1)}%</strong> ({lppContribution.ageBracketLabel})</p>
                        <p>Estimated monthly LPP contribution: <strong>CHF {lppContribution.lppContributionMonthly.toLocaleString('fr-CH', { maximumFractionDigits: 2 })}</strong></p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField control={form.control} name="salaireHoraire" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.hourlyRate')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder={t('dialog.placeholders.hourlyRate')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="salaireMensuel" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.monthlySalary')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder={t('dialog.placeholders.monthlySalary')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="salaireAnnuel" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.annualSalary')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder={t('dialog.placeholders.annualSalary')} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <FormField control={form.control} name="numeroAVS" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.avsNumber')} *</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.avsNumber')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="statutAVS" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.avsStatus')} *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="valide">{t('dialog.options.valid')}</SelectItem><SelectItem value="a_verifier">{t('dialog.options.toVerify')}</SelectItem><SelectItem value="invalide">{t('dialog.options.invalid')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Address Section */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase">{t('dialog.sections.address')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField control={form.control} name="rue" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.street')}</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.street')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ville" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.city')}</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.city')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="codePostal" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.postalCode')}</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.postalCode')} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="iban" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.iban')}</FormLabel><FormControl><Input {...field} placeholder={t('dialog.placeholders.iban')} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* System Information Section */}
            <div>
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase">{t('dialog.sections.system')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.role')} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('dialog.placeholders.selectRole')} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="individual">{t('dialog.options.individual')}</SelectItem>
                        <SelectItem value="business">{t('dialog.options.business')}</SelectItem>
                        <SelectItem value="accounting_firm">{t('dialog.options.accountingFirm')}</SelectItem>
                        <SelectItem value="admin">{t('dialog.options.admin')}</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>{t('dialog.labels.status')} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('dialog.placeholders.selectStatus')} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t('dialog.options.active')}</SelectItem>
                        <SelectItem value="pending_approval">{t('dialog.options.pendingApproval')}</SelectItem>
                        <SelectItem value="suspended">{t('dialog.options.suspended')}</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
              </div>
              {/* Company field moved to top of form — see Company & CLA section above */}
            </div>
          </form>
        </Form>
      </div>

      <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>{t('dialog.buttons.cancel')}</Button>
        <Button type="submit" onClick={() => form.handleSubmit(handleCreateUser)()} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t('dialog.buttons.creating') : t('dialog.buttons.create')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
