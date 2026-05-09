"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase/firebase-provider";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/firebase/config";
import { Loader2, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { taxInputData } from "@/lib/taxes/constants";
import type {
  TaxInput,
  TaxResult,
  TaxRelationship,
  TaxConfession,
  TaxIncomeType,
  TaxDeductionPerPersonInput,
  TaxDeductionGeneralInput,
} from "@/lib/taxes/typesClient";
import type { IncomeChangeFormValues } from "@/lib/scenario-calculator/schemas";
import type { LocationSearchResult } from "@/lib/scenario-calculator/types";
import { LocationSearch } from "./LocationSearch";
import type { TaxLocation } from "@/lib/taxes/typesClient";

interface SwissTaxMasterCalculatorProps {
  onBaselineSaved?: (profile: Partial<IncomeChangeFormValues>) => void;
}

type MasterFormState = {
  year: number;
  relationship: TaxRelationship;
  children: number;
  fortune: number;
  locationId?: number;
  cantonId?: number;
  person1Age: number;
  person1Confession: TaxConfession;
  person1IncomeType: TaxIncomeType;
  person1Income: number;
  person1PkDeduction: number;
  person2Age: number;
  person2Confession: TaxConfession;
  person2IncomeType: TaxIncomeType;
  person2Income: number;
  person2PkDeduction: number;
  person1Deductions: TaxDeductionPerPersonInput;
  person2Deductions: TaxDeductionPerPersonInput;
  generalDeductions: TaxDeductionGeneralInput;
};

const initialState: MasterFormState = {
  year: new Date().getFullYear(),
  relationship: "s",
  children: 0,
  fortune: 0,
  person1Age: 35,
  person1Confession: "other",
  person1IncomeType: "gross",
  person1Income: 80000,
  person1PkDeduction: 0,
  person2Age: 33,
  person2Confession: "other",
  person2IncomeType: "gross",
  person2Income: 60000,
  person2PkDeduction: 0,
  person1Deductions: {},
  person2Deductions: {},
  generalDeductions: {},
};

function chf(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function mapConfessionForScenario(confession: TaxConfession): "none" | "catholic" | "protestant" {
  if (confession === "roman") return "catholic";
  if (confession === "protestant") return "protestant";
  return "none";
}

export function SwissTaxMasterCalculator({ onBaselineSaved }: SwissTaxMasterCalculatorProps) {
  const t = useTranslations("ScenarioCalculator.masterCalculator");
  const c = useTranslations("ScenarioCalculator.common");
  const locale = useLocale();
  const { toast } = useToast();
  const { user } = useFirebase();

  const [form, setForm] = useState<MasterFormState>(initialState);
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationsByBfsId, setLocationsByBfsId] = useState<Record<number, TaxLocation>>({});

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const res = await fetch(`/api/taxes/locations?year=${form.year}`, { cache: "no-store" });
        if (!res.ok) return;
        const list = (await res.json()) as TaxLocation[];
        const map: Record<number, TaxLocation> = {};
        for (const item of list) {
          map[item.BfsID] = item;
        }
        setLocationsByBfsId(map);
      } catch {
        // non-blocking
      }
    };
    void loadLocations();
  }, [form.year]);

  const showSecondPerson = useMemo(
    () => form.relationship === "m" || form.relationship === "rp",
    [form.relationship]
  );

  const scenarioSeed = useMemo<Partial<IncomeChangeFormValues>>(
    () => ({
      currentGrossSalary: form.person1Income,
      newGrossSalary: form.person1Income,
      locationId: form.locationId,
      maritalStatus: showSecondPerson ? "married" : "single",
      dependents: form.children,
      age: form.person1Age,
      confession: mapConfessionForScenario(form.person1Confession),
      fortune: form.fortune,
    }),
    [form, showSecondPerson]
  );

  const updateField = <K extends keyof MasterFormState>(field: K, value: MasterFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePersonDeduction = (
    personKey: "person1Deductions" | "person2Deductions",
    key: keyof TaxDeductionPerPersonInput,
    amount: number
  ) => {
    setForm((prev) => ({
      ...prev,
      [personKey]: {
        ...prev[personKey],
        [key]: amount,
      },
    }));
  };

  const updateGeneralDeduction = (key: keyof TaxDeductionGeneralInput, amount: number) => {
    setForm((prev) => ({
      ...prev,
      generalDeductions: {
        ...prev.generalDeductions,
        [key]: amount,
      },
    }));
  };

  const localeLabel = (label: { de: string; en: string; fr?: string; it?: string; es?: string }) => {
    const lang = locale.toLowerCase().split("-")[0];
    if (lang === "de") return label.de;
    if (lang === "fr") return label.fr ?? label.en;
    if (lang === "it") return label.it ?? label.en;
    if (lang === "es") return label.es ?? label.en;
    return label.en;
  };

  const buildTaxInput = (): TaxInput | null => {
    const inferredCantonId = form.locationId ? locationsByBfsId[form.locationId]?.CantonID : undefined;
    const cantonId = form.cantonId ?? inferredCantonId;

    if (!form.locationId || !cantonId) {
      return null;
    }

    const persons: TaxInput["persons"] = [
      {
        age: form.person1Age,
        confession: form.person1Confession,
        incomeType: form.person1IncomeType,
        income: form.person1Income,
        pkDeduction: form.person1PkDeduction,
        deductions: form.person1Deductions,
      },
    ];

    if (showSecondPerson) {
      persons.push({
        age: form.person2Age,
        confession: form.person2Confession,
        incomeType: form.person2IncomeType,
        income: form.person2Income,
        pkDeduction: form.person2PkDeduction,
        deductions: form.person2Deductions,
      });
    }

    return {
      calculationType: "incomeAndWealth",
      relationship: form.relationship,
      locationId: form.locationId,
      cantonId,
      year: form.year,
      children: form.children,
      fortune: form.fortune,
      persons,
      deductions: form.generalDeductions,
    };
  };

  const handleCalculate = async () => {
    const input = buildTaxInput();
    if (!input) {
      toast({
        title: t("toast.municipalityRequired.title"),
        description: t("toast.municipalityRequired.description"),
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const response = await fetch("/api/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || t("toast.calculationFailed.fallback"));
      }
      setTaxResult(payload as TaxResult);
      toast({ title: t("toast.calculationSuccess.title"), description: t("toast.calculationSuccess.description") });
    } catch (error) {
      toast({
        title: t("toast.calculationFailed.title"),
        description: error instanceof Error ? error.message : t("toast.calculationFailed.fallback"),
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveBaseline = async () => {
    if (!user) {
      toast({ title: t("toast.signInRequired.title"), description: t("toast.signInRequired.description"), variant: "destructive" });
      return;
    }
    if (!form.locationId) {
      toast({ title: t("toast.municipalityRequired.title"), description: t("toast.municipalityBeforeSave.description"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(
        doc(firestore, "users", user.uid, "masterProfile", "baseline"),
        {
          ...scenarioSeed,
          source: "swisstaxcalculator-master",
          savedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await setDoc(
        doc(firestore, "users", user.uid, "masterProfile", "taxBaseline"),
        {
          taxInput: buildTaxInput(),
          location: selectedLocation,
          taxResult,
          source: "swisstaxcalculator-master",
          savedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onBaselineSaved?.(scenarioSeed);
      toast({ title: t("toast.baselineSaved.title"), description: t("toast.baselineSaved.description") });
    } catch {
      toast({ title: t("toast.saveFailed.title"), description: t("toast.saveFailed.description"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const detailsGrossNet = useMemo(() => {
    if (!taxResult?.details.grossNetDetails?.length) return [] as Array<{ label: string; p1: number; p2?: number }>;
    const p1 = taxResult.details.grossNetDetails[0];
    const p2 = taxResult.details.grossNetDetails.length > 1 ? taxResult.details.grossNetDetails[1] : undefined;
    return [
      { label: t("rows.grossIncome"), p1: p1.grossIncome, p2: p2?.grossIncome },
      { label: t("rows.ahvIvEo"), p1: p1.ahvIvEo, p2: p2?.ahvIvEo },
      { label: t("rows.alv"), p1: p1.alv, p2: p2?.alv },
      { label: t("rows.nbu"), p1: p1.nbu, p2: p2?.nbu },
      { label: t("rows.pensionFund"), p1: p1.pk, p2: p2?.pk },
      { label: t("rows.netIncome"), p1: p1.netIncome, p2: p2?.netIncome },
    ];
  }, [taxResult, t]);

  const detailsDeductionsIncome = useMemo(() => {
    if (!taxResult) return [] as Array<{ label: string; canton: number; bund: number }>;
    const rows: Array<{ label: string; canton: number; bund: number }> = [
      {
        label: t("rows.netIncomeMainOccupation"),
        canton: taxResult.details.netIncomeCanton,
        bund: taxResult.details.netIncomeBund,
      },
    ];
    for (const d of taxResult.details.deductionsIncome) {
      rows.push({
        label: `${d.name}${d.target ? ` ${d.target}` : ""}`.trim(),
        canton: d.amountCanton,
        bund: d.amountBund,
      });
    }
    rows.push({
      label: t("rows.taxableIncome"),
      canton: taxResult.details.taxableIncomeCanton,
      bund: taxResult.details.taxableIncomeBund,
    });
    return rows;
  }, [taxResult, t]);

  const detailsDeductionsFortune = useMemo(() => {
    if (!taxResult) return [] as Array<{ label: string; canton: number }>;
    const rows: Array<{ label: string; canton: number }> = [
      { label: t("rows.netFortune"), canton: taxResult.input.fortune },
    ];
    for (const d of taxResult.details.deductionsFortune) {
      rows.push({
        label: `${d.name}${d.target ? ` ${d.target}` : ""}`.trim(),
        canton: d.amountCanton,
      });
    }
    rows.push({ label: t("rows.taxableFortune"), canton: taxResult.details.taxableFortuneCanton });
    return rows;
  }, [taxResult, t]);

  const totalCantonal = taxResult ? taxResult.taxesIncomeCanton + taxResult.taxesFortuneCanton : 0;
  const totalMunicipal = taxResult ? taxResult.taxesIncomeCity + taxResult.taxesFortuneCity : 0;
  const totalChurch = taxResult ? taxResult.taxesIncomeChurch + taxResult.taxesFortuneChurch : 0;
  const totalBund = taxResult ? taxResult.taxesIncomeBund : 0;
  const taxTotal = taxResult?.taxesTotal || 0;
  const pct = (value: number) => (taxTotal > 0 ? (value / taxTotal) * 100 : 0);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("labels.taxYear")}</Label>
                <Select value={String(form.year)} onValueChange={(v) => updateField("year", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {taxInputData.years.map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("labels.relationship")}</Label>
                <Select value={form.relationship} onValueChange={(v) => updateField("relationship", v as TaxRelationship)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {taxInputData.relationships.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>{localeLabel(rel.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{c("children")}</Label>
                <Input type="number" min={0} max={10} value={form.children} onChange={(e) => updateField("children", Number(e.target.value || 0))} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{c("municipality")}</Label>
                <LocationSearch
                  value={selectedLocation?.TaxLocationID}
                  taxYear={form.year}
                  onChange={(location) => {
                    setSelectedLocation(location);
                    updateField("locationId", location?.BfsID);
                    updateField("cantonId", location?.CantonID);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("labels.netFortune")}</Label>
                <Input type="number" min={0} value={form.fortune} onChange={(e) => updateField("fortune", Number(e.target.value || 0))} />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="font-medium">{t("sections.person1")}</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>{c("age")}</Label>
                  <Input type="number" min={18} max={99} value={form.person1Age} onChange={(e) => updateField("person1Age", Number(e.target.value || 18))} />
                </div>
                <div className="space-y-2">
                  <Label>{c("religion")}</Label>
                  <Select value={form.person1Confession} onValueChange={(v) => updateField("person1Confession", v as TaxConfession)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {taxInputData.confessions.map((conf) => <SelectItem key={conf.value} value={conf.value}>{localeLabel(conf.label)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("labels.incomeType")}</Label>
                  <Select value={form.person1IncomeType} onValueChange={(v) => updateField("person1IncomeType", v as TaxIncomeType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {taxInputData.incomeTypes.map((type) => <SelectItem key={type.value} value={type.value}>{localeLabel(type.label)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("labels.income")}</Label>
                  <Input type="number" min={0} value={form.person1Income} onChange={(e) => updateField("person1Income", Number(e.target.value || 0))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("labels.pkDeduction")}</Label>
                  <Input type="number" min={0} value={form.person1PkDeduction} onChange={(e) => updateField("person1PkDeduction", Number(e.target.value || 0))} />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">{t("sections.person1Deductions")}</p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(taxInputData.deductionsPerson) as Array<keyof TaxDeductionPerPersonInput>).map((key) => (
                    <div key={`p1-${String(key)}`} className="space-y-1">
                      <Label className="text-xs">{localeLabel(taxInputData.deductionsPerson[key].label)}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.person1Deductions[key] ?? 0}
                        onChange={(e) => updatePersonDeduction("person1Deductions", key, Number(e.target.value || 0))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {showSecondPerson && (
              <div className="rounded-lg border p-4 space-y-4">
                <h3 className="font-medium">{t("sections.person2")}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-2">
                    <Label>{c("age")}</Label>
                    <Input type="number" min={18} max={99} value={form.person2Age} onChange={(e) => updateField("person2Age", Number(e.target.value || 18))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{c("religion")}</Label>
                    <Select value={form.person2Confession} onValueChange={(v) => updateField("person2Confession", v as TaxConfession)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {taxInputData.confessions.map((conf) => <SelectItem key={conf.value} value={conf.value}>{localeLabel(conf.label)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("labels.incomeType")}</Label>
                    <Select value={form.person2IncomeType} onValueChange={(v) => updateField("person2IncomeType", v as TaxIncomeType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {taxInputData.incomeTypes.map((type) => <SelectItem key={type.value} value={type.value}>{localeLabel(type.label)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("labels.income")}</Label>
                    <Input type="number" min={0} value={form.person2Income} onChange={(e) => updateField("person2Income", Number(e.target.value || 0))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("labels.pkDeduction")}</Label>
                    <Input type="number" min={0} value={form.person2PkDeduction} onChange={(e) => updateField("person2PkDeduction", Number(e.target.value || 0))} />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t("sections.person2Deductions")}</p>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {(Object.keys(taxInputData.deductionsPerson) as Array<keyof TaxDeductionPerPersonInput>).map((key) => (
                      <div key={`p2-${String(key)}`} className="space-y-1">
                        <Label className="text-xs">{localeLabel(taxInputData.deductionsPerson[key].label)}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.person2Deductions[key] ?? 0}
                          onChange={(e) => updatePersonDeduction("person2Deductions", key, Number(e.target.value || 0))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium">{t("sections.generalDeductions")}</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(taxInputData.deductionsGeneral) as Array<keyof TaxDeductionGeneralInput>).map((key) => (
                  <div key={`general-${String(key)}`} className="space-y-1">
                    <Label className="text-xs">{localeLabel(taxInputData.deductionsGeneral[key].label)}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.generalDeductions[key] ?? 0}
                      onChange={(e) => updateGeneralDeduction(key, Number(e.target.value || 0))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleCalculate()} disabled={isCalculating}>
                {isCalculating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("buttons.calculating")}</> : t("buttons.calculateTaxes")}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleSaveBaseline()} disabled={isSaving || !form.locationId}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("buttons.saving")}</> : <><Save className="mr-2 h-4 w-4" /> {t("buttons.saveCurrentSituation")}</>}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("results.title")}</h3>
            {!taxResult ? (
              <p className="text-sm text-muted-foreground">{t("results.empty")}</p>
            ) : (
              <div className="space-y-5 text-sm">
                <div>
                  <div className="flex items-center justify-between font-medium"><span>{t("results.cantonalTax")}</span><span>{chf(totalCantonal, locale)}</span></div>
                  <div className="mt-1 flex items-center justify-between text-muted-foreground"><span>{t("results.incomeTax")}</span><span>{chf(taxResult.taxesIncomeCanton, locale)}</span></div>
                  <div className="flex items-center justify-between text-muted-foreground"><span>{t("results.fortuneTax")}</span><span>{chf(taxResult.taxesFortuneCanton, locale)}</span></div>
                  <div className="mt-2 h-1.5 bg-muted"><div className="h-1.5 bg-primary" style={{ width: `${pct(totalCantonal)}%` }} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between font-medium"><span>{t("results.municipalTax")}</span><span>{chf(totalMunicipal, locale)}</span></div>
                  <div className="mt-1 flex items-center justify-between text-muted-foreground"><span>{t("results.incomeTax")}</span><span>{chf(taxResult.taxesIncomeCity, locale)}</span></div>
                  <div className="flex items-center justify-between text-muted-foreground"><span>{t("results.fortuneTax")}</span><span>{chf(taxResult.taxesFortuneCity, locale)}</span></div>
                  <div className="mt-2 h-1.5 bg-muted"><div className="h-1.5 bg-primary" style={{ width: `${pct(totalMunicipal)}%` }} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between font-medium"><span>{t("results.churchTax")}</span><span>{chf(totalChurch, locale)}</span></div>
                  <div className="mt-1 flex items-center justify-between text-muted-foreground"><span>{t("results.incomeTax")}</span><span>{chf(taxResult.taxesIncomeChurch, locale)}</span></div>
                  <div className="flex items-center justify-between text-muted-foreground"><span>{t("results.fortuneTax")}</span><span>{chf(taxResult.taxesFortuneChurch, locale)}</span></div>
                  <div className="mt-2 h-1.5 bg-muted"><div className="h-1.5 bg-primary" style={{ width: `${pct(totalChurch)}%` }} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between font-medium"><span>{t("results.federalTax")}</span><span>{chf(totalBund, locale)}</span></div>
                  <div className="mt-2 h-1.5 bg-muted"><div className="h-1.5 bg-primary" style={{ width: `${pct(totalBund)}%` }} /></div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between"><span>{t("results.totalIncomeTax")}</span><span>{chf(taxResult.taxesIncomeCity + taxResult.taxesIncomeCanton + taxResult.taxesIncomeChurch + taxResult.taxesIncomeBund, locale)}</span></div>
                  <div className="flex items-center justify-between"><span>{t("results.totalFortuneTax")}</span><span>{chf(taxResult.taxesFortuneCity + taxResult.taxesFortuneCanton + taxResult.taxesFortuneChurch, locale)}</span></div>
                  <div className="mt-1 flex items-center justify-between font-semibold text-base"><span>{t("results.totalTaxes")}</span><span>{chf(taxResult.taxesTotal, locale)}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {taxResult && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{t("tables.title")}</h3>
            {!!detailsGrossNet.length && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="p-2">{t("tables.grossNet")}</th>
                      <th className="p-2 text-right">{t("tables.p1")}</th>
                      <th className="p-2 text-right">{showSecondPerson ? t("tables.p2") : ""}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsGrossNet.map((row) => (
                      <tr key={row.label} className="border-t">
                        <td className="p-2">{row.label}</td>
                        <td className="p-2 text-right tabular-nums">{chf(row.p1, locale)}</td>
                        <td className="p-2 text-right tabular-nums">{showSecondPerson ? chf(row.p2 ?? 0, locale) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-2">{t("tables.income")}</th>
                    <th className="p-2 text-right">{t("tables.canton")}</th>
                    <th className="p-2 text-right">{t("tables.federal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsDeductionsIncome.map((row) => (
                    <tr key={`income-${row.label}`} className="border-t">
                      <td className="p-2">{row.label}</td>
                      <td className="p-2 text-right tabular-nums">{chf(row.canton, locale)}</td>
                      <td className="p-2 text-right tabular-nums">{chf(row.bund, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="p-2">{t("tables.fortune")}</th>
                    <th className="p-2 text-right">{t("tables.canton")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsDeductionsFortune.map((row) => (
                    <tr key={`fortune-${row.label}`} className="border-t">
                      <td className="p-2">{row.label}</td>
                      <td className="p-2 text-right tabular-nums">{chf(row.canton, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
