'use client';

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, BarChart, Users, Save, FileDown, Scale, CalendarDays, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { swissCantons } from "@/lib/constants";
import {
  financialScenarioInterpreter,
  type FinancialScenarioInterpreterOutput,
} from "@/ai/flows/financial-scenario-interpreter";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
} from "recharts";
import { useFirebase } from "@/firebase/firebase-provider";
import { firestore } from "@/firebase/config";
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, where, query } from "firebase/firestore";
import { calculateWorkforceScenarioSummary } from "@/lib/business/payroll-model";
import { formatCHF } from "@/lib/scenario-calculator/calculations";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  generateScenarioPDF,
  buildWorkforcePDF,
  buildComparisonMeta,
  type ComparisonMeta,
} from "@/lib/scenario-calculator/pdf-export";
import { useTranslations } from 'next-intl';
const formSchema = z.object({
  scenarioName: z.string().min(3, "Scenario name is required."),
  numberOfHires: z.coerce.number().min(1, "Must hire at least 1 employee."),
  averageSalary: z.coerce.number().min(20000, "Average salary must be at least 20,000."),
  averageAge: z.coerce.number().min(18).max(70),
  canton: z.string({ required_error: "Please select a canton." }),
  maritalStatus: z.enum(["single", "married"], {
    required_error: "Please select a household status.",
  }),
  dependents: z.coerce.number().min(0).max(10),
});

type FormValues = z.infer<typeof formSchema>;

type ClientOption = {
  id: string;
  name: string;
  canton: string;
};

type ScenarioResults = {
  estimatedAnnualCost: number;
  estimatedMonthlyCost: number;
  annualGrossPayroll: number;
  annualEmployerContributions: number;
  annualFamilyAllowances: number;
  perHireNetPayBeforeTax: number;
  perHireEmployeeDeductions: number;
  perHireFamilyAllowance: number;
  healthSubsidyAnnual: number;
  healthSubsidyEligible: boolean;
  complementaryBenefitsAnnual: number;
  complementaryBenefitsEligible: boolean;
  ruleSources: string[];
};

type FullResults = ScenarioResults & {
  summary: string;
  recommendations: string[];
  impacts: string[];
};

const toSentenceList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  const bulletChunks = trimmed
    .split(/\n|•|\-/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (bulletChunks.length > 1) return bulletChunks;

  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
};

