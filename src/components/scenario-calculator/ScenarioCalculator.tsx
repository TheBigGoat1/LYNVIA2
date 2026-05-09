"use client";

import { loadStripe } from '@stripe/stripe-js';
import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase/firebase-provider";
import { addDoc, collection, doc, getDoc, setDoc, getDocs, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IS_GLOBAL_TEST_MODE } from "@/lib/test-mode";
import { createSimulatedPaidOrder } from "@/lib/checkout-test-mode";
import {
  financialScenarioInterpreter,
} from "@/ai/flows/financial-scenario-interpreter";
import {
  TrendingUp, Baby, Heart, PiggyBank, Wallet, Briefcase, Landmark, DollarSign, Scale, CalendarDays,
} from "lucide-react";

import type { ScenarioResult, ScenarioType, BenefitItem, LocationSearchResult } from "@/lib/scenario-calculator/types";
import {
  calculateTax,
  calculateSocialDeductions,
  calculateFamilyAllowances,
  calculateBirthAllowance,
  calculateMaternityAllowance,
  calculateHealthInsuranceSubsidy,
  calculateComplementaryBenefits,
  calculateSupplementaryBenefitsEntitlement,
  calculateUnemploymentBenefits,
  formatCHF,
  SCENARIO_CONFIGS,
  calculateVATComparison,
} from "@/lib/scenario-calculator/calculations";

import type {
  IncomeChangeFormValues,
  JobLossFormValues,
  ChildBirthFormValues,
  MarriageFormValues,
  Pillar3aFormValues,
  Pillar2BuybackFormValues,
  SupplementaryBenefitsFormValues,
  VatComparisonFormValues,
} from "@/lib/scenario-calculator/schemas";

import {
  IncomeChangeForm,
  JobLossForm,
  ChildBirthForm,
  MarriageForm,
  Pillar3aForm,
  Pillar2BuybackForm,
  SupplementaryBenefitsForm,
  VATComparisonForm,
} from "./ScenarioForms";

import {
  ScenarioResults,
  ResultsSkeleton,
  EmptyResultsCard,
} from "./ScenarioResults";
import { INDIVIDUAL_ACCESS_PRICING } from "@/lib/individual-access-pricing";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buildComparisonMeta, buildIndividualScenarioPDF, generateScenarioPDF, type ComparisonMeta } from "@/lib/scenario-calculator/pdf-export";
import { notifyAdmin } from "@/lib/admin-notifications";
import { useRouter, useSearchParams } from 'next/navigation';
import type { TVAFormData } from "@/components/vat/tva-comparison-form";

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Baby, Heart, PiggyBank, Wallet, Briefcase, Landmark, DollarSign,
};

const FAMILY_FUND_INCOME_THRESHOLD = 100000;
const UNLIMITED_SCENARIO_IDS = new Set<ScenarioType>(
  INDIVIDUAL_ACCESS_PRICING.free.unlimitedScenarioIds as readonly ScenarioType[]
);

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

// ============================================================================
// MAIN SCENARIO CALCULATOR COMPONENT
// ============================================================================

interface ScenarioCalculatorProps {
  hideVatTab?: boolean;
  baselineSeed?: Partial<IncomeChangeFormValues> | null;
}

