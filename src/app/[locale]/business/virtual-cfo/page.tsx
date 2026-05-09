'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CantonSearch } from '@/components/ui/canton-search';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingUp as TrendingUpIcon,
  Download,
  Calculator,
  Users,
  DollarSign,
  Clock,
  FileText,
  Target,
  Plus,
  X,
  AlertCircle,
  Loader2,
  FileDown,
  Scale,
  CalendarDays,
  Landmark,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { firestore } from '@/firebase/config';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import {
  buildCompoundInterestPDF,
  buildRentalYieldPDF,
  buildRevenueGrowthPDF,
  buildVATPDF,
  buildWorkforcePDF,
  buildComparisonMeta,
  scaleResults,
  generateScenarioPDF,
  generateScenarioPDFBlob,
  type PDFReportData,
  type ComparisonMeta,
} from '@/lib/scenario-calculator/pdf-export';
import {
  calculateCompoundInterest,
  calculateRentalYield,
  type CompoundInterestInput,
  type RentalYieldInput,
  type RentalYieldResult,
} from '@/lib/scenario-calculator/investment';
import {
  financialScenarioInterpreter,
  type FinancialScenarioInterpreterOutput,
} from '@/ai/flows/financial-scenario-interpreter';
import { calculateWorkforceScenarioSummary } from '@/lib/business/payroll-model';
import TVAComparisonForm, { type TVAFormData } from '@/components/vat/tva-comparison-form';
import TVAResultsCard, { type TVAComparisonResult } from '@/components/vat/tva-results-card';
import RevenueGrowthForm from '@/components/scenarios/revenue-growth-form';
import RevenueGrowthResults from '@/components/scenarios/revenue-growth-results';
import { calculateRevenueGrowth, type RevenueGrowthResult } from '@/lib/scenario-calculator/revenue-growth';
import CompoundInterestForm from '@/components/scenarios/compound-interest-form';
import CompoundInterestResults from '@/components/scenarios/compound-interest-results';
import RentalYieldForm from '@/components/scenarios/rental-yield-form';
import RentalYieldResults from '@/components/scenarios/rental-yield-results';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
} from 'recharts';
import { collection, doc, getDoc, onSnapshot, orderBy, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notifyAdmin } from '@/lib/admin-notifications';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── CFO Data Type ──────────────────────────────────────────────────────────
type CFOData = {
  period: string;
  turnover: number;
  purchases: number;
  rawWages: number;
  salaryCharges: number;
  operatingCosts: number;
  financialCharges: number;
  otherCharges: number;
  profitLoss: number;
  aiAnalysis: {
    summary: string;
    keyRatios: string[];
    risks: string[];
    opportunities: string[];
    recommendations: string[];
  } | null;
};

type CFOPeriodOption = {
  id: string;
  label: string;
};

// ── TDFN Sectors list for the VAT comparison ───────────────────────────────
const TDFN_SECTORS = [
  { id: 'accommodation', tdfn: 0.038 },
  { id: 'restaurant', tdfn: 0.062 },
  { id: 'retail', tdfn: 0.062 },
  { id: 'financialServices', tdfn: 0.027 },
  { id: 'consulting', tdfn: 0.062 },
  { id: 'construction', tdfn: 0.062 },
  { id: 'crafts', tdfn: 0.062 },
  { id: 'itServices', tdfn: 0.062 },
  { id: 'transport', tdfn: 0.038 },
  { id: 'agriculture', tdfn: 0.026 },
];

// ── Default empty CFO data ─────────────────────────────────────────────────
const DEFAULT_CFO_DATA: CFOData = {
  period: '',
  turnover: 0,
  purchases: 0,
  rawWages: 0,
  salaryCharges: 0,
  operatingCosts: 0,
  financialCharges: 0,
  otherCharges: 0,
  profitLoss: 0,
  aiAnalysis: null,
};

// ── Helpers ────────────────────────────────────────────────────────────────
const resolveSwissLocale = (locale: string) => {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'en') {
    return `${normalized}-CH`;
  }
  return 'en-CH';
};

const formatCHF = (n: number, locale: string) =>
  `${n.toLocaleString(resolveSwissLocale(locale), { minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF`;

const formatPct = (n: number, locale: string) =>
  `${new Intl.NumberFormat(resolveSwissLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)}%`;

const normalizeAnalysis = (analysis: Record<string, unknown> | null | undefined) => {
  if (!analysis) return null;
  return {
    summary: typeof analysis.summary === 'string' ? analysis.summary : '',
    keyRatios: Array.isArray(analysis.keyRatios) ? analysis.keyRatios.map(String) : [],
    risks: Array.isArray(analysis.risks) ? analysis.risks.map(String) : [],
    opportunities: Array.isArray(analysis.opportunities) ? analysis.opportunities.map(String) : [],
    recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations.map(String) : [],
  };
};

const normalizeCFOData = (periodId: string, raw: Record<string, unknown>): CFOData => ({
  period: String(raw.period ?? periodId),
  turnover: Number(raw.turnover ?? 0),
  purchases: Number(raw.purchases ?? 0),
  rawWages: Number(raw.rawWages ?? 0),
  salaryCharges: Number(raw.salaryExpenses ?? raw.salaryCharges ?? 0),
  operatingCosts: Number(raw.operatingCosts ?? 0),
  financialCharges: Number(raw.financialCharges ?? 0),
  otherCharges: Number(raw.otherCharges ?? 0),
  profitLoss: Number(raw.profitOrLoss ?? raw.profitLoss ?? 0),
  aiAnalysis: normalizeAnalysis((raw.aiAnalysis ?? null) as Record<string, unknown> | null),
});

const getTdfnRate = (sectorId: string) =>
  TDFN_SECTORS.find((sector) => sector.id === sectorId)?.tdfn ?? 0;

// ── Calculate ratios from CFO data ─────────────────────────────────────────
const calculateRatios = (data: CFOData) => {
  const totalCharges = data.purchases + data.rawWages + data.salaryCharges + 
    data.operatingCosts + data.financialCharges + data.otherCharges;
  
  if (data.turnover === 0) {
    return { margin: 0, result: 0, caPurchases: 0, caTotalCharges: 0 };
  }
  
  return {
    margin: ((data.turnover - data.purchases) / data.turnover) * 100,
    result: (data.profitLoss / data.turnover) * 100,
    caPurchases: ((data.turnover - data.purchases) / data.turnover) * 100,
    caTotalCharges: ((data.turnover - totalCharges) / data.turnover) * 100,
  };
};