export default function ScenarioAnalysisPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isClientsLoading, setIsClientsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<FullResults | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [monthsRecorded, setMonthsRecorded] = useState(6);
  const comparisonMeta = useMemo<ComparisonMeta | undefined>(
    () => comparisonEnabled ? buildComparisonMeta(monthsRecorded) : undefined,
    [comparisonEnabled, monthsRecorded]
  );

  const { toast } = useToast();
  const { user } = useFirebase();
  const t = useTranslations('AccountingScenarioAnalysis');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scenarioName: "Q4 Engineering Expansion",
      numberOfHires: 5,
      averageSalary: 90000,
      averageAge: 34,
      canton: "zh",
      maritalStatus: "single",
      dependents: 0,
    },
  });

  const filteredClients = useMemo(() => {
    const queryText = clientSearch.trim().toLowerCase();
    const sortedClients = [...clients].sort((left, right) => left.name.localeCompare(right.name));

    if (!queryText) {
      return sortedClients;
    }

    return sortedClients.filter((client) => (
      client.name.toLowerCase().includes(queryText)
      || client.canton.toLowerCase().includes(queryText)
    ));
  }, [clientSearch, clients]);

  useEffect(() => {
    const loadClients = async () => {
      setIsClientsLoading(true);
      try {
        if (!user) {
          setClients([]);
          return;
        }

        const userSnap = await getDoc(doc(firestore, 'users', user.uid));
        const firmCompanyId = userSnap.data()?.companyId;
        if (!firmCompanyId) {
          setClients([]);
          return;
        }

        const companyQuery = query(collection(firestore, "companies"), where("accountingFirmId", "==", firmCompanyId));
        const snapshot = await getDocs(companyQuery);
        const options = snapshot.docs
          .filter((companyDoc) => {
            const data = companyDoc.data();
            return !data.type || String(data.type).toLowerCase() === 'business';
          })
          .map((companyDoc) => ({
          id: companyDoc.id,
          name: String(companyDoc.data().companyName ?? "Unnamed Client"),
          canton: String(companyDoc.data().canton ?? '').toLowerCase(),
        }));
        setClients(options);
      } catch (error) {
        console.error("Load scenario clients error:", error);
        toast({
          title: t('errorTitle'),
          description: t('loadClientsError'),
          variant: "destructive",
        });
      } finally {
        setIsClientsLoading(false);
      }
    };

    loadClients();
  }, [toast, t, user]);

  const selectedClientName = useMemo(
    () => clients.find((client) => client.id === selectedClient)?.name ?? t('selectedClientFallback'),
    [clients, selectedClient]
  );

  const handleCalculate = async (data: FormValues) => {
    if (!selectedClient) {
      toast({
        title: t('selectClientErrorTitle'),
        description: t('selectClientErrorDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResults(null);

    const summary = calculateWorkforceScenarioSummary(
      {
        grossSalary: data.averageSalary,
        age: data.averageAge,
        canton: data.canton,
        maritalStatus: data.maritalStatus,
        dependents: data.dependents,
      },
      data.numberOfHires
    );

    const scenarioResults: ScenarioResults = {
      estimatedAnnualCost: summary.totals.annualEmployerCost,
      estimatedMonthlyCost: summary.totals.monthlyEmployerCost,
      annualGrossPayroll: summary.totals.annualGrossPayroll,
      annualEmployerContributions: summary.totals.annualEmployerContributions,
      annualFamilyAllowances: summary.totals.annualFamilyAllowances,
      perHireNetPayBeforeTax: summary.perHire.estimatedNetPayBeforeTax,
      perHireEmployeeDeductions: summary.perHire.employeeSocialDeductions.total,
      perHireFamilyAllowance: summary.perHire.annualFamilyAllowance,
      healthSubsidyAnnual: summary.perHire.healthSubsidy.annualSubsidy,
      healthSubsidyEligible: summary.perHire.healthSubsidy.eligible,
      complementaryBenefitsAnnual: summary.perHire.complementaryBenefits.annualBenefit,
      complementaryBenefitsEligible: summary.perHire.complementaryBenefits.eligible,
      ruleSources: [
        ...summary.sourceIndex.familyAllowances,
        ...summary.sourceIndex.maternityAndAdoption,
      ],
    };

    try {
      const aiResponse = await financialScenarioInterpreter({
        scenarioType: `Workforce Expansion for ${selectedClientName}: ${data.scenarioName}`,
        scenarioInputs: data,
        scenarioResults: {
          netSalary: summary.perHire.estimatedNetPayBeforeTax,
          federalTax: 0,
          cantonalTax: 0,
          ahv: summary.perHire.employeeSocialDeductions.ahv,
          alv: summary.perHire.employeeSocialDeductions.alv,
          bvg: summary.perHire.employeeSocialDeductions.bvg,
          nbuv: summary.perHire.employeeSocialDeductions.nbuv,
          totalDeductions: summary.perHire.employeeSocialDeductions.total,
          effectiveTaxRate: data.averageSalary > 0 ? summary.perHire.employeeSocialDeductions.total / data.averageSalary : 0,
        },
      });

      setResults({
        ...scenarioResults,
        summary: typeof (aiResponse as any).summary === 'string'
          ? (aiResponse as any).summary
          : typeof aiResponse.interpretation === 'string'
            ? aiResponse.interpretation
            : '',
        recommendations: toSentenceList((aiResponse as any).recommendations),
        impacts: toSentenceList((aiResponse as any).impacts ?? aiResponse.potentialImpacts),
      });
      toast({
        title: t('analysisComplete'),
        description: `Financial scenario for ${selectedClientName} ${t('analysisCompleteDesc')}`,
      });
    } catch (error) {
      console.error("AI Scenario Interpreter Error:", error);
      toast({
        variant: "destructive",
        title: t('analysisFailed'),
        description: t('analysisFailedDesc'),
      });
    } finally {
      setIsLoading(false);
    }
  };
  
    const handleSaveAnalysis = async () => {
    if (!results || !user || !selectedClient) return;

    setIsSaving(true);
    try {
      const userSnap = await getDoc(doc(firestore, "users", user.uid));
      if (!userSnap.exists()) throw new Error("User profile not found.");

      const markdown = `# Client Scenario Analysis\n\nClient: ${selectedClientName}\n\n## Inputs\n- Gross salary: CHF ${form.getValues("averageSalary")}\n- Canton: ${form.getValues("canton")}\n- Marital status: ${form.getValues("maritalStatus")}\n- Dependents: ${form.getValues("dependents")}\n- Number of hires: ${form.getValues("numberOfHires")}\n- Scenario Name: ${form.getValues("scenarioName")}\n\n## Outputs\n- Estimated Annual Cost: CHF ${results.estimatedAnnualCost.toFixed(2)}\n\n## AI Interpretation\n${results.summary}\n\n## Recommendations\n${results.recommendations.join('\n- ')}\n\n## Potential Impacts\n${results.impacts.join('\n- ')}`;

      await addDoc(collection(firestore, "users", user.uid, "documents"), {
        name: `Scenario Analysis - ${selectedClientName}`,
        templateType: "Client Scenario Analysis",
        content: markdown,
        status: "Approved",
        createdAt: serverTimestamp(),
        userId: user.uid,
        companyId: selectedClient,
        companyName: selectedClientName,
      });

      await addDoc(collection(firestore, "system_logs"), {
        timestamp: serverTimestamp(),
        level: "INFO",
        service: "AI-Model",
        message: `Accounting firm scenario analysis generated for ${selectedClientName}`,
        ipAddress: "127.0.0.1",
        details: {
          userId: user.uid,
          companyId: selectedClient,
          scenarioType: "Salary & Tax",
        },
      });

      toast({
        title: t('analysisSaved'),
        description: t('analysisSavedDesc'),
      });
    } catch (error: any) {
      console.error("Save scenario analysis error:", error);
      toast({
        title: t('saveFailed'),
        description: error.message || t('saveFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const comparisonScale = comparisonMeta?.scaleFactor ?? 1;

  const chartData = results
    ? [
        { name: 'Gross Payroll', value: results.annualGrossPayroll * comparisonScale },
        { name: 'Employer Contributions', value: results.annualEmployerContributions * comparisonScale },
        { name: 'Family Allowances', value: results.annualFamilyAllowances * comparisonScale },
        { name: 'Employer Cost', value: results.estimatedAnnualCost * comparisonScale },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageSubtitle')}</p>
      </div>

      {/* ── Comparison Mode ── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="af-comparison-mode" className="text-sm font-medium">
              Comparison mode (pro-rata)
            </Label>
            <Switch
              id="af-comparison-mode"
              checked={comparisonEnabled}
              onCheckedChange={setComparisonEnabled}
            />
          </div>
          {comparisonEnabled && (
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="af-months-recorded" className="text-sm">
                Months of recorded data:
              </Label>
              <Input
                id="af-months-recorded"
                type="number"
                min={1}
                max={12}
                value={monthsRecorded}
                onChange={(e) => setMonthsRecorded(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">
                Annual figures × {(monthsRecorded / 12).toFixed(4)}
              </span>
            </div>
          )}
        </div>
        {comparisonEnabled && comparisonMeta && (
          <p className="text-xs text-amber-600 mt-2">{comparisonMeta.note}</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('selectClient')}</CardTitle>
          <CardDescription>{t('selectClientDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder={t('searchClientsPlaceholder')}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('clientCount', { count: filteredClients.length })}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('clientName')}</TableHead>
                  <TableHead>{t('canton')}</TableHead>
                  <TableHead className="w-[140px] text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isClientsLoading && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      {t('loadingClients')}
                    </TableCell>
                  </TableRow>
                )}

                {!isClientsLoading && filteredClients.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="h-28 text-center">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {clientSearch.trim() ? t('noMatchingClients') : t('noClients')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {clientSearch.trim() ? t('clearSearchHint') : t('noClientsDescription')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!isClientsLoading && filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    data-state={selectedClient === client.id ? 'selected' : undefined}
                    className="cursor-pointer border-border/70 hover:bg-slate-50/40 dark:hover:bg-slate-900/40"
                    onClick={() => {
                      setSelectedClient(client.id);
                      setResults(null);
                    }}
                  >
                    <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                    <TableCell className="uppercase text-muted-foreground">{client.canton || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedClient(client.id);
                          setResults(null);
                        }}
                      >
                        {t('selectAction')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedClient && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('workforceTitle')}</CardTitle>
              <CardDescription>
                {t('workforceDesc')} {selectedClientName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleCalculate)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="scenarioName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scenario Name</FormLabel>
                        <FormControl>
                          <Input placeholder={t('scenarioNamePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="numberOfHires"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of New Hires</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder={t('hiresPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="averageSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Average Annual Salary (CHF)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder={t('salaryPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="averageAge"
                    render={({ field }) => (
                      <FormItem>
<FormLabel>Average Age</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder={t('agePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dependents"
                    render={({ field }) => (
                      <FormItem>
<FormLabel>Average Dependents</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder={t('dependentsPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="canton"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payroll Canton</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectCanton')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {swissCantons.map((cantonOption) => (
                              <SelectItem key={cantonOption.value} value={cantonOption.value}>
                                {cantonOption.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maritalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Household Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectStatus')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('analyzing')}
                    </>
                  ) : (
                    t('runAnalysis')
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

          <div>
            {isLoading && (
              <Card>
                <CardHeader>
                  <Skeleton className="h-7 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                   <div className="space-y-2">
                     <Skeleton className="h-5 w-1/4" />
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-4 w-5/6" />
                   </div>
                </CardContent>
              </Card>
            )}
            {results && (
                 <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estimated Financial Impact</CardTitle>
                            <CardDescription>
                          Projected employer cost for {form.getValues("numberOfHires")} new hire(s).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ResponsiveContainer width="100%" height={300}>
                                <RechartsBarChart data={chartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(value) => `CHF ${value/1000}k`} />
                                    <YAxis type="category" dataKey="name" width={120}/>
                            <Tooltip formatter={(value: number) => formatCHF(value)} />
                                    <Legend />
                                    <Bar dataKey="value" name="Projected Cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>

                        <div className="grid gap-4 pt-4 md:grid-cols-2">
                          <div className="rounded-lg border p-4">
                          <div className="text-sm text-muted-foreground">Annual Employer Cost</div>
                          <div className="text-2xl font-semibold">{formatCHF(results.estimatedAnnualCost * comparisonScale)}</div>
                          </div>
                          <div className="rounded-lg border p-4">
                          <div className="text-sm text-muted-foreground">Monthly Employer Cost</div>
                          <div className="text-2xl font-semibold">{formatCHF(results.estimatedMonthlyCost * comparisonScale)}</div>
                          </div>
                        </div>
                        </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Per-Hire Benefits Reference</CardTitle>
                        <CardDescription>
                          Estimates for household support and allowances per new employee.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border p-4">
                          <div className="text-sm text-muted-foreground">Net Pay Before Tax</div>
                          <div className="text-xl font-semibold">{formatCHF(results.perHireNetPayBeforeTax)}</div>
                          <div className="text-xs text-muted-foreground">After {formatCHF(results.perHireEmployeeDeductions)} deductions</div>
                        </div>
                        <div className="rounded-lg border p-4">
                          <div className="text-sm text-muted-foreground">Family Allowance</div>
                          <div className="text-xl font-semibold">{formatCHF(results.perHireFamilyAllowance)}</div>
                        </div>
                         <div className="rounded-lg border p-4 md:col-span-2">
                          <div className="text-sm text-muted-foreground">Household Support Eligibility</div>
                          <div className="mt-2 space-y-1 text-sm">
                            <p>Health subsidy: {results.healthSubsidyEligible ? `${formatCHF(results.healthSubsidyAnnual)} est. annual` : 'Not eligible'}</p>
                            <p>Complementary benefits: {results.complementaryBenefitsEligible ? `${formatCHF(results.complementaryBenefitsAnnual)} est. annual` : 'Not eligible'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>AI Financial Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                             <div>
                                <h4 className="font-semibold mb-1">Summary</h4>
                                <p className="text-muted-foreground">{results.summary}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Recommendations</h4>
                                <p className="text-muted-foreground">{results.recommendations.join(" ")}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1">Potential Impacts</h4>
                                <p className="text-muted-foreground">{results.impacts.join(" ")}</p>
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-between items-center">
                            <p className="text-xs text-muted-foreground">AI output is advisory. Confirm assumptions before client recommendations.</p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const pdfData = buildWorkforcePDF(results, form.getValues(), comparisonMeta);
                                  generateScenarioPDF(pdfData);
                                }}
                              >
                                <FileDown className="h-4 w-4 mr-2" />
                                Export PDF
                              </Button>
                              <Button onClick={handleSaveAnalysis} disabled={isSaving}>
                                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                {t('saveAnalysis')}
                              </Button>
                            </div>
                         </CardFooter>
                    </Card>
                 </div>
            )}
            {!isLoading && !results && (
              <Card className="flex items-center justify-center h-full border-2 border-dashed">
                <div className="text-center text-muted-foreground p-8">
                  <BarChart className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold">{t('resultsTitle')}</h3>
                  <p>{t('resultsDesc')}</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {!selectedClient && !isClientsLoading && (
        <Card className="flex items-center justify-center h-96 border-2 border-dashed">
          <div className="text-center text-muted-foreground p-8">
            <Users className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">{t('noClientTitle')}</h3>
            <p>{t('noClientDesc')}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