export default function ScenarioCalculator({ hideVatTab = false, baselineSeed = null }: ScenarioCalculatorProps) {
  const t = useTranslations("ScenarioCalculator");
  const [activeTab, setActiveTab] = useState<ScenarioType | null>(null);
  const [results, setResults] = useState<ScenarioResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState({ used: 0, purchased: 0, loading: false });
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [masterProfile, setMasterProfile] = useState<Partial<IncomeChangeFormValues> | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pdfExportCount, setPdfExportCount] = useState(0);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [monthsRecorded, setMonthsRecorded] = useState(6);
  const comparisonMeta = useMemo<ComparisonMeta | undefined>(
    () => comparisonEnabled ? buildComparisonMeta(monthsRecorded) : undefined,
    [comparisonEnabled, monthsRecorded]
  );
  const { toast } = useToast();
  const { user } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthlyNonPillarLimit = INDIVIDUAL_ACCESS_PRICING.free.nonPillarScenariosPerMonth;
  const totalMonthlyAllowance = monthlyNonPillarLimit + monthlyUsage.purchased;

  // Filter out VAT tab when hideVatTab is true
  const visibleScenarios = useMemo(() => 
    hideVatTab ? SCENARIO_CONFIGS.filter(s => s.id !== 'vat_comparison') : SCENARIO_CONFIGS,
    [hideVatTab]
  );

  const netAfterSocial = (netIncomeBeforeSocial: number, socialDeductions: number) =>
    Math.max(0, netIncomeBeforeSocial - socialDeductions);

  const healthSubsidyFor = (
    canton: string | undefined,
    maritalStatus: "single" | "married",
    grossIncome: number,
    dependents: number
  ) => {
    return calculateHealthInsuranceSubsidy(canton ?? "", maritalStatus, grossIncome, dependents);
  };

  const withCantonalFamilyFundRecommendation = (
    analysis: { summary: string; recommendations: string[]; impacts: string[] },
    grossIncome: number,
    hasFamily: boolean
  ) => {
    if (hasFamily && grossIncome < FAMILY_FUND_INCOME_THRESHOLD) {
      return {
        ...analysis,
        recommendations: [
          ...analysis.recommendations,
          t("recommendations.cantonalFamilyFund"),
        ],
      };
    }
    return analysis;
  };

  const refreshMonthlyUsage = useCallback(async () => {
    if (!user) return { used: 0, purchased: 0 };
    setMonthlyUsage((prev) => ({ ...prev, loading: true }));
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [scenarioSnap, paidOrdersSnap] = await Promise.all([
        getDocs(
          query(
            collection(firestore, "users", user.uid, "scenarios"),
            where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
          )
        ),
        getDocs(
          query(
            collection(firestore, "users", user.uid, "orders"),
            where("status", "==", "paid")
          )
        ),
      ]);

      const used = scenarioSnap.docs.reduce((count, doc) => {
        const data = doc.data();
        const scenarioId = data.metadata?.scenarioId;
        const scenarioType = (data.metadata?.scenarioType || "").toLowerCase();
        const isUnlimited =
          (scenarioId && UNLIMITED_SCENARIO_IDS.has(scenarioId)) ||
          scenarioType.includes("pillar 3a") ||
          scenarioType.includes("3rd pillar");
        return isUnlimited ? count : count + 1;
      }, 0);

      const purchased = paidOrdersSnap.docs.reduce((count, doc) => {
        const data = doc.data();
        const isScenarioAddOn = data.serviceId === "individual_scenario_addon";

        const toDate = (value: unknown): Date | null => {
          if (!value) return null;
          if (value instanceof Date) return value;
          if (typeof (value as { toDate?: () => Date }).toDate === "function") {
            return (value as { toDate: () => Date }).toDate();
          }
          const seconds = (value as { seconds?: unknown }).seconds;
          if (typeof seconds === "number") {
            return new Date(seconds * 1000);
          }
          return null;
        };

        const paidDate =
          toDate(data.paidAt) ||
          toDate(data.updatedAt) ||
          toDate(data.createdAt);
        const isCurrentMonth = paidDate ? paidDate >= startOfMonth : false;

        return isScenarioAddOn && isCurrentMonth ? count + 1 : count;
      }, 0);

      setMonthlyUsage({ used, purchased, loading: false });
      return { used, purchased };
    } catch {
      setMonthlyUsage((prev) => ({ ...prev, loading: false }));
      return { used: 0, purchased: 0 };
    }
  }, [user]);

  // =========================================================================
  // VAT COMPARISON HANDLER
  // =========================================================================

  const handleVATComparison = useCallback(
    async (data: VatComparisonFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        const tvaInput: TVAFormData = {
          CA_0: 0,
          CA_26: 0,
          CA_38: 0,
          CA_81: 0,
          achats_26: 0,
          achats_81: data.achats,
          depenses_26: 0,
          depenses_81: data.depenses,
          secteurs: [{ nom: data.secteur, montantCA: data.ca, tauxTVA: 8.1 }],
        };
        const vatResult = calculateVATComparison(tvaInput);
        const vatMethodLabel = vatResult.methodeRecommandee === "Effective"
          ? t("vatComparisonAnalysis.methodEffective")
          : t("vatComparisonAnalysis.methodTdfn");
        setResults({
          currentSituation: {
            grossIncome: data.ca,
            totalTax: vatResult.tvaEffective,
            netIncome: data.ca - vatResult.tvaEffective,
            effectiveTaxRate: (vatResult.tvaEffective / data.ca) * 100,
          },
          futureSituation: {
            grossIncome: data.ca,
            totalTax: vatResult.tvaTDFN,
            netIncome: data.ca - vatResult.tvaTDFN,
            effectiveTaxRate: (vatResult.tvaTDFN / data.ca) * 100,
          },
          comparison: {
            taxDifference: vatResult.tvaTDFN - vatResult.tvaEffective,
            taxDifferencePct: ((vatResult.tvaTDFN - vatResult.tvaEffective) / (vatResult.tvaEffective || 1)) * 100,
            netIncomeChange: (data.ca - vatResult.tvaTDFN) - (data.ca - vatResult.tvaEffective),
            netIncomeChangePct: (((data.ca - vatResult.tvaTDFN) - (data.ca - vatResult.tvaEffective)) / (data.ca - vatResult.tvaEffective || 1)) * 100,
          },
          analysis: {
            summary: t("vatComparisonAnalysis.summary", { method: vatMethodLabel }),
            recommendations: [
              t("vatComparisonAnalysis.effectiveVat", { amount: formatCHF(vatResult.tvaEffective) }),
              t("vatComparisonAnalysis.tdfnVat", { amount: formatCHF(vatResult.tvaTDFN) }),
              t("vatComparisonAnalysis.bestMethod", { method: vatMethodLabel }),
            ],
            impacts: [],
          },
          metadata: {
            scenarioType: "VAT Comparison",
            scenarioId: "vat_comparison",
            location: data.secteur,
            calculatedAt: new Date().toISOString(),
          },
        });
        toast({ title: t("toast.vatComparison.complete.title"), description: t("toast.vatComparison.complete.description", { method: vatResult.methodeRecommandee }) });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // Load master profile + PDF export count from Firestore on mount
  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      try {
        const [profileSnap, userSnap] = await Promise.all([
          getDoc(doc(firestore, 'users', user.uid, 'masterProfile', 'baseline')),
          getDoc(doc(firestore, 'users', user.uid)),
        ]);
        if (profileSnap.exists()) {
          setMasterProfile(profileSnap.data() as Partial<IncomeChangeFormValues>);
        }
        if (userSnap.exists()) {
          setPdfExportCount(userSnap.data().scenarioPdfExportCount ?? 0);
        }
      } catch {
        // silently ignore
      }
    };
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (baselineSeed && Object.keys(baselineSeed).length > 0) {
      setMasterProfile((prev) => ({ ...(prev ?? {}), ...baselineSeed }));
    }
  }, [baselineSeed]);

  const handleSaveMasterProfile = useCallback(async (data: IncomeChangeFormValues) => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      await setDoc(doc(firestore, 'users', user.uid, 'masterProfile', 'baseline'), {
        ...data,
        savedAt: serverTimestamp(),
      });
      setMasterProfile(data);
      toast({ title: t('masterProfile.saved.title'), description: t('masterProfile.saved.description') });
    } catch {
      toast({ title: t('masterProfile.saveError.title'), description: t('masterProfile.saveError.description'), variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  }, [user, toast, t]);

  const handleExportPDF = useCallback(async () => {
    if (!results) return;
    if (!IS_GLOBAL_TEST_MODE && pdfExportCount >= 2) {
      toast({
        title: t('paywall.exportLimitReached.title'),
        description: t('paywall.exportLimitReached.description'),
        variant: 'destructive',
      });
      return;
    }
    const pdfData = buildIndividualScenarioPDF(results, comparisonMeta);
    generateScenarioPDF(pdfData);
    if (!IS_GLOBAL_TEST_MODE) {
      const newCount = pdfExportCount + 1;
      setPdfExportCount(newCount);
      if (user) {
        try {
          await setDoc(
            doc(firestore, 'users', user.uid),
            { scenarioPdfExportCount: newCount },
            { merge: true }
          );
        } catch { /* non-critical */ }
      }
    }
  }, [results, pdfExportCount, comparisonMeta, user, toast, t]);

  const handleRequestExpertReview = useCallback(async () => {
    if (!user || !results) return;
    setIsRequestingReview(true);
    try {
      await addDoc(collection(firestore, 'document_exchanges'), {
        type: 'scenario_review',
        requesterId: user.uid,
        requesterName: user.displayName || user.email || '',
        scenarioType: results.metadata.scenarioType,
        scenarioData: JSON.stringify(results),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      await notifyAdmin({
        type: 'scenario_review',
        title: t('expertReview.adminNotif.title'),
        description: t('expertReview.adminNotif.description', { name: user.displayName || user.email || '' }),
        clientId: user.uid,
        clientName: user.displayName || user.email || '',
        link: '/admin/document-exchanges',
      });
      toast({ title: t('expertReview.submitted.title'), description: t('expertReview.submitted.description') });
    } catch {
      toast({ title: t('expertReview.error.title'), description: t('expertReview.error.description'), variant: 'destructive' });
    } finally {
      setIsRequestingReview(false);
    }
  }, [user, results, toast, t]);

  useEffect(() => {
    refreshMonthlyUsage();
  }, [refreshMonthlyUsage]);

  // Note: Payment success is now handled by /individual/scenario-calculator/success page
  // This useEffect kept for backward compatibility (in case someone visits old URL directly)
  useEffect(() => {
    const sessionOk = searchParams.get('scenario_ok');
    if (sessionOk === '1') {
      toast({ title: t('access.paymentSuccess.title'), description: t('access.paymentSuccess.description') });
      router.replace('/individual/scenario-calculator', { scroll: false });
    }
  }, [searchParams, toast, t, router, refreshMonthlyUsage]);

  const ensureScenarioLimit = useCallback(
    async (scenarioId: ScenarioType) => {
      if (IS_GLOBAL_TEST_MODE) {
        return true;
      }
      if (UNLIMITED_SCENARIO_IDS.has(scenarioId)) {
        return true;
      }

      const { used, purchased } = await refreshMonthlyUsage();
      const allowed = monthlyNonPillarLimit + purchased;

      if (used >= allowed) {
        const priceCents = INDIVIDUAL_ACCESS_PRICING.addOns.extraScenarioPriceChf * 100;
        
        if (!user) return false;

        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/individual/scenario-checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ amountCents: priceCents }),
          });
          const payload = await res.json();
          
          if (!res.ok) {
            throw new Error(payload?.error || 'Could not start payment.');
          }
          
          if (payload.testMode) {
            await createSimulatedPaidOrder({
              userId: user.uid,
              userEmail: user.email,
              userName: user.displayName,
              serviceId: 'individual_scenario_addon',
              serviceTitle: 'Additional Scenario',
              priceAmount: priceCents,
              orderType: 'scenario',
            });
            await refreshMonthlyUsage();
            return true;
          }

          if (!stripePublishableKey || !stripePromise) {
            throw new Error('Stripe is not configured.');
          }
          
          const stripe = await stripePromise;
          const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
          if (error) {
            throw new Error(error.message);
          }
          return false;
        } catch (error) {
          console.error('Payment error:', error);
          toast({
            title: t("access.paymentError.title"),
            description: error instanceof Error ? error.message : t("access.paymentError.description"),
            variant: "destructive",
          });
          return false;
        }
      }

      return true;
    },
    [monthlyNonPillarLimit, refreshMonthlyUsage, t, toast, user]
  );

  // Save results to Firestore
  const saveResults = useCallback(
    async (scenarioResult: ScenarioResult) => {
      if (!user) return;
      try {
        await addDoc(collection(firestore, "users", user.uid, "scenarios"), {
          ...scenarioResult,
          createdAt: serverTimestamp(),
        });
      } catch {
        // Silently fail - saving is not critical
      }
    },
    [user]
  );

  // Get AI analysis for results
  const getAIAnalysis = async (
    scenarioType: string,
    inputs: Record<string, unknown>,
    taxResult: { totalTax: number; federalTax: number; cantonalTax: number; netIncome: number; effectiveTaxRate: number; socialDeductions: { ahv: number; alv: number; bvg: number; nbuv: number; total: number } }
  ) => {
    try {
      const aiResult = await financialScenarioInterpreter({
        scenarioType,
        scenarioInputs: {
          grossSalary: (inputs.grossSalary as number) ?? undefined,
          maritalStatus: (inputs.maritalStatus as "single" | "married") ?? undefined,
          dependents: (inputs.dependents as number) ?? undefined,
        },
        scenarioResults: {
          netSalary: taxResult.netIncome,
          federalTax: taxResult.federalTax,
          cantonalTax: taxResult.cantonalTax,
          ahv: taxResult.socialDeductions.ahv,
          alv: taxResult.socialDeductions.alv,
          bvg: taxResult.socialDeductions.bvg,
          nbuv: taxResult.socialDeductions.nbuv,
          totalDeductions: taxResult.socialDeductions.total,
          effectiveTaxRate: taxResult.effectiveTaxRate,
        },
      });
      return {
        summary: aiResult.interpretation,
        recommendations: aiResult.recommendations.split("\n").filter(Boolean),
        impacts: aiResult.potentialImpacts.split("\n").filter(Boolean),
      };
    } catch {
      return {
        summary: t("fallback.aiAnalysisUnavailable"),
        recommendations: [],
        impacts: [],
      };
    }
  };

  // =========================================================================
  // INCOME CHANGE HANDLER
  // =========================================================================

  const handleIncomeChange = useCallback(
    async (data: IncomeChangeFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        if (!(await ensureScenarioLimit("income_change"))) {
          return;
        }

        const [currentTax, futureTax] = await Promise.all([
          calculateTax({
            grossSalary: data.currentGrossSalary,
            locationId: data.locationId,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents,
            age: data.age,
            confession: data.confession,
            fortune: data.fortune,
          }),
          calculateTax({
            grossSalary: data.newGrossSalary,
            locationId: data.locationId,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents,
            age: data.age,
            confession: data.confession,
            fortune: data.fortune,
          }),
        ]);

        const currentSocial = calculateSocialDeductions(data.currentGrossSalary, data.age);
        const futureSocial = calculateSocialDeductions(data.newGrossSalary, data.age);
        const currentHealthSubsidy = healthSubsidyFor(
          currentTax.canton,
          data.maritalStatus,
          data.currentGrossSalary,
          data.dependents
        );
        const futureHealthSubsidy = healthSubsidyFor(
          futureTax.canton,
          data.maritalStatus,
          data.newGrossSalary,
          data.dependents
        );
        const currentNetIncome =
          netAfterSocial(currentTax.netIncome, currentSocial.total) + currentHealthSubsidy.annualSubsidy;
        const futureNetIncome =
          netAfterSocial(futureTax.netIncome, futureSocial.total) + futureHealthSubsidy.annualSubsidy;

        const analysis = await getAIAnalysis(
          "Salary Comparison",
          { grossSalary: data.newGrossSalary, maritalStatus: data.maritalStatus, dependents: data.dependents },
          futureTax
        );
        const analysisWithFamilyFundRecommendation = withCantonalFamilyFundRecommendation(
          analysis,
          Math.max(data.currentGrossSalary, data.newGrossSalary),
          data.maritalStatus === "married" || data.dependents > 0
        );

        const result: ScenarioResult = {
          currentSituation: {
            grossIncome: data.currentGrossSalary,
            totalTax: currentTax.totalTax,
            netIncome: currentNetIncome,
            effectiveTaxRate: currentTax.effectiveTaxRate,
            additionalBenefits: currentHealthSubsidy.annualSubsidy,
          },
          futureSituation: {
            grossIncome: data.newGrossSalary,
            totalTax: futureTax.totalTax,
            netIncome: futureNetIncome,
            effectiveTaxRate: futureTax.effectiveTaxRate,
            additionalBenefits: futureHealthSubsidy.annualSubsidy,
            benefitsBreakdown: futureHealthSubsidy.breakdown,
          },
          comparison: {
            taxDifference: futureTax.totalTax - currentTax.totalTax,
            taxDifferencePct: currentTax.totalTax > 0
              ? ((futureTax.totalTax - currentTax.totalTax) / currentTax.totalTax) * 100
              : 0,
            netIncomeChange: futureNetIncome - currentNetIncome,
            netIncomeChangePct: currentNetIncome > 0
              ? ((futureNetIncome - currentNetIncome) / currentNetIncome) * 100
              : 0,
          },
          analysis: analysisWithFamilyFundRecommendation,
          metadata: {
            scenarioType: "Salary Change",
            scenarioId: "income_change",
            location: futureTax.locationName ?? 'N/A',
            calculatedAt: new Date().toISOString(),
          },
        };

        setResults(result);
        saveResults(result);
        refreshMonthlyUsage();
        toast({ title: t("toast.incomeChange.complete.title"), description: t("toast.incomeChange.complete.description", { amount: formatCHF(result.comparison.netIncomeChange) }) });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, saveResults, ensureScenarioLimit, refreshMonthlyUsage]
  );

  // =========================================================================
  // JOB LOSS HANDLER
  // =========================================================================

  const handleJobLoss = useCallback(
    async (data: JobLossFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        if (!(await ensureScenarioLimit("job_loss"))) {
          return;
        }

        const currentTax = await calculateTax({
          grossSalary: data.currentGrossSalary,
          locationId: data.locationId,
          maritalStatus: data.maritalStatus,
          dependents: data.dependents,
          age: data.age,
          confession: data.confession,
        });

        const unemployment = calculateUnemploymentBenefits(
          data.currentGrossSalary, data.hasChildren, data.yearsEmployed, data.age
        );

        const annualUnemploymentIncome = unemployment.monthlyBenefit * Math.min(data.unemploymentDuration, 12);
        const futureTax = await calculateTax({
          grossSalary: annualUnemploymentIncome,
          locationId: data.locationId,
          maritalStatus: data.maritalStatus,
          dependents: data.dependents,
          age: data.age,
          confession: data.confession,
        });

        const currentSocial = calculateSocialDeductions(data.currentGrossSalary, data.age);
        const currentHealthSubsidy = healthSubsidyFor(
          currentTax.canton,
          data.maritalStatus,
          data.currentGrossSalary,
          data.dependents
        );
        const futureHealthSubsidy = healthSubsidyFor(
          futureTax.canton,
          data.maritalStatus,
          annualUnemploymentIncome,
          data.dependents
        );
        const currentNetIncome =
          netAfterSocial(currentTax.netIncome, currentSocial.total) + currentHealthSubsidy.annualSubsidy;
        const futureNetIncome = futureTax.netIncome + futureHealthSubsidy.annualSubsidy;

        const benefits: BenefitItem[] = [
          { label: t("benefits.unemploymentBenefit", { rate: unemployment.benefitRate * 100 }), amount: annualUnemploymentIncome, type: "benefit" },
        ];
        if (futureHealthSubsidy.eligible) {
          benefits.push(...futureHealthSubsidy.breakdown);
        }

        const analysis = await getAIAnalysis(
          "Job Loss Analysis",
          { grossSalary: data.currentGrossSalary, maritalStatus: data.maritalStatus, dependents: data.dependents },
          futureTax
        );
        const analysisWithFamilyFundRecommendation = withCantonalFamilyFundRecommendation(
          analysis,
          data.currentGrossSalary,
          data.maritalStatus === "married" || data.dependents > 0 || data.hasChildren
        );

        const result: ScenarioResult = {
          currentSituation: {
            grossIncome: data.currentGrossSalary,
            totalTax: currentTax.totalTax,
            netIncome: currentNetIncome,
            effectiveTaxRate: currentTax.effectiveTaxRate,
            additionalBenefits: currentHealthSubsidy.annualSubsidy,
          },
          futureSituation: {
            grossIncome: annualUnemploymentIncome,
            totalTax: futureTax.totalTax,
            netIncome: futureNetIncome,
            effectiveTaxRate: futureTax.effectiveTaxRate,
            additionalBenefits: annualUnemploymentIncome + futureHealthSubsidy.annualSubsidy,
            benefitsBreakdown: benefits,
          },
          comparison: {
            taxDifference: futureTax.totalTax - currentTax.totalTax,
            taxDifferencePct: currentTax.totalTax > 0
              ? ((futureTax.totalTax - currentTax.totalTax) / currentTax.totalTax) * 100
              : 0,
            netIncomeChange: futureNetIncome - currentNetIncome,
            netIncomeChangePct: currentNetIncome > 0
              ? ((futureNetIncome - currentNetIncome) / currentNetIncome) * 100
              : 0,
          },
          analysis: analysisWithFamilyFundRecommendation,
          metadata: {
            scenarioType: "Job Loss",
            scenarioId: "job_loss",
            location: futureTax.locationName ?? 'N/A',
            calculatedAt: new Date().toISOString(),
          },
        };

        setResults(result);
        saveResults(result);
        refreshMonthlyUsage();
        toast({
          title: t("toast.jobLoss.complete.title"),
          description: t("toast.jobLoss.complete.description", { monthlyBenefit: formatCHF(unemployment.monthlyBenefit), maxDuration: unemployment.maxDuration }),
        });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, saveResults, ensureScenarioLimit, refreshMonthlyUsage]
  );

  // =========================================================================
  // CHILD BIRTH HANDLER
  // =========================================================================

  const handleChildBirth = useCallback(
    async (data: ChildBirthFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        if (!(await ensureScenarioLimit("child_birth"))) {
          return;
        }

        const totalHouseholdIncome = data.currentGrossSalary + data.spouseSalary;

        const currentTax = await calculateTax({
          grossSalary: totalHouseholdIncome,
          locationId: data.locationId,
          maritalStatus: data.maritalStatus,
          dependents: data.dependents,
          age: data.age,
          confession: data.confession,
        });

        const futureTax = await calculateTax({
          grossSalary: totalHouseholdIncome,
          locationId: data.locationId,
          maritalStatus: data.maritalStatus,
          dependents: data.dependents + 1,
          age: data.age,
          confession: data.confession,
        });

        const currentSocial = calculateSocialDeductions(totalHouseholdIncome, data.age);
        const currentHealthSubsidy = healthSubsidyFor(
          currentTax.canton,
          data.maritalStatus,
          totalHouseholdIncome,
          data.dependents
        );

        // Calculate all benefits
        const familyAllowance = calculateFamilyAllowances(futureTax.canton ?? '', 1);
        const birthAllowance = calculateBirthAllowance(futureTax.canton ?? '');
        const dailySalary = data.currentGrossSalary / 365;
        const maternity = calculateMaternityAllowance(dailySalary);
        const healthSubsidy = calculateHealthInsuranceSubsidy(
          futureTax.canton ?? '', data.maritalStatus, totalHouseholdIncome, data.dependents + 1
        );
        const complementaryBenefits = calculateComplementaryBenefits(
          futureTax.canton ?? '', data.maritalStatus, totalHouseholdIncome, data.dependents + 1
        );

        const benefits: BenefitItem[] = [
          { label: t("benefits.familyAllowanceAnnual"), amount: familyAllowance, type: "allowance" },
        ];

        if (birthAllowance > 0) {
          benefits.push({ label: t("benefits.birthAllowanceOneTime"), amount: birthAllowance, type: "allowance" });
        }

        benefits.push({
          label: t("benefits.maternityAllowance", { days: maternity.duration }),
          amount: maternity.totalAllowance,
          type: "benefit",
        });

        if (healthSubsidy.eligible) {
          benefits.push(...healthSubsidy.breakdown);
        }

        if (complementaryBenefits.eligible) {
          benefits.push(...complementaryBenefits.breakdown);
        }

        const totalBenefitsAnnual = familyAllowance
          + (healthSubsidy.eligible ? healthSubsidy.annualSubsidy : 0)
          + (complementaryBenefits.eligible ? complementaryBenefits.annualBenefit : 0);
        const currentNetIncome =
          netAfterSocial(currentTax.netIncome, currentSocial.total) + currentHealthSubsidy.annualSubsidy;
        const futureNetIncome = netAfterSocial(futureTax.netIncome, currentSocial.total) + totalBenefitsAnnual;

        const analysis = await getAIAnalysis(
          "New Child - Tax & Benefits Analysis",
          { grossSalary: totalHouseholdIncome, maritalStatus: data.maritalStatus, dependents: data.dependents + 1 },
          futureTax
        );
        const analysisWithFamilyFundRecommendation = withCantonalFamilyFundRecommendation(
          analysis,
          totalHouseholdIncome,
          true
        );

        const result: ScenarioResult = {
          currentSituation: {
            grossIncome: totalHouseholdIncome,
            totalTax: currentTax.totalTax,
            netIncome: currentNetIncome,
            effectiveTaxRate: currentTax.effectiveTaxRate,
            additionalBenefits: currentHealthSubsidy.annualSubsidy,
          },
          futureSituation: {
            grossIncome: totalHouseholdIncome,
            totalTax: futureTax.totalTax,
            netIncome: futureNetIncome,
            effectiveTaxRate: futureTax.effectiveTaxRate,
            additionalBenefits: totalBenefitsAnnual + birthAllowance + maternity.totalAllowance,
            benefitsBreakdown: benefits,
          },
          comparison: {
            taxDifference: futureTax.totalTax - currentTax.totalTax,
            taxDifferencePct: currentTax.totalTax > 0
              ? ((futureTax.totalTax - currentTax.totalTax) / currentTax.totalTax) * 100
              : 0,
            netIncomeChange: futureNetIncome - currentNetIncome,
            netIncomeChangePct: currentNetIncome > 0
              ? ((futureNetIncome - currentNetIncome) / currentNetIncome) * 100
              : 0,
          },
          analysis: analysisWithFamilyFundRecommendation,
          metadata: {
            scenarioType: "New Child",
            scenarioId: "child_birth",
            location: futureTax.locationName ?? 'N/A',
            calculatedAt: new Date().toISOString(),
          },
        };

        setResults(result);
        saveResults(result);
        refreshMonthlyUsage();
        toast({
          title: t("toast.childBirth.complete.title"),
          description: t("toast.childBirth.complete.description", { taxSavings: formatCHF(Math.abs(result.comparison.taxDifference)), annualBenefits: formatCHF(totalBenefitsAnnual) }),
        });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, saveResults, ensureScenarioLimit, refreshMonthlyUsage]
  );

  // =========================================================================
  // MARRIAGE HANDLER
  // =========================================================================

  const handleMarriage = useCallback(
    async (data: MarriageFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        if (!(await ensureScenarioLimit("marriage"))) {
          return;
        }

        // Calculate taxes as two singles
        const [p1Tax, p2Tax] = await Promise.all([
          calculateTax({
            grossSalary: data.person1Salary,
            locationId: data.person1LocationId,
            maritalStatus: "single",
            dependents: 0,
            age: data.person1Age,
            confession: "none",
          }),
          calculateTax({
            grossSalary: data.person2Salary,
            locationId: data.person2LocationId,
            maritalStatus: "single",
            dependents: 0,
            age: data.person2Age,
            confession: "none",
          }),
        ]);

        // Calculate taxes as married couple
        const marriedTax = await calculateTax({
          grossSalary: data.person1Salary + data.person2Salary,
          locationId: data.futureLocationId,
          maritalStatus: "married",
          dependents: data.combinedDependents,
          age: Math.max(data.person1Age, data.person2Age),
          confession: "none",
        });

        const singleTotalTax = p1Tax.totalTax + p2Tax.totalTax;
        const singleTotalNet = p1Tax.netIncome + p2Tax.netIncome;
        const combinedGross = data.person1Salary + data.person2Salary;
        const p1Social = calculateSocialDeductions(data.person1Salary, data.person1Age);
        const p2Social = calculateSocialDeductions(data.person2Salary, data.person2Age);
        const marriedSocial = calculateSocialDeductions(combinedGross, Math.max(data.person1Age, data.person2Age));
        const p1HealthSubsidy = healthSubsidyFor(p1Tax.canton, "single", data.person1Salary, 0);
        const p2HealthSubsidy = healthSubsidyFor(p2Tax.canton, "single", data.person2Salary, 0);
        const marriedHealthSubsidy = healthSubsidyFor(
          marriedTax.canton,
          "married",
          combinedGross,
          data.combinedDependents
        );
        const singleNetAfterSocial =
          Math.max(0, singleTotalNet - (p1Social.total + p2Social.total))
          + p1HealthSubsidy.annualSubsidy
          + p2HealthSubsidy.annualSubsidy;
        const marriedNetAfterSocial =
          netAfterSocial(marriedTax.netIncome, marriedSocial.total) + marriedHealthSubsidy.annualSubsidy;

        const analysis = await getAIAnalysis(
          "Marriage Tax Comparison",
          { grossSalary: combinedGross, maritalStatus: "married", dependents: data.combinedDependents },
          marriedTax
        );
        const analysisWithFamilyFundRecommendation = withCantonalFamilyFundRecommendation(
          analysis,
          combinedGross,
          true
        );

        const result: ScenarioResult = {
          currentSituation: {
            grossIncome: combinedGross,
            totalTax: singleTotalTax,
            netIncome: singleNetAfterSocial,
            effectiveTaxRate: combinedGross > 0 ? singleTotalTax / combinedGross : 0,
            additionalBenefits: p1HealthSubsidy.annualSubsidy + p2HealthSubsidy.annualSubsidy,
          },
          futureSituation: {
            grossIncome: combinedGross,
            totalTax: marriedTax.totalTax,
            netIncome: marriedNetAfterSocial,
            effectiveTaxRate: marriedTax.effectiveTaxRate,
            additionalBenefits: marriedHealthSubsidy.annualSubsidy,
            benefitsBreakdown: marriedHealthSubsidy.breakdown,
          },
          comparison: {
            taxDifference: marriedTax.totalTax - singleTotalTax,
            taxDifferencePct: singleTotalTax > 0
              ? ((marriedTax.totalTax - singleTotalTax) / singleTotalTax) * 100
              : 0,
            netIncomeChange: marriedNetAfterSocial - singleNetAfterSocial,
            netIncomeChangePct: singleNetAfterSocial > 0
              ? ((marriedNetAfterSocial - singleNetAfterSocial) / singleNetAfterSocial) * 100
              : 0,
          },
          analysis: analysisWithFamilyFundRecommendation,
          metadata: {
            scenarioType: "Marriage",
            scenarioId: "marriage",
            location: marriedTax.locationName ?? 'N/A',
            calculatedAt: new Date().toISOString(),
          },
        };

        setResults(result);
        saveResults(result);
        refreshMonthlyUsage();

        const penalty = result.comparison.taxDifference > 0;
        toast({
          title: penalty ? t("toast.marriage.marriagePenalty.title") : t("toast.marriage.marriageBonus.title"),
          description: penalty ? t("toast.marriage.marriagePenalty.description", { amount: formatCHF(Math.abs(result.comparison.taxDifference)) }) : t("toast.marriage.marriageBonus.description", { amount: formatCHF(Math.abs(result.comparison.taxDifference)) }),
        });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, saveResults, ensureScenarioLimit, refreshMonthlyUsage]
  );

  // =========================================================================
  // PILLAR 3A HANDLER
  // =========================================================================

  const handlePillar3a = useCallback(
    async (data: Pillar3aFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        if (!(await ensureScenarioLimit("pillar_3a"))) {
          return;
        }

        const [withoutContribution, withContribution] = await Promise.all([
          calculateTax({
            grossSalary: data.currentGrossSalary,
            locationId: data.locationId,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents,
            age: data.age,
            confession: data.confession,
          }),
          calculateTax({
            grossSalary: data.currentGrossSalary - data.contributionAmount,
            locationId: data.locationId,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents,
            age: data.age,
            confession: data.confession,
          }),
        ]);

        const social = calculateSocialDeductions(data.currentGrossSalary, data.age);
        const currentHealthSubsidy = healthSubsidyFor(
          withoutContribution.canton,
          data.maritalStatus,
          data.currentGrossSalary,
          data.dependents
        );
        const futureHealthSubsidy = healthSubsidyFor(
          withContribution.canton,
          data.maritalStatus,
          data.currentGrossSalary,
          data.dependents
        );
        const currentNetIncome =
          netAfterSocial(withoutContribution.netIncome, social.total) + currentHealthSubsidy.annualSubsidy;
        const futureNetIncome =
          netAfterSocial(withContribution.netIncome, social.total) + data.contributionAmount + futureHealthSubsidy.annualSubsidy;
        const taxSavings = withoutContribution.totalTax - withContribution.totalTax;
        const projectionYears = Math.max(20, data.projectionYears);
        const annualReturnRate = Math.max(0, data.annualReturnRate) / 100;
        const projectedValue20Years = data.contributionAmount * Math.pow(1 + annualReturnRate, projectionYears);
        const projectedGain20Years = projectedValue20Years - data.contributionAmount;

        const benefits: BenefitItem[] = [
          { label: t("benefits.pillar3aContribution"), amount: data.contributionAmount, type: "deduction" },
          { label: t("benefits.taxSavingsFrom3a"), amount: taxSavings, type: "benefit" },
          { label: t("benefits.projectedValue", { years: projectionYears, rate: data.annualReturnRate }), amount: projectedValue20Years, type: "benefit" },
          { label: t("benefits.estimatedGain", { years: projectionYears }), amount: projectedGain20Years, type: "benefit" },
        ];
        if (futureHealthSubsidy.eligible) {
          benefits.push(...futureHealthSubsidy.breakdown);
        }

        const analysis = await getAIAnalysis(
          "Pillar 3a Tax Optimization",
          { grossSalary: data.currentGrossSalary, maritalStatus: data.maritalStatus, dependents: data.dependents },
          withContribution
        );
        const analysisWithFamilyFundRecommendation = withCantonalFamilyFundRecommendation(
          analysis,
          data.currentGrossSalary,
          data.maritalStatus === "married" || data.dependents > 0
        );

        const result: ScenarioResult = {
          currentSituation: {
            grossIncome: data.currentGrossSalary,
            totalTax: withoutContribution.totalTax,
            netIncome: currentNetIncome,
            effectiveTaxRate: withoutContribution.effectiveTaxRate,
            additionalBenefits: currentHealthSubsidy.annualSubsidy,
          },
          futureSituation: {
            grossIncome: data.currentGrossSalary,
            totalTax: withContribution.totalTax,
            netIncome: futureNetIncome,
            effectiveTaxRate: withContribution.effectiveTaxRate,
            additionalBenefits: taxSavings + futureHealthSubsidy.annualSubsidy,
            benefitsBreakdown: benefits,
          },
          comparison: {
            taxDifference: withContribution.totalTax - withoutContribution.totalTax,
            taxDifferencePct: withoutContribution.totalTax > 0
              ? ((withContribution.totalTax - withoutContribution.totalTax) / withoutContribution.totalTax) * 100
              : 0,
            netIncomeChange: taxSavings,
            netIncomeChangePct: currentNetIncome > 0
              ? (taxSavings / currentNetIncome) * 100
              : 0,
          },
          analysis: analysisWithFamilyFundRecommendation,
          metadata: {
            scenarioType: "Pillar 3a",
            scenarioId: "pillar_3a",
            location: withContribution.locationName ?? 'N/A',
            calculatedAt: new Date().toISOString(),
          },
        };

        setResults(result);
        saveResults(result);
        toast({
          title: t("toast.pillar3a.complete.title"),
          description: t("toast.pillar3a.complete.description", { taxSavings: formatCHF(taxSavings), contribution: formatCHF(data.contributionAmount) }),
        });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, saveResults, ensureScenarioLimit]
  );

  // =========================================================================
  // PILLAR 2 BUYBACK HANDLER
  // =========================================================================

  const handlePillar2Buyback = useCallback(
    async (data: Pillar2BuybackFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        if (!(await ensureScenarioLimit("pillar_2_buyback"))) {
          return;
        }

        const [withoutBuyback, withBuyback] = await Promise.all([
          calculateTax({
            grossSalary: data.currentGrossSalary,
            locationId: data.locationId,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents,
            age: data.age,
            confession: data.confession,
          }),
          calculateTax({
            grossSalary: data.currentGrossSalary - data.buybackAmount,
            locationId: data.locationId,
            maritalStatus: data.maritalStatus,
            dependents: data.dependents,
            age: data.age,
            confession: data.confession,
          }),
        ]);

        const social = calculateSocialDeductions(data.currentGrossSalary, data.age);
        const currentHealthSubsidy = healthSubsidyFor(
          withoutBuyback.canton,
          data.maritalStatus,
          data.currentGrossSalary,
          data.dependents
        );
        const futureHealthSubsidy = healthSubsidyFor(
          withBuyback.canton,
          data.maritalStatus,
          data.currentGrossSalary,
          data.dependents
        );
        const currentNetIncome =
          netAfterSocial(withoutBuyback.netIncome, social.total) + currentHealthSubsidy.annualSubsidy;
        const futureNetIncome =
          netAfterSocial(withBuyback.netIncome, social.total) + data.buybackAmount + futureHealthSubsidy.annualSubsidy;
        const taxSavings = withoutBuyback.totalTax - withBuyback.totalTax;

        // Calculate optimal multi-year strategy
        const yearsToRetirement = 65 - data.age;
        const optimalYearlyAmount = Math.min(
          data.currentPensionGap / Math.max(yearsToRetirement, 1),
          data.buybackAmount
        );

        const benefits: BenefitItem[] = [
          { label: t("benefits.lppBuybackAmount"), amount: data.buybackAmount, type: "deduction" },
          { label: t("benefits.taxSavingsFromBuyback"), amount: taxSavings, type: "benefit" },
        ];
        if (futureHealthSubsidy.eligible) {
          benefits.push(...futureHealthSubsidy.breakdown);
        }

        const analysis = await getAIAnalysis(
          "Pillar 2 Buyback Analysis",
          { grossSalary: data.currentGrossSalary, maritalStatus: data.maritalStatus, dependents: data.dependents },
          withBuyback
        );

        // Add multi-year optimization recommendation
        if (yearsToRetirement > 3 && data.buybackAmount > optimalYearlyAmount) {
          analysis.recommendations.push(
            t("benefits.pillar2MultiyearRecommendation", {
              years: Math.ceil(data.currentPensionGap / optimalYearlyAmount),
              amount: formatCHF(optimalYearlyAmount),
            })
          );
        }

        const analysisWithFamilyFundRecommendation = withCantonalFamilyFundRecommendation(
          analysis,
          data.currentGrossSalary,
          data.maritalStatus === "married" || data.dependents > 0
        );

        const result: ScenarioResult = {
          currentSituation: {
            grossIncome: data.currentGrossSalary,
            totalTax: withoutBuyback.totalTax,
            netIncome: currentNetIncome,
            effectiveTaxRate: withoutBuyback.effectiveTaxRate,
            additionalBenefits: currentHealthSubsidy.annualSubsidy,
          },
          futureSituation: {
            grossIncome: data.currentGrossSalary,
            totalTax: withBuyback.totalTax,
            netIncome: futureNetIncome,
            effectiveTaxRate: withBuyback.effectiveTaxRate,
            additionalBenefits: taxSavings + futureHealthSubsidy.annualSubsidy,
            benefitsBreakdown: benefits,
          },
          comparison: {
            taxDifference: withBuyback.totalTax - withoutBuyback.totalTax,
            taxDifferencePct: withoutBuyback.totalTax > 0
              ? ((withBuyback.totalTax - withoutBuyback.totalTax) / withoutBuyback.totalTax) * 100
              : 0,
            netIncomeChange: taxSavings,
            netIncomeChangePct: currentNetIncome > 0
              ? (taxSavings / currentNetIncome) * 100
              : 0,
          },
          analysis: analysisWithFamilyFundRecommendation,
          metadata: {
            scenarioType: "Pillar 2 Buyback",
            scenarioId: "pillar_2_buyback",
            location: withBuyback.locationName ?? 'N/A',
            calculatedAt: new Date().toISOString(),
          },
        };

        setResults(result);
        saveResults(result);
        refreshMonthlyUsage();
        toast({
          title: t("toast.pillar2Buyback.complete.title"),
          description: t("toast.pillar2Buyback.complete.description", { taxSavings: formatCHF(taxSavings), buyback: formatCHF(data.buybackAmount) }),
        });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, saveResults, ensureScenarioLimit, refreshMonthlyUsage]
  );

  // =========================================================================
  // SUPPLEMENTARY BENEFITS (EL) HANDLER
  // =========================================================================

  const handleSupplementaryBenefits = useCallback(
    async (data: SupplementaryBenefitsFormValues) => {
      setIsLoading(true);
      setResults(null);
      try {
        if (!(await ensureScenarioLimit("supplementary_benefits"))) {
          return;
        }

        if (!data.isRetired && !data.receivesAiBenefits) {
          toast({
            title: t("supplementaryBenefits.toast.eligibilityContextRequired.title"),
            description: t("supplementaryBenefits.toast.eligibilityContextRequired.description"),
            variant: "destructive",
          });
          return;
        }

        const assessableIncome =
          data.annualRetirementIncome + data.annualDisabilityIncome + data.otherAnnualIncome;

        const taxBaseline = await calculateTax({
          grossSalary: assessableIncome,
          locationId: data.locationId,
          maritalStatus: data.maritalStatus,
          dependents: data.dependents,
          age: data.age,
          confession: "none",
        });

        const supplementaryBenefits = calculateSupplementaryBenefitsEntitlement({
          canton: taxBaseline.canton ?? "",
          municipalityName: taxBaseline.locationName,
          maritalStatus: data.maritalStatus,
          children: data.dependents,
          annualAssessableIncome: assessableIncome,
          annualHousingCosts: data.annualHousingCosts,
          annualHealthInsurancePremium: data.annualHealthInsurancePremium,
          netAssets: data.netAssets,
          eligibilityGroup: data.receivesAiBenefits ? "ai" : "retired",
        });

        const baselineNetIncome = assessableIncome;
        const netWithSupplementaryBenefits = baselineNetIncome + supplementaryBenefits.annualBenefit;

        const eligibilityContext = [
          data.isRetired ? t("supplementaryBenefits.analysis.context.retired") : null,
          data.receivesAiBenefits ? t("supplementaryBenefits.analysis.context.aiBeneficiary") : null,
        ].filter(Boolean).join(` ${t("supplementaryBenefits.analysis.context.and")} `);

        const analysis = {
          summary: supplementaryBenefits.eligible
            ? t("supplementaryBenefits.analysis.summary.eligible", { context: eligibilityContext })
            : t("supplementaryBenefits.analysis.summary.notEligible", { context: eligibilityContext }),
          recommendations: supplementaryBenefits.eligible
            ? [
                t("supplementaryBenefits.analysis.recommendations.prepareRecords"),
                t("supplementaryBenefits.analysis.recommendations.contactCantonalOffice"),
              ]
            : [
                t("supplementaryBenefits.analysis.recommendations.requestFullAssessment"),
              ],
          impacts: [
            t("supplementaryBenefits.analysis.impacts.estimatedAnnualBenefit", { amount: formatCHF(supplementaryBenefits.annualBenefit) }),
            t("supplementaryBenefits.analysis.impacts.recognizedExpenses", { amount: formatCHF(supplementaryBenefits.recognizedExpenses) }),
            t("supplementaryBenefits.analysis.impacts.determiningIncome", { amount: formatCHF(supplementaryBenefits.determiningIncome) }),
          ],
        };

        if (!supplementaryBenefits.eligible && supplementaryBenefits.reason) {
          analysis.recommendations.push(supplementaryBenefits.reason);
        }

        const result: ScenarioResult = {
          currentSituation: {
            grossIncome: assessableIncome,
            totalTax: 0,
            netIncome: baselineNetIncome,
            effectiveTaxRate: 0,
            additionalBenefits: 0,
          },
          futureSituation: {
            grossIncome: assessableIncome,
            totalTax: 0,
            netIncome: netWithSupplementaryBenefits,
            effectiveTaxRate: 0,
            additionalBenefits: supplementaryBenefits.annualBenefit,
            benefitsBreakdown: supplementaryBenefits.breakdown,
          },
          comparison: {
            taxDifference: 0,
            taxDifferencePct: 0,
            netIncomeChange: supplementaryBenefits.annualBenefit,
            netIncomeChangePct: baselineNetIncome > 0
              ? (supplementaryBenefits.annualBenefit / baselineNetIncome) * 100
              : 0,
          },
          analysis,
          metadata: {
            scenarioType: t("supplementaryBenefits.meta.scenarioType"),
            scenarioId: "supplementary_benefits",
            location: taxBaseline.locationName ?? "N/A",
            calculatedAt: new Date().toISOString(),
          },
        };

        setResults(result);
        saveResults(result);
        refreshMonthlyUsage();
        toast({
          title: t("supplementaryBenefits.toast.complete.title"),
          description: t("supplementaryBenefits.toast.complete.description", {
            amount: formatCHF(supplementaryBenefits.annualBenefit),
          }),
        });
      } catch (err: any) {
        toast({ title: t("toast.calculationFailed.title"), description: err.message || t("toast.calculationFailed.description"), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, saveResults, ensureScenarioLimit, refreshMonthlyUsage]
  );

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("access.title")}</CardTitle>
            <CardDescription>
              {t("access.description", { count: monthlyNonPillarLimit })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              {t("access.usedThisMonth", { used: monthlyUsage.used, total: totalMonthlyAllowance })}{" "}
              <span className="font-semibold text-foreground">{monthlyUsage.used}/{totalMonthlyAllowance}</span>
              {monthlyUsage.loading ? ` ${t("access.syncing")}` : ""}
            </p>
            {monthlyUsage.purchased > 0 ? (
              <p>
                Purchased add-ons this month: <span className="font-semibold text-foreground">{monthlyUsage.purchased}</span>
              </p>
            ) : null}
            <p>
              {t("access.additionalScenarioPrice", { price: INDIVIDUAL_ACCESS_PRICING.addOns.extraScenarioPriceChf })}
            </p>
            <p>{t("access.unlimitedPillar3a")}</p>
          </CardContent>
        </Card>
        {/* ── Comparison Mode ── */}
        <Card className="p-4 flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sc-comparison-mode" className="text-sm font-medium">
                Comparison mode (pro-rata)
              </Label>
              <Switch
                id="sc-comparison-mode"
                checked={comparisonEnabled}
                onCheckedChange={setComparisonEnabled}
              />
            </div>
            {comparisonEnabled && (
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sc-months-recorded" className="text-sm">
                  Months of recorded data:
                </Label>
                <Input
                  id="sc-months-recorded"
                  type="number"
                  min={1}
                  max={12}
                  value={monthsRecorded}
                  onChange={(e) => setMonthsRecorded(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            )}
          </div>
          {comparisonEnabled && comparisonMeta && (
            <p className="text-xs text-amber-600 mt-2">{comparisonMeta.note}</p>
          )}
        </Card>
      </div>

      <div className="w-full">
        {/* Scenario dropdown selector */}
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t("selectScenario")}
          </label>
          <Select
            value={activeTab ?? ""}
            onValueChange={(val) => {
              setResults(null);
              setActiveTab(val as ScenarioType);
            }}
          >
            <SelectTrigger className={`w-full max-w-sm ${!activeTab ? 'border-destructive ring-1 ring-destructive' : ''}`}>
              <SelectValue placeholder={t("selectScenarioPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {visibleScenarios.map((scenario) => {
                const Icon = ICON_MAP[scenario.icon] ?? TrendingUp;
                return (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      {t(`scenarioTitles.${scenario.id}`)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form — or validation prompt if nothing selected */}
          <div>
            {!activeTab && (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-destructive/50 bg-destructive/5 p-10 text-center gap-3">
                <div className="rounded-full bg-destructive/10 p-3">
                  <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-destructive">{t("selectScenarioRequired")}</p>
                <p className="text-xs text-muted-foreground">{t("selectScenarioRequiredHint")}</p>
              </div>
            )}
            {activeTab === "income_change" && (
              <IncomeChangeForm
                onSubmit={handleIncomeChange}
                isLoading={isLoading}
                defaultValues={masterProfile ?? undefined}
                onSaveMasterProfile={handleSaveMasterProfile}
                isSavingProfile={isSavingProfile}
              />
            )}
            {activeTab === "job_loss" && (
              <JobLossForm
                onSubmit={handleJobLoss}
                isLoading={isLoading}
                defaultValues={masterProfile ? {
                  currentGrossSalary: masterProfile.currentGrossSalary,
                  locationId: masterProfile.locationId,
                  maritalStatus: masterProfile.maritalStatus,
                  dependents: masterProfile.dependents,
                  age: masterProfile.age,
                  confession: masterProfile.confession,
                  hasChildren: (masterProfile.dependents ?? 0) > 0,
                } : undefined}
              />
            )}
            {activeTab === "child_birth" && (
              <ChildBirthForm
                onSubmit={handleChildBirth}
                isLoading={isLoading}
                defaultValues={masterProfile ? {
                  currentGrossSalary: masterProfile.currentGrossSalary,
                  locationId: masterProfile.locationId,
                  maritalStatus: masterProfile.maritalStatus,
                  dependents: masterProfile.dependents,
                  age: masterProfile.age,
                  confession: masterProfile.confession,
                } : undefined}
              />
            )}
            {activeTab === "marriage" && (
              <MarriageForm
                onSubmit={handleMarriage}
                isLoading={isLoading}
                defaultValues={masterProfile ? {
                  person1Salary: masterProfile.currentGrossSalary,
                  person1LocationId: masterProfile.locationId,
                  person1Age: masterProfile.age,
                  futureLocationId: masterProfile.locationId,
                  combinedDependents: masterProfile.dependents,
                } : undefined}
              />
            )}
            {activeTab === "pillar_3a" && (
              <Pillar3aForm
                onSubmit={handlePillar3a}
                isLoading={isLoading}
                defaultValues={masterProfile ? {
                  currentGrossSalary: masterProfile.currentGrossSalary,
                  locationId: masterProfile.locationId,
                  maritalStatus: masterProfile.maritalStatus,
                  dependents: masterProfile.dependents,
                  age: masterProfile.age,
                  confession: masterProfile.confession,
                } : undefined}
              />
            )}
            {activeTab === "pillar_2_buyback" && (
              <Pillar2BuybackForm
                onSubmit={handlePillar2Buyback}
                isLoading={isLoading}
                defaultValues={masterProfile ? {
                  currentGrossSalary: masterProfile.currentGrossSalary,
                  locationId: masterProfile.locationId,
                  maritalStatus: masterProfile.maritalStatus,
                  dependents: masterProfile.dependents,
                  age: masterProfile.age,
                  confession: masterProfile.confession,
                } : undefined}
              />
            )}
            {activeTab === "supplementary_benefits" && (
              <SupplementaryBenefitsForm
                onSubmit={handleSupplementaryBenefits}
                isLoading={isLoading}
                defaultValues={masterProfile ? {
                  locationId: masterProfile.locationId,
                  maritalStatus: masterProfile.maritalStatus,
                  dependents: masterProfile.dependents,
                  age: masterProfile.age,
                  netAssets: masterProfile.fortune,
                } : undefined}
              />
            )}
            {activeTab === "vat_comparison" && (
              <VATComparisonForm onSubmit={handleVATComparison} isLoading={isLoading} />
            )}
          </div>

          {/* Right: Results */}
          <div>
            {isLoading ? (
              <ResultsSkeleton />
            ) : results ? (
              <ScenarioResults
                results={results}
                comparison={comparisonMeta}
                onExportPDF={handleExportPDF}
                onRequestExpertReview={handleRequestExpertReview}
                isRequestingReview={isRequestingReview}
              />
            ) : (
              <EmptyResultsCard />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