// ── Workforce Scenario Schema ──────────────────────────────────────────────
const scenarioValidationErrors = {
  nameRequired: 'Scenario name is required.',
  minHires: 'Must hire at least 1 employee.',
  minSalary: 'Average salary must be at least 20,000.',
  selectCanton: 'Please select a canton.',
  selectStatus: 'Please select a household status.',
};

const workforceFormSchema = z.object({
  scenarioName: z.string().min(3, scenarioValidationErrors.nameRequired),
  numberOfHires: z.coerce.number().min(1, scenarioValidationErrors.minHires),
  averageSalary: z.coerce.number().min(20000, scenarioValidationErrors.minSalary),
  averageAge: z.coerce.number().min(18).max(70),
  canton: z.string({ required_error: scenarioValidationErrors.selectCanton }),
  maritalStatus: z.enum(['single', 'married'], { required_error: scenarioValidationErrors.selectStatus }),
  dependents: z.coerce.number().min(0).max(10),
  notes: z.string().optional(),
});
type WorkforceFormValues = z.infer<typeof workforceFormSchema>;
type WorkforceFullResults = Awaited<ReturnType<typeof calculateWorkforceScenarioSummary>> &
  FinancialScenarioInterpreterOutput;

// ── Page Component ─────────────────────────────────────────────────────────
export default function VirtualCFOPage() {
  const locale = useLocale();
  const cfoT = useTranslations('VirtualCFO');
  const pageT = useTranslations('VirtualCFO.page');
  const t = useMemo(
    () =>
      new Proxy({} as Record<string, string>, {
        get: (_, prop: string) => pageT(prop),
      }),
    [pageT]
  );
  const sectorOptions = useMemo(
    () =>
      TDFN_SECTORS.map((sector) => ({
        ...sector,
        label: pageT(`sectors.${sector.id}`),
      })),
    [pageT]
  );
  const getSectorLabel = (sectorId: string) =>
    sectorOptions.find((sector) => sector.id === sectorId)?.label ?? sectorId;
  const { user } = useFirebase();
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [periodOptions, setPeriodOptions] = useState<CFOPeriodOption[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');

  // ─── CFO Data State (fetched from Firestore) ─────────────────────────────
  const [cfoData, setCfoData] = useState<CFOData>(DEFAULT_CFO_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!user) {
      setCompanyId(null);
      setCfoData(DEFAULT_CFO_DATA);
      setPeriodOptions([]);
      setSelectedPeriod('');
      setHasData(false);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    getDoc(doc(firestore, 'users', user.uid))
      .then((snap) => {
        if (!active) return;
        const nextCompanyId = (snap.data()?.companyId as string | undefined) ?? null;
        setCompanyId(nextCompanyId);
        if (!nextCompanyId) {
          setPeriodOptions([]);
          setSelectedPeriod('');
          setHasData(false);
          setCfoData(DEFAULT_CFO_DATA);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error loading Virtual CFO company context:', error);
        if (!active) return;
        setIsLoading(false);
        toast({
          title: cfoT('toast.dataLoadFailed.title'),
          description: cfoT('toast.dataLoadFailed.description'),
          variant: 'destructive',
        });
      });

    return () => {
      active = false;
    };
  }, [cfoT, toast, user]);

  useEffect(() => {
    if (!companyId) return;

    const periodsQuery = query(
      collection(firestore, 'companies', companyId, 'cfo_summaries'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      periodsQuery,
      (snapshot) => {
        const namedPeriods = snapshot.docs.filter((entry) => entry.id !== 'latest');
        const latestPeriod = snapshot.docs.find((entry) => entry.id === 'latest');
        const options = namedPeriods.map((entry) => {
          const data = entry.data() as Record<string, unknown>;
          return {
            id: entry.id,
            label: String(data.period ?? entry.id),
          };
        });

        if (options.length === 0 && latestPeriod) {
          const latestData = latestPeriod.data() as Record<string, unknown>;
          options.push({
            id: latestPeriod.id,
            label: String(latestData.period ?? latestPeriod.id),
          });
        }

        setPeriodOptions(options);
        setSelectedPeriod((current) => {
          if (current && options.some((option) => option.id === current)) {
            return current;
          }
          return options[0]?.id ?? '';
        });

        if (options.length === 0) {
          setHasData(false);
          setCfoData(DEFAULT_CFO_DATA);
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Error loading Virtual CFO periods:', error);
        setIsLoading(false);
        toast({
          title: cfoT('toast.dataLoadFailed.title'),
          description: cfoT('toast.dataLoadFailed.description'),
          variant: 'destructive',
        });
      }
    );

    return () => unsubscribe();
  }, [cfoT, companyId, toast]);

  useEffect(() => {
    if (!companyId || !selectedPeriod) return;

    setIsLoading(true);
    const summaryRef = doc(firestore, 'companies', companyId, 'cfo_summaries', selectedPeriod);
    const unsubscribe = onSnapshot(
      summaryRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          setCfoData(DEFAULT_CFO_DATA);
          setHasData(false);
          setIsLoading(false);
          return;
        }

        setCfoData(normalizeCFOData(docSnap.id, docSnap.data() as Record<string, unknown>));
        setHasData(true);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading Virtual CFO summary:', error);
        setHasData(false);
        setIsLoading(false);
        toast({
          title: cfoT('toast.dataLoadFailed.title'),
          description: cfoT('toast.dataLoadFailed.description'),
          variant: 'destructive',
        });
      }
    );

    return () => unsubscribe();
  }, [cfoT, companyId, selectedPeriod, toast]);

  // Calculate ratios dynamically
  const ratios = useMemo(() => calculateRatios(cfoData), [cfoData]);

  // Scenario selection
  const [selectedScenario, setSelectedScenario] = useState<string>('ca');

  // ─── Increase CA Scenario State ──────────────────────────────────────────
  const [caScenario, setCaScenario] = useState({
    currentCA: 0,
    newCA: 0,
    currentPurchases: 0,
    increasePurchases: 0,
  });

  // Sync CA scenario with CFO data when data loads
  useEffect(() => {
    if (hasData) {
      setCaScenario((prev) => ({
        ...prev,
        currentCA: cfoData.turnover,
        newCA: cfoData.turnover,
        currentPurchases: cfoData.purchases,
      }));
    }
  }, [hasData, cfoData.turnover, cfoData.purchases]);

  // Calculate CA scenario results dynamically
  const caResults = useMemo(() => {
    const newPurchases = caScenario.currentPurchases * (1 + caScenario.increasePurchases / 100);
    const newResult = caScenario.newCA - newPurchases - cfoData.rawWages - 
      cfoData.salaryCharges - cfoData.operatingCosts - cfoData.financialCharges - cfoData.otherCharges;
    const currentResult = cfoData.profitLoss;
    const deltaVsCurrent = newResult - currentResult;
    const newMargin = caScenario.newCA > 0 ? ((caScenario.newCA - newPurchases) / caScenario.newCA) * 100 : 0;
    const newResultPct = caScenario.newCA > 0 ? (newResult / caScenario.newCA) * 100 : 0;
    
    return {
      newResult,
      deltaVsCurrent,
      newMargin,
      newResultPct,
    };
  }, [caScenario, cfoData]);

  // ─── Hiring/Dismissal Scenario State ─────────────────────────────────────
  const [employeeScenario, setEmployeeScenario] = useState({
    type: 'hire' as 'hire' | 'dismiss',
    grossMonthlySalary: 0,
  });

  // Calculate employee scenario results dynamically
  const employeeResults = useMemo(() => {
    const totalImpact = employeeScenario.grossMonthlySalary * 1.25; // Gross + 25% charges
    const monthlyImpact = employeeScenario.type === 'hire' ? totalImpact : -totalImpact;
    const annualImpact = monthlyImpact * 12;
    const employeeShare = employeeScenario.grossMonthlySalary * 0.12; // 12% employee share
    
    return {
      monthlyImpact,
      annualImpact,
      employeeShare,
    };
  }, [employeeScenario]);

  // ─── Investment Scenario State ───────────────────────────────────────────
  const [investScenario, setInvestScenario] = useState({
    type: 'realEstate' as 'compound' | 'realEstate' | 'other',
    purchasePrice: 0,
    ownFunds: 0,
    annualIncome: 0,
    mortgageCharges: 0,
  });

  const [compoundScenario, setCompoundScenario] = useState<CompoundInterestInput>({
    capitalInitial: 10000,
    versementPeriodique: 500,
    frequenceVersement: 'monthly',
    tauxRendementAnnuel: 5,
    dureeAnnees: 20,
    frequenceCapitalisation: 'monthly',
  });

  const compoundResults = useMemo(
    () => calculateCompoundInterest(compoundScenario),
    [compoundScenario]
  );

  // Calculate investment ratios dynamically
  const investResults = useMemo(() => {
    const { purchasePrice, ownFunds, annualIncome, mortgageCharges } = investScenario;
    const debt = purchasePrice - ownFunds;
    
    // Handle edge cases to avoid division by zero
    const roi = purchasePrice > 0 ? (annualIncome / purchasePrice) * 100 : 0;
    const netIncome = annualIncome - mortgageCharges;
    const effectiveYield = ownFunds > 0 ? (netIncome / ownFunds) * 100 : 0;
    const debtEquityRatio = ownFunds > 0 ? debt / ownFunds : 0;
    const leverageRatio = purchasePrice > 0 ? (debt / purchasePrice) * 100 : 0;
    const dscr = mortgageCharges > 0 ? annualIncome / mortgageCharges : 0;
    
    return {
      roi,
      effectiveYield,
      debtEquityRatio,
      leverageRatio,
      dscr,
    };
  }, [investScenario]);

  // ─── VAT Scenario State ──────────────────────────────────────────────────
  const [vatForm, setVatForm] = useState({
    CA_0: 0,
    CA_26: 0,
    CA_38: 0,
    CA_81: 0,
    purchases_26: 0,
    purchases_81: 0,
    expenses_26: 0,
    expenses_81: 0,
    sectors: [] as Array<{ nom: string; montantCA: number; tauxTVA: number }>,
  });

  const [newSector, setNewSector] = useState({
    nom: '',
    montantCA: 0,
    tauxTVA: 8.1,
  });

  const addSector = () => {
    if (newSector.nom && newSector.montantCA > 0) {
      setVatForm((prev) => ({
        ...prev,
        sectors: [...prev.sectors, { ...newSector }],
      }));
      setNewSector({ nom: '', montantCA: 0, tauxTVA: 8.1 });
    }
  };

  const removeSector = (idx: number) => {
    setVatForm((prev) => ({
      ...prev,
      sectors: prev.sectors.filter((_, i) => i !== idx),
    }));
  };

  const totalCA =
    vatForm.CA_0 +
    vatForm.CA_26 +
    vatForm.CA_38 +
    vatForm.CA_81 +
    vatForm.sectors.reduce((sum, s) => sum + s.montantCA, 0);

  const vatResults = useMemo(() => {
    const outputVatFromSectors = vatForm.sectors.reduce(
      (sum, sector) => sum + sector.montantCA * (sector.tauxTVA / 100),
      0
    );
    const outputVatFromStandard =
      vatForm.CA_26 * 0.026 + vatForm.CA_38 * 0.038 + vatForm.CA_81 * 0.081;
    const inputVat =
      vatForm.purchases_26 * 0.026 +
      vatForm.purchases_81 * 0.081 +
      vatForm.expenses_26 * 0.026 +
      vatForm.expenses_81 * 0.081;

    const tvaEffective = outputVatFromSectors + outputVatFromStandard - inputVat;
    const tvaTDFNSectors = vatForm.sectors.reduce(
      (sum, sector) => sum + sector.montantCA * getTdfnRate(sector.nom),
      0
    );
    const tvaTDFNStandard = outputVatFromStandard;
    const tvaTDFN = tvaTDFNSectors + tvaTDFNStandard;
    const methodeRecommandee = tvaTDFN < tvaEffective ? 'TDFN' : 'Effective';

    return {
      tvaEffective,
      tvaTDFN,
      economie: Math.abs(tvaEffective - tvaTDFN),
      methodeRecommandee,
      detailsEffective: {
        tvaCollectee: outputVatFromSectors + outputVatFromStandard,
        impotPrealable: inputVat,
        tvaNetteDue: tvaEffective,
      },
      detailsTDFN: {
        parSecteur: vatForm.sectors.map((sector) => ({
          secteur: getSectorLabel(sector.nom),
          taux: getTdfnRate(sector.nom),
          tvaDue: sector.montantCA * getTdfnRate(sector.nom),
        })),
      },
    };
  }, [vatForm, sectorOptions]);

  const exportAccountsReport = async () => {
    if (!hasData) {
      toast({
        title: cfoT('toast.noData.title'),
        description: cfoT('toast.noData.description'),
        variant: 'destructive',
      });
      return;
    }

    await generateScenarioPDF({
      title: `${t.title} - ${cfoData.period || selectedPeriod}`,
      subtitle: t.subtitle,
      generatedAt: new Date().toLocaleDateString(resolveSwissLocale(locale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      sections: [
        {
          title: cfoData.period || selectedPeriod,
          rows: [
            { label: t.turnover, value: formatCHF(cfoData.turnover, locale) },
            { label: t.purchases, value: formatCHF(cfoData.purchases, locale) },
            { label: t.rawWages, value: formatCHF(cfoData.rawWages, locale) },
            { label: t.salaryCharges, value: formatCHF(cfoData.salaryCharges, locale) },
            { label: t.operatingCosts, value: formatCHF(cfoData.operatingCosts, locale) },
            { label: t.financialCharges, value: formatCHF(cfoData.financialCharges, locale) },
            { label: t.otherCharges, value: formatCHF(cfoData.otherCharges, locale) },
            { label: t.profitLoss, value: formatCHF(cfoData.profitLoss, locale) },
          ],
        },
        {
          title: t.quickAnalysis,
          rows: [
            { label: t.margin, value: formatPct(ratios.margin, locale) },
            { label: t.result, value: formatPct(ratios.result, locale) },
            { label: t.caPurchases, value: formatPct(ratios.caPurchases, locale) },
            { label: t.caTotalCharges, value: formatPct(ratios.caTotalCharges, locale) },
          ],
        },
        ...(cfoData.aiAnalysis
          ? [
              {
                title: cfoT('results.summary'),
                rows: [{ label: cfoT('results.summary'), value: cfoData.aiAnalysis.summary }],
              },
            ]
          : []),
      ],
    });
  };

  const exportRevenueReport = async () => {
    await generateScenarioPDF(
      buildRevenueGrowthPDF({
        caActuel: caScenario.currentCA,
        nouveauCA: caScenario.newCA,
        nouveauxAchats: caScenario.currentPurchases * (1 + caScenario.increasePurchases / 100),
        nouveauxSalaires: cfoData.rawWages,
        chargesSociales: cfoData.salaryCharges,
        nouveauxFrais: cfoData.operatingCosts,
        chargesFinancieres: cfoData.financialCharges,
        chargesFixesAnnuelles: 0,
        nouveauxAutres: cfoData.otherCharges,
        totalCharges:
          caScenario.currentPurchases * (1 + caScenario.increasePurchases / 100) +
          cfoData.rawWages +
          cfoData.salaryCharges +
          cfoData.operatingCosts +
          cfoData.financialCharges +
          cfoData.otherCharges,
        nouveauResultat: caResults.newResult,
        deltaResultat: caResults.deltaVsCurrent,
        nouvelleMarge: caResults.newMargin,
        nouveauResultatPct: caResults.newResultPct,
      })
    );
  };

  const exportEmployeeReport = async () => {
    await generateScenarioPDF({
      title: t.scenarioHiring,
      subtitle: t.scenarioHiringDesc,
      generatedAt: new Date().toLocaleDateString(resolveSwissLocale(locale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      sections: [
        {
          title: t.financialImpact,
          rows: [
            { label: t.monthlyImpact, value: formatCHF(employeeResults.monthlyImpact, locale) },
            { label: t.annualImpact, value: formatCHF(employeeResults.annualImpact, locale) },
            { label: t.employeeShare, value: formatCHF(employeeResults.employeeShare, locale) },
          ],
        },
      ],
    });
  };

  const exportInvestmentReport = async () => {
    await generateScenarioPDF(
      buildRentalYieldPDF({
        verdictLabel: investResults.effectiveYield >= 5 ? 'Attractive' : 'Needs review',
        rendementBrut: investResults.roi,
        rendementNet: investResults.effectiveYield,
        rendementNetNet: investResults.effectiveYield,
        revenuNetAvantImpot: investScenario.annualIncome - investScenario.mortgageCharges,
        impotEstime: 0,
        cashFlowMensuel: (investScenario.annualIncome - investScenario.mortgageCharges) / 12,
        prixAchat: investScenario.purchasePrice,
        fraisAcquisition: 0,
        coutTotal: investScenario.purchasePrice,
        roi: investResults.roi,
        rendementEffectif: investResults.effectiveYield,
        ratioEmprunt: investResults.debtEquityRatio,
        ratioEndettement: investResults.leverageRatio,
        dscr: investResults.dscr,
      })
    );
  };

  const exportCompoundReport = async () => {
    await generateScenarioPDF(buildCompoundInterestPDF(compoundResults));
  };

  const exportVATReport = async () => {
    if (totalCA === 0) return;
    await generateScenarioPDF(buildVATPDF(vatResults));
  };

  // ─── Advanced Scenario Calculator State ──────────────────────────────────
  const wfForm = useForm<WorkforceFormValues>({
    resolver: zodResolver(workforceFormSchema),
    defaultValues: {
      scenarioName: '',
      numberOfHires: 1,
      averageSalary: 60000,
      averageAge: 35,
      canton: '',
      maritalStatus: 'single',
      dependents: 0,
      notes: '',
    },
  });
  const [wfIsLoading, setWfIsLoading] = useState(false);
  const [wfResults, setWfResults] = useState<WorkforceFullResults | null>(null);
  const [wfLastFormData, setWfLastFormData] = useState<WorkforceFormValues | null>(null);
  const [advComparisonEnabled, setAdvComparisonEnabled] = useState(false);
  const [advMonthsRecorded, setAdvMonthsRecorded] = useState(6);
  const advComparisonMeta: ComparisonMeta | null = useMemo(
    () => (advComparisonEnabled ? buildComparisonMeta(advMonthsRecorded) : null),
    [advComparisonEnabled, advMonthsRecorded]
  );
  const wfChartData = useMemo(() => {
    if (!wfResults) return [];
    return [
      { name: pageT('scenarioCalculator.annualCost'), value: wfResults.estimatedAnnualCost },
      { name: pageT('scenarioCalculator.employerContributions'), value: wfResults.annualEmployerContributions },
      { name: pageT('scenarioCalculator.familyAllowances'), value: wfResults.annualFamilyAllowances },
    ];
  }, [wfResults, pageT]);

  const [advRvResults, setAdvRvResults] = useState<RevenueGrowthResult | null>(null);
  const [advRvLoading, setAdvRvLoading] = useState(false);
  const [advTvaResults, setAdvTvaResults] = useState<TVAComparisonResult | null>(null);
  const [advTvaLoading, setAdvTvaLoading] = useState(false);
  const [advCiResults, setAdvCiResults] = useState<ReturnType<typeof calculateCompoundInterest> | null>(null);
  const [advCiLoading, setAdvCiLoading] = useState(false);
  const [advRyResults, setAdvRyResults] = useState<RentalYieldResult | null>(null);
  const [advRyLoading, setAdvRyLoading] = useState(false);
  const [advInvestSubTab, setAdvInvestSubTab] = useState<'compound' | 'rental'>('compound');

  const handleWfCalculate = async (data: WorkforceFormValues) => {
    setWfIsLoading(true);
    setWfResults(null);
    try {
      const summary = await calculateWorkforceScenarioSummary({ ...data, notes: data.notes ?? '' });
      const aiResult = await financialScenarioInterpreter({ ...summary, scenarioName: data.scenarioName });
      setWfResults({ ...summary, ...aiResult });
      setWfLastFormData(data);
    } catch (err) {
      console.error('Workforce scenario error:', err);
      toast({ title: cfoT('toast.error'), description: cfoT('toast.scenarioCalcFailed'), variant: 'destructive' });
    } finally {
      setWfIsLoading(false);
    }
  };

  const handleAdvRvCalculate = (data: Parameters<typeof calculateRevenueGrowth>[0]) => {
    setAdvRvLoading(true);
    setAdvRvResults(null);
    try {
      setAdvRvResults(calculateRevenueGrowth(data));
    } catch (err) {
      console.error('Revenue growth error:', err);
    } finally {
      setAdvRvLoading(false);
    }
  };

  const handleAdvTvaCalculate = (data: TVAFormData) => {
    setAdvTvaLoading(true);
    setAdvTvaResults(null);
    try {
      const { calculateFullVATComparison } = require('@/lib/scenario-calculator/calculations');
      setAdvTvaResults(calculateFullVATComparison(data));
    } catch (err) {
      console.error('TVA comparison error:', err);
    } finally {
      setAdvTvaLoading(false);
    }
  };

  const handleAdvCiCalculate = (data: Parameters<typeof calculateCompoundInterest>[0]) => {
    setAdvCiLoading(true);
    try {
      setAdvCiResults(calculateCompoundInterest(data));
    } catch (err) {
      console.error('Compound interest error:', err);
    } finally {
      setAdvCiLoading(false);
    }
  };

  const handleAdvRyCalculate = (data: RentalYieldInput) => {
    setAdvRyLoading(true);
    try {
      setAdvRyResults(calculateRentalYield(data));
    } catch (err) {
      console.error('Rental yield error:', err);
    } finally {
      setAdvRyLoading(false);
    }
  };

  // ─── Contact Lynvia Dialog State ─────────────────────────────────────────
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactScenarioType, setContactScenarioType] = useState('');
  const [contactScenarioTitle, setContactScenarioTitle] = useState('');
  const [contactGetPdfData, setContactGetPdfData] = useState<(() => PDFReportData) | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);

  const openContactDialog = (
    type: string,
    title: string,
    getPdfData: () => PDFReportData,
  ) => {
    setContactScenarioType(type);
    setContactScenarioTitle(title);
    setContactGetPdfData(() => getPdfData);
    setContactMessage('');
    setContactDialogOpen(true);
  };

  const handleSendContactRequest = async () => {
    if (!contactMessage.trim() || !companyId || !user) return;
    setContactSending(true);
    try {
      let pdfUrl: string | undefined;
      if (contactGetPdfData) {
        try {
          const blob = await generateScenarioPDFBlob(contactGetPdfData());
          const storageRef = ref(
            storage,
            `scenario_requests/${user.uid}/${Date.now()}_${contactScenarioType.replace(/\s+/g, '_')}.pdf`,
          );
          await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
          pdfUrl = await getDownloadURL(storageRef);
        } catch (pdfErr) {
          console.error('PDF upload error (non-fatal):', pdfErr);
        }
      }

      const companySnap = await getDoc(doc(firestore, 'companies', companyId));
      const companyName = String(companySnap.data()?.companyName ?? companyId);

      await addDoc(collection(firestore, 'scenario_requests'), {
        clientUid: user.uid,
        companyId,
        companyName,
        scenarioType: contactScenarioType,
        scenarioTitle: contactScenarioTitle,
        message: contactMessage.trim(),
        pdfUrl: pdfUrl ?? null,
        status: 'unread',
        createdAt: serverTimestamp(),
      });

      await notifyAdmin({
        type: 'scenario_review',
        title: cfoT('notify.scenarioInquiryTitle', { type: contactScenarioType }),
        description: cfoT('notify.scenarioInquiryDesc', { companyName, scenarioTitle: contactScenarioTitle }),
        link: '/admin/scenario-requests',
        clientId: user.uid,
        companyId,
        companyName,
      });

      toast({ title: cfoT('toast.messageSent'), description: cfoT('toast.messageSentDesc') });
      setContactDialogOpen(false);
      setContactMessage('');
    } catch (err) {
      console.error('Contact request error:', err);
      toast({ title: cfoT('toast.error'), description: cfoT('toast.sendFailed'), variant: 'destructive' });
    } finally {
      setContactSending(false);
    }
  };

  // ─── Loading State ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="grid grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-4 w-20 mx-auto mb-2" />
                  <Skeleton className="h-10 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          {cfoData.period && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              {cfoData.period}
            </Badge>
          )}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={periodOptions.length === 0}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── No Data Alert ──────────────────────────────────────────────────── */}
      {!hasData && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-10 w-10 text-orange-500" />
              <div>
                <h3 className="font-semibold text-orange-800">{t.noDataTitle}</h3>
                <p className="text-sm text-orange-700">{t.noDataDesc}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Summary Cards ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {cfoData.period || periodOptions.find((option) => option.id === selectedPeriod)?.label || t.title}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Turnover */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.turnover}</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCHF(cfoData.turnover, locale)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Purchases */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.purchases}</p>
                  <p className="text-2xl font-bold">{formatCHF(cfoData.purchases, locale)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          {/* Raw wages */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.rawWages}</p>
                  <p className="text-2xl font-bold">{formatCHF(cfoData.rawWages, locale)}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* Salary charges */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.salaryCharges}</p>
                  <p className="text-2xl font-bold">{formatCHF(cfoData.salaryCharges, locale)}</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Operating costs */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.operatingCosts}</p>
                  <p className="text-2xl font-bold">{formatCHF(cfoData.operatingCosts, locale)}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          {/* Financial charges */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.financialCharges}</p>
                  <p className="text-2xl font-bold">{formatCHF(cfoData.financialCharges, locale)}</p>
                </div>
                <Calculator className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          {/* Other charges */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.otherCharges}</p>
                  <p className="text-2xl font-bold">{formatCHF(cfoData.otherCharges, locale)}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          {/* Profit / Loss */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.profitLoss}</p>
                  <p
                    className={`text-2xl font-bold ${cfoData.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCHF(cfoData.profitLoss, locale)}
                  </p>
                </div>
                <Target
                  className={`h-8 w-8 ${cfoData.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Button className="bg-gray-900 hover:bg-gray-800" onClick={exportAccountsReport} disabled={!hasData}>
          <Download className="mr-2 h-4 w-4" />
          {t.downloadAccounts}
        </Button>
      </div>

      {/* ─── Quick Analysis ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t.quickAnalysis}</CardTitle>
          <CardDescription>{t.quickAnalysisDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t.margin}</p>
              <p className="text-3xl font-bold text-blue-600">{formatPct(ratios.margin, locale)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t.result}</p>
              <p className="text-3xl font-bold text-purple-600">{formatPct(ratios.result, locale)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t.caPurchases}</p>
              <p className="text-3xl font-bold text-orange-600">{formatPct(ratios.caPurchases, locale)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t.caTotalCharges}</p>
              <p className="text-3xl font-bold text-red-600">{formatPct(ratios.caTotalCharges, locale)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {cfoData.aiAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>{cfoT('results.summary')}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">{cfoT('results.summary')}</h3>
              <p className="text-sm text-muted-foreground">{cfoData.aiAnalysis.summary}</p>
            </div>

            {cfoData.aiAnalysis.keyRatios.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{cfoT('results.anomalies')}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {cfoData.aiAnalysis.keyRatios.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {cfoData.aiAnalysis.risks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{cfoT('results.complianceRisks')}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {cfoData.aiAnalysis.risks.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {cfoData.aiAnalysis.opportunities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{cfoT('results.costSavings')}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {cfoData.aiAnalysis.opportunities.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {cfoData.aiAnalysis.recommendations.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{cfoT('results.recommendations')}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {cfoData.aiAnalysis.recommendations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Development Scenarios ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t.devScenarios}</h2>

        {/* Scenario Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Button
            variant={selectedScenario === 'ca' ? 'default' : 'outline'}
            onClick={() => setSelectedScenario('ca')}
            className={`h-20 flex-col ${selectedScenario === 'ca' ? 'bg-gray-900 hover:bg-gray-800' : ''}`}
          >
            <TrendingUp className="h-6 w-6 mb-2" />
            {t.increaseCA}
          </Button>

          <Button
            variant={selectedScenario === 'employee' ? 'default' : 'outline'}
            onClick={() => setSelectedScenario('employee')}
            className={`h-20 flex-col ${selectedScenario === 'employee' ? 'bg-gray-900 hover:bg-gray-800' : ''}`}
          >
            <Users className="h-6 w-6 mb-2" />
            {t.hiringDismissal}
          </Button>

          <Button
            variant={selectedScenario === 'investment' ? 'default' : 'outline'}
            onClick={() => setSelectedScenario('investment')}
            className={`h-20 flex-col ${selectedScenario === 'investment' ? 'bg-gray-900 hover:bg-gray-800' : ''}`}
          >
            <Calculator className="h-6 w-6 mb-2" />
            {t.investment}
          </Button>

          <Button
            variant={selectedScenario === 'vat' ? 'default' : 'outline'}
            onClick={() => setSelectedScenario('vat')}
            className={`h-20 flex-col ${selectedScenario === 'vat' ? 'bg-gray-900 hover:bg-gray-800' : ''}`}
          >
            <Calculator className="h-6 w-6 mb-2" />
            {t.vatMethod}
          </Button>
        </div>

        {/* ─── Increase CA Scenario ───────────────────────────────────────────── */}
        {selectedScenario === 'ca' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.scenarioIncreaseCA}</CardTitle>
              <CardDescription>{t.scenarioIncreaseCADesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>{t.currentAnnualCA}</Label>
                    <Input
                      type="number"
                      value={caScenario.currentCA}
                      onChange={(e) =>
                        setCaScenario({ ...caScenario, currentCA: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div>
                    <Label>{t.newAnnualizedCA}</Label>
                    <Input
                      type="number"
                      value={caScenario.newCA}
                      onChange={(e) =>
                        setCaScenario({ ...caScenario, newCA: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  {caScenario.newCA > 100000 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>{t.vatMandatory}</strong> {t.vatMandatoryDesc}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t.currentPurchases}</Label>
                      <Input
                        type="number"
                        value={caScenario.currentPurchases}
                        onChange={(e) =>
                          setCaScenario({
                            ...caScenario,
                            currentPurchases: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>{t.increasePurchases}</Label>
                      <Input
                        type="number"
                        value={caScenario.increasePurchases}
                        onChange={(e) =>
                          setCaScenario({
                            ...caScenario,
                            increasePurchases: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-4">{t.resultsScenario}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>{t.newResult}</span>
                      <span className="font-semibold text-green-600">
                        {formatCHF(caResults.newResult, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.deltaVsCurrent}</span>
                      <span className={`font-semibold ${caResults.deltaVsCurrent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {caResults.deltaVsCurrent >= 0 ? '+' : ''}
                        {formatCHF(caResults.deltaVsCurrent, locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.newMargin}</span>
                      <span className="font-medium">{formatPct(caResults.newMargin, locale)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.newResultPct}</span>
                      <span className="font-medium">{formatPct(caResults.newResultPct, locale)}</span>
                    </div>
                  </div>
                  <Button className="mt-6 w-full bg-gray-900 hover:bg-gray-800" onClick={exportRevenueReport}>
                    <FileText className="mr-2 h-4 w-4" />
                    {t.generatePDF}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Hiring/Dismissal Scenario ──────────────────────────────────────── */}
        {selectedScenario === 'employee' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.scenarioHiring}</CardTitle>
              <CardDescription>{t.scenarioHiringDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="hire"
                        checked={employeeScenario.type === 'hire'}
                        onChange={() => setEmployeeScenario({ ...employeeScenario, type: 'hire' })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="hire">{t.hire}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="dismiss"
                        checked={employeeScenario.type === 'dismiss'}
                        onChange={() =>
                          setEmployeeScenario({ ...employeeScenario, type: 'dismiss' })
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="dismiss">{t.dismiss}</Label>
                    </div>
                  </div>

                  <div>
                    <Label>{t.grossMonthlySalary}</Label>
                    <Input
                      type="number"
                      value={employeeScenario.grossMonthlySalary}
                      onChange={(e) =>
                        setEmployeeScenario({
                          ...employeeScenario,
                          grossMonthlySalary: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>{t.calculationRule}</strong> {t.calculationRuleDesc}
                    </p>
                  </div>

                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold mb-4">{t.financialImpact}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>{t.monthlyImpact}</span>
                      <span
                        className={`font-semibold ${employeeResults.monthlyImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {employeeResults.monthlyImpact >= 0 ? '+' : ''}
                        {formatCHF(Math.abs(employeeResults.monthlyImpact), locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.annualImpact}</span>
                      <span
                        className={`font-semibold ${employeeResults.annualImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {employeeResults.annualImpact >= 0 ? '+' : ''}
                        {formatCHF(Math.abs(employeeResults.annualImpact), locale)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.employeeShare}</span>
                      <span className="font-medium">{formatCHF(employeeResults.employeeShare, locale)}</span>
                    </div>
                  </div>
                  <Button className="mt-6 w-full bg-gray-900 hover:bg-gray-800" onClick={exportEmployeeReport}>
                    <FileText className="mr-2 h-4 w-4" />
                    {t.generatePDF}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Investment Scenario ────────────────────────────────────────────── */}
        {selectedScenario === 'investment' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.scenarioInvestment}</CardTitle>
              <CardDescription>{t.scenarioInvestmentDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="compound"
                      checked={investScenario.type === 'compound'}
                      onChange={() => setInvestScenario({ ...investScenario, type: 'compound' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="compound">{t.compoundInterest}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="realEstate"
                      checked={investScenario.type === 'realEstate'}
                      onChange={() => setInvestScenario({ ...investScenario, type: 'realEstate' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="realEstate">{t.realEstateInvestment}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="other"
                      checked={investScenario.type === 'other'}
                      onChange={() => setInvestScenario({ ...investScenario, type: 'other' })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="other">{t.otherInvestments}</Label>
                  </div>
                </div>

                {investScenario.type === 'compound' && (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t.compoundInitialCapital}</Label>
                          <Input
                            type="number"
                            value={compoundScenario.capitalInitial}
                            onChange={(e) =>
                              setCompoundScenario((prev) => ({
                                ...prev,
                                capitalInitial: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t.compoundPeriodicContribution}</Label>
                          <Input
                            type="number"
                            value={compoundScenario.versementPeriodique}
                            onChange={(e) =>
                              setCompoundScenario((prev) => ({
                                ...prev,
                                versementPeriodique: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t.compoundContributionFrequency}</Label>
                          <Select
                            value={compoundScenario.frequenceVersement}
                            onValueChange={(value) =>
                              setCompoundScenario((prev) => ({
                                ...prev,
                                frequenceVersement: value as CompoundInterestInput['frequenceVersement'],
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">{t.frequencyMonthly}</SelectItem>
                              <SelectItem value="quarterly">{t.frequencyQuarterly}</SelectItem>
                              <SelectItem value="annual">{t.frequencyAnnual}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{t.compoundCompoundingFrequency}</Label>
                          <Select
                            value={compoundScenario.frequenceCapitalisation}
                            onValueChange={(value) =>
                              setCompoundScenario((prev) => ({
                                ...prev,
                                frequenceCapitalisation: value as CompoundInterestInput['frequenceCapitalisation'],
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">{t.frequencyMonthly}</SelectItem>
                              <SelectItem value="quarterly">{t.frequencyQuarterly}</SelectItem>
                              <SelectItem value="semi-annual">{t.frequencySemiAnnual}</SelectItem>
                              <SelectItem value="annual">{t.frequencyAnnual}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t.compoundAnnualReturn}</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={compoundScenario.tauxRendementAnnuel}
                            onChange={(e) =>
                              setCompoundScenario((prev) => ({
                                ...prev,
                                tauxRendementAnnuel: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t.compoundDurationYears}</Label>
                          <Input
                            type="number"
                            min="1"
                            value={compoundScenario.dureeAnnees}
                            onChange={(e) =>
                              setCompoundScenario((prev) => ({
                                ...prev,
                                dureeAnnees: parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={exportCompoundReport}>
                        <FileText className="mr-2 h-4 w-4" />
                        {t.generatePDF}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>{t.compoundResultsTitle}</CardTitle>
                          <CardDescription>
                            {t.compoundProjectionDuration.replace('{years}', String(compoundResults.yearlyBreakdown.length))}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg border bg-green-50 p-4">
                            <p className="text-xs text-muted-foreground">{t.compoundFinalCapital}</p>
                            <p className="text-xl font-semibold text-green-700">{formatCHF(compoundResults.capitalFinal, locale)}</p>
                          </div>
                          <div className="rounded-lg border bg-blue-50 p-4">
                            <p className="text-xs text-muted-foreground">{t.compoundGain}</p>
                            <p className="text-xl font-semibold text-blue-700">{formatCHF(compoundResults.plusValue, locale)}</p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-xs text-muted-foreground">{t.compoundTotalContributed}</p>
                            <p className="text-lg font-semibold">{formatCHF(compoundResults.totalVerse, locale)}</p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="text-xs text-muted-foreground">{t.compoundTotalReturnAnnualized}</p>
                            <p className="text-lg font-semibold">
                              {formatPct(compoundResults.rendementTotal, locale)} / {formatPct(compoundResults.rendementAnnualise, locale)} p.a.
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>{t.compoundYearlyBreakdown}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="max-h-72 overflow-auto rounded-lg border">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-muted">
                                <tr>
                                  <th className="p-2 text-left">{t.compoundYear}</th>
                                  <th className="p-2 text-right">{t.compoundStartingCapital}</th>
                                  <th className="p-2 text-right">{t.compoundContributions}</th>
                                  <th className="p-2 text-right">{t.compoundInterestEarned}</th>
                                  <th className="p-2 text-right">{t.compoundEndingCapital}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {compoundResults.yearlyBreakdown.map((row) => (
                                  <tr key={row.year} className="border-t">
                                    <td className="p-2">{row.year}</td>
                                    <td className="p-2 text-right">{formatCHF(row.capitalDebut, locale)}</td>
                                    <td className="p-2 text-right">{formatCHF(row.versements, locale)}</td>
                                    <td className="p-2 text-right text-green-600">{formatCHF(row.interets, locale)}</td>
                                    <td className="p-2 text-right font-medium">{formatCHF(row.capitalFin, locale)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {investScenario.type === 'realEstate' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t.purchasePrice}</Label>
                          <Input
                            type="number"
                            value={investScenario.purchasePrice}
                            onChange={(e) =>
                              setInvestScenario({
                                ...investScenario,
                                purchasePrice: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>{t.ownFunds}</Label>
                          <Input
                            type="number"
                            value={investScenario.ownFunds}
                            onChange={(e) =>
                              setInvestScenario({
                                ...investScenario,
                                ownFunds: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>{t.annualIncome}</Label>
                          <Input
                            type="number"
                            value={investScenario.annualIncome}
                            onChange={(e) =>
                              setInvestScenario({
                                ...investScenario,
                                annualIncome: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>{t.mortgageCharges}</Label>
                          <Input
                            type="number"
                            value={investScenario.mortgageCharges}
                            onChange={(e) =>
                              setInvestScenario({
                                ...investScenario,
                                mortgageCharges: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>

                      <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={exportInvestmentReport}>
                        <FileText className="mr-2 h-4 w-4" />
                        {t.generatePDF}
                      </Button>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h4 className="font-semibold mb-4">{t.investmentRatios}</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>{t.roi}</span>
                          <span className="font-medium">{formatPct(investResults.roi, locale)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.effectiveYield}</span>
                          <span className="font-medium">
                            {formatPct(investResults.effectiveYield, locale)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.debtEquityRatio}</span>
                          <span className="font-medium">
                            {investResults.debtEquityRatio.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.leverageRatio}</span>
                          <span className="font-medium">
                            {formatPct(investResults.leverageRatio, locale)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.dscr}</span>
                          <span className="font-medium">{investResults.dscr.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── VAT Scenario ───────────────────────────────────────────────────── */}
        {selectedScenario === 'vat' && (
          <Card>
            <CardHeader>
              <CardTitle>{t.scenarioVAT}</CardTitle>
              <CardDescription>{t.scenarioVATDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* VAT Comparator Title */}
                  <h3 className="text-lg font-semibold">{t.vatComparator}</h3>

                  {/* Section 1: Sector allocation */}
                  <div>
                    <h4 className="font-medium mb-3">{t.sectorAllocation}</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>{t.sectorInstructions}</strong> {t.sectorInstructionsDesc}
                      </p>
                    </div>

                    {/* Add sector form */}
                    <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                      <Label className="text-sm font-medium mb-2 block">{t.addSector}</Label>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t.sector}</Label>
                          <Select
                            value={newSector.nom}
                            onValueChange={(val) => setNewSector({ ...newSector, nom: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t.selectPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {sectorOptions.map((sector) => (
                                  <SelectItem key={sector.id} value={sector.id}>
                                    {sector.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">{t.netCA}</Label>
                          <Input
                            type="number"
                            value={newSector.montantCA || ''}
                            onChange={(e) =>
                              setNewSector({
                                ...newSector,
                                montantCA: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">
                            {t.vatRate} {t.effectiveVatRate}
                          </Label>
                          <Select
                            value={newSector.tauxTVA.toString()}
                            onValueChange={(val) =>
                              setNewSector({ ...newSector, tauxTVA: parseFloat(val) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="2.6">2.6%</SelectItem>
                              <SelectItem value="3.8">3.8%</SelectItem>
                              <SelectItem value="8.1">8.1%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Button onClick={addSector} className="w-full bg-gray-700 hover:bg-gray-600">
                            <Plus className="h-4 w-4 mr-1" />
                            {t.add}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Added sectors */}
                    {vatForm.sectors.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {vatForm.sectors.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white border rounded p-2"
                          >
                            <span className="text-sm">
                              {getSectorLabel(s.nom)} — {formatCHF(s.montantCA, locale)} @ {s.tauxTVA}%
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSector(idx)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Standard CA */}
                  <div>
                    <h4 className="font-medium mb-2">{t.standardCA}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{t.standardCADesc}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">{t.caNet0}</Label>
                        <Input
                          type="number"
                          value={vatForm.CA_0 || ''}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, CA_0: parseInt(e.target.value) || 0 })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t.caNet26}</Label>
                        <Input
                          type="number"
                          value={vatForm.CA_26 || ''}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, CA_26: parseInt(e.target.value) || 0 })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t.caNet38}</Label>
                        <Input
                          type="number"
                          value={vatForm.CA_38 || ''}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, CA_38: parseInt(e.target.value) || 0 })
                          }
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t.caNet81}</Label>
                        <Input
                          type="number"
                          value={vatForm.CA_81 || ''}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, CA_81: parseInt(e.target.value) || 0 })
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Purchases and expenses */}
                  <div>
                    <h4 className="font-medium mb-3">{t.purchasesExpenses}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">{t.purchases26}</Label>
                        <Input
                          type="number"
                          value={vatForm.purchases_26}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, purchases_26: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t.purchases81}</Label>
                        <Input
                          type="number"
                          value={vatForm.purchases_81}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, purchases_81: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t.expenses26}</Label>
                        <Input
                          type="number"
                          value={vatForm.expenses_26}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, expenses_26: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t.expenses81}</Label>
                        <Input
                          type="number"
                          value={vatForm.expenses_81}
                          onChange={(e) =>
                            setVatForm({ ...vatForm, expenses_81: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gray-500 hover:bg-gray-600"
                    disabled={totalCA === 0}
                    onClick={exportVATReport}
                  >
                    {totalCA === 0 ? t.enterCAToCalculate : t.generatePDF}
                  </Button>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t.resultsScenario}</CardTitle>
                      <CardDescription>{t.vatComparator}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>{t.vatMethodEffectiveLabel}</span>
                        <span className="font-semibold">{formatCHF(vatResults.tvaEffective, locale)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t.vatMethodTdfnLabel}</span>
                        <span className="font-semibold">{formatCHF(vatResults.tvaTDFN, locale)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t.vatMethod}</span>
                        <span className="font-semibold">
                          {vatResults.methodeRecommandee === 'TDFN' ? t.vatRecommendedTdfn : t.vatRecommendedEffective}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{cfoT('results.costSavings')}</span>
                        <span className="font-semibold text-green-600">{formatCHF(vatResults.economie, locale)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Button className="w-full bg-gray-900 hover:bg-gray-800 h-12" onClick={exportVATReport} disabled={totalCA === 0}>
                    <FileText className="mr-2 h-4 w-4" />
                    {t.vatPDFReport}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
