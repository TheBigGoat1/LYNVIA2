"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, TrendingUp, Briefcase, Baby, Heart, PiggyBank, Wallet, Landmark, BookmarkCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  incomeChangeSchema, jobLossSchema, childBirthSchema,
  marriageSchema, pillar3aSchema, pillar2BuybackSchema, supplementaryBenefitsSchema, vatComparisonSchema,
  type IncomeChangeFormValues, type JobLossFormValues, type ChildBirthFormValues,
  type MarriageFormValues, type Pillar3aFormValues, type Pillar2BuybackFormValues, type SupplementaryBenefitsFormValues,
  type VatComparisonFormValues,
} from "@/lib/scenario-calculator/schemas";
import { formatCHF, TDFN_SECTORS } from "@/lib/scenario-calculator/calculations";
import { LocationSearch } from "./LocationSearch";

// ============================================================================
// INCOME CHANGE FORM
// ============================================================================

export function IncomeChangeForm({
  onSubmit, isLoading, defaultValues, onSaveMasterProfile, isSavingProfile,
}: {
  onSubmit: (data: IncomeChangeFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<IncomeChangeFormValues>;
  onSaveMasterProfile?: (data: IncomeChangeFormValues) => void;
  isSavingProfile?: boolean;
}) {
  const c = useTranslations("ScenarioCalculator.common");
  const t = useTranslations("ScenarioCalculator.forms.incomeChange");
  const tm = useTranslations("ScenarioCalculator.masterProfile");
  const form = useForm<IncomeChangeFormValues>({
    resolver: zodResolver(incomeChangeSchema),
    defaultValues: defaultValues ?? {
      currentGrossSalary: 80000, newGrossSalary: 95000, 
      locationId: 261, // Zurich
      maritalStatus: "single", dependents: 0, age: 35, confession: "none", fortune: 0,
    },
  });

  // Re-populate form when saved master profile loads
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      form.reset({
        currentGrossSalary: 80000, newGrossSalary: 95000,
        locationId: 261,
        maritalStatus: "single", dependents: 0, age: 35, confession: "none", fortune: 0,
        ...defaultValues,
      });
    }
  }, [defaultValues]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="currentGrossSalary" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.currentGrossSalary")}</FormLabel>
                  <FormControl><Input type="number" placeholder="80000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="newGrossSalary" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.newGrossSalary")}</FormLabel>
                  <FormControl><Input type="number" placeholder="95000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

             <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{c("municipality")}</FormLabel>
                   <LocationSearch
                    value={field.value}
                    onChange={(location) => field.onChange(location?.TaxLocationID)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("maritalStatus")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="single">{c("single")}</SelectItem>
                      <SelectItem value="married">{c("married")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dependents" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("children")}</FormLabel>
                  <FormControl><Input type="number" min={0} max={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("age")}</FormLabel>
                  <FormControl><Input type="number" min={18} max={99} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confession" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("religion")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">{c("noneOther")}</SelectItem>
                      <SelectItem value="catholic">{c("catholic")}</SelectItem>
                      <SelectItem value="protestant">{c("protestant")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="fortune" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.fortune")}</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                <FormDescription>{t("descriptions.fortune")}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {onSaveMasterProfile && (
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">{tm("description")}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-primary/60 text-primary hover:bg-primary/10"
                  disabled={isSavingProfile}
                  onClick={() => {
                    const values = form.getValues();
                    onSaveMasterProfile(values);
                  }}
                >
                  {isSavingProfile
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tm("saving")}</>
                    : <><BookmarkCheck className="mr-2 h-4 w-4" /> {tm("button")}</>
                  }
                </Button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {c("calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {c("calculateScenario")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// JOB LOSS FORM
// ============================================================================

export function JobLossForm({
  onSubmit, isLoading, defaultValues,
}: { onSubmit: (data: JobLossFormValues) => void; isLoading: boolean; defaultValues?: Partial<JobLossFormValues> }) {
  const c = useTranslations("ScenarioCalculator.common");
  const t = useTranslations("ScenarioCalculator.forms.jobLoss");
  const form = useForm<JobLossFormValues>({
    resolver: zodResolver(jobLossSchema),
    defaultValues: {
      currentGrossSalary: 80000, 
      locationId: 261, // Zurich
      maritalStatus: "single",
      dependents: 0, age: 35, confession: "none", unemploymentDuration: 6,
      hasChildren: false, yearsEmployed: 5,
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="currentGrossSalary" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.currentGrossSalary")}</FormLabel>
                <FormControl><Input type="number" placeholder="80000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{c("municipality")}</FormLabel>
                   <LocationSearch
                    value={field.value}
                    onChange={(location) => field.onChange(location?.TaxLocationID)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="yearsEmployed" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.yearsEmployed")}</FormLabel>
                  <FormControl><Input type="number" min={0} max={50} {...field} /></FormControl>
                  <FormDescription>{t("descriptions.yearsEmployed")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unemploymentDuration" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.unemploymentDuration")}</FormLabel>
                  <FormControl><Input type="number" min={1} max={24} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("maritalStatus")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="single">{c("single")}</SelectItem>
                      <SelectItem value="married">{c("married")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("age")}</FormLabel>
                  <FormControl><Input type="number" min={18} max={99} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="hasChildren" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>{t("fields.hasChildren")}</FormLabel>
                  <FormDescription>{t("descriptions.hasChildren")}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {c("calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {c("calculateScenario")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CHILD BIRTH FORM
// ============================================================================

export function ChildBirthForm({
  onSubmit, isLoading, defaultValues,
}: { onSubmit: (data: ChildBirthFormValues) => void; isLoading: boolean; defaultValues?: Partial<ChildBirthFormValues> }) {
  const c = useTranslations("ScenarioCalculator.common");
  const t = useTranslations("ScenarioCalculator.forms.childBirth");
  const form = useForm<ChildBirthFormValues>({
    resolver: zodResolver(childBirthSchema),
    defaultValues: {
      currentGrossSalary: 80000, spouseSalary: 60000, 
      locationId: 261, // Zurich
      maritalStatus: "married", dependents: 0, age: 32, confession: "none",
      estimatedChildcareCosts: 15000,
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Baby className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="currentGrossSalary" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.currentGrossSalary")}</FormLabel>
                  <FormControl><Input type="number" placeholder="80000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="spouseSalary" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.spouseSalary")}</FormLabel>
                  <FormControl><Input type="number" placeholder="60000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{c("municipality")}</FormLabel>
                   <LocationSearch
                    value={field.value}
                    onChange={(location) => field.onChange(location?.TaxLocationID)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dependents" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.dependents")}</FormLabel>
                  <FormControl><Input type="number" min={0} max={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.age")}</FormLabel>
                  <FormControl><Input type="number" min={18} max={99} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="estimatedChildcareCosts" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.estimatedChildcareCosts")}</FormLabel>
                <FormControl><Input type="number" min={0} placeholder="15000" {...field} /></FormControl>
                <FormDescription>{t("descriptions.estimatedChildcareCosts")}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {c("calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {c("calculateScenario")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MARRIAGE FORM
// ============================================================================

export function MarriageForm({
  onSubmit, isLoading, defaultValues,
}: { onSubmit: (data: MarriageFormValues) => void; isLoading: boolean; defaultValues?: Partial<MarriageFormValues> }) {
  const c = useTranslations("ScenarioCalculator.common");
  const t = useTranslations("ScenarioCalculator.forms.marriage");
  const form = useForm<MarriageFormValues>({
    resolver: zodResolver(marriageSchema),
    defaultValues: {
      person1Salary: 80000, person1Age: 32,
      person2Salary: 70000, person2Age: 30,
      combinedDependents: 0,
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">{t("sections.person1")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="person1Salary" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c("salaryChf")}</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="person1Age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c("age")}</FormLabel>
                    <FormControl><Input type="number" min={18} max={99} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="person1LocationId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                      <FormLabel>{t("fields.person1LocationId")} <span className="text-destructive">*</span></FormLabel>
                      <LocationSearch value={field.value} onChange={(location) => field.onChange(location?.TaxLocationID)} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium text-sm">{t("sections.person2")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="person2Salary" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c("salaryChf")}</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="person2Age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{c("age")}</FormLabel>
                    <FormControl><Input type="number" min={18} max={99} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="person2LocationId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-2">
                      <FormLabel>{t("fields.person2LocationId")} <span className="text-destructive">*</span></FormLabel>
                      <LocationSearch value={field.value} onChange={(location) => field.onChange(location?.TaxLocationID)} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium text-sm">{t("sections.afterMarriage")}</h4>
              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="futureLocationId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t("fields.futureLocationId")} <span className="text-destructive">*</span></FormLabel>
                      <LocationSearch
                        value={field.value}
                        onChange={(location) => field.onChange(location?.TaxLocationID)}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="combinedDependents" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.combinedDependents")}</FormLabel>
                    <FormControl><Input type="number" min={0} max={10} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {c("calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {c("calculateScenario")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PILLAR 3A FORM
// ============================================================================

export function Pillar3aForm({
  onSubmit, isLoading, defaultValues,
}: { onSubmit: (data: Pillar3aFormValues) => void; isLoading: boolean; defaultValues?: Partial<Pillar3aFormValues> }) {
  const c = useTranslations("ScenarioCalculator.common");
  const t = useTranslations("ScenarioCalculator.forms.pillar3a");
  const form = useForm<Pillar3aFormValues>({
    resolver: zodResolver(pillar3aSchema),
    defaultValues: {
      currentGrossSalary: 80000, 
      locationId: 261, // Zurich
      maritalStatus: "single",
      dependents: 0, age: 35, confession: "none", contributionAmount: 7056,
      hasOccupationalPension: true,
      annualReturnRate: 5,
      projectionYears: 20,
      ...defaultValues,
    },
  });

  const hasOccupationalPension = form.watch("hasOccupationalPension");
  const maxContribution = hasOccupationalPension ? 7056 : 35280;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="currentGrossSalary" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.currentGrossSalary")}</FormLabel>
                <FormControl><Input type="number" placeholder="80000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="hasOccupationalPension" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>{t("fields.hasOccupationalPension")}</FormLabel>
                  <FormDescription>{t("descriptions.hasOccupationalPension", { amount: field.value ? "CHF 7,056" : "CHF 35,280" })}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="contributionAmount" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.contributionAmount")}</FormLabel>
                <FormControl><Input type="number" min={0} max={maxContribution} {...field} /></FormControl>
                <FormDescription>{t("descriptions.contributionAmount", { amount: formatCHF(maxContribution) })}</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="annualReturnRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.annualReturnRate")}</FormLabel>
                  <FormControl><Input type="number" min={0} max={20} step={0.1} {...field} /></FormControl>
                  <FormDescription>{t("descriptions.annualReturnRate")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="projectionYears" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.projectionYears")}</FormLabel>
                  <FormControl><Input type="number" min={20} max={50} {...field} /></FormControl>
                  <FormDescription>{t("descriptions.projectionYears")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{c("municipality")}</FormLabel>
                   <LocationSearch
                    value={field.value}
                    onChange={(location) => field.onChange(location?.TaxLocationID)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("maritalStatus")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="single">{c("single")}</SelectItem>
                      <SelectItem value="married">{c("married")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("age")}</FormLabel>
                  <FormControl><Input type="number" min={18} max={99} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {c("calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {t("buttons.submit")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PILLAR 2 BUYBACK FORM
// ============================================================================

export function Pillar2BuybackForm({
  onSubmit, isLoading, defaultValues,
}: { onSubmit: (data: Pillar2BuybackFormValues) => void; isLoading: boolean; defaultValues?: Partial<Pillar2BuybackFormValues> }) {
  const c = useTranslations("ScenarioCalculator.common");
  const t = useTranslations("ScenarioCalculator.forms.pillar2Buyback");
  const form = useForm<Pillar2BuybackFormValues>({
    resolver: zodResolver(pillar2BuybackSchema),
    defaultValues: {
      currentGrossSalary: 120000, 
      locationId: 261, // Zurich
      maritalStatus: "married",
      dependents: 0, age: 45, confession: "none", buybackAmount: 50000,
      currentPensionGap: 100000,
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="currentGrossSalary" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.currentGrossSalary")}</FormLabel>
                <FormControl><Input type="number" placeholder="120000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="currentPensionGap" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.currentPensionGap")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormDescription>{t("descriptions.currentPensionGap")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="buybackAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.buybackAmount")}</FormLabel>
                  <FormControl><Input type="number" min={1000} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{c("municipality")}</FormLabel>
                   <LocationSearch
                    value={field.value}
                    onChange={(location) => field.onChange(location?.TaxLocationID)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("maritalStatus")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="single">{c("single")}</SelectItem>
                      <SelectItem value="married">{c("married")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>{c("age")}</FormLabel>
                  <FormControl><Input type="number" min={25} max={65} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("alert.title")}</AlertTitle>
              <AlertDescription>
                {t("alert.description")}
              </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {c("calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {t("buttons.submit")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUPPLEMENTARY BENEFITS (EL) FORM
// ============================================================================

export function SupplementaryBenefitsForm({
  onSubmit, isLoading, defaultValues,
}: { onSubmit: (data: SupplementaryBenefitsFormValues) => void; isLoading: boolean; defaultValues?: Partial<SupplementaryBenefitsFormValues> }) {
  const t = useTranslations("ScenarioCalculator.supplementaryBenefits.form");
  const form = useForm<SupplementaryBenefitsFormValues>({
    resolver: zodResolver(supplementaryBenefitsSchema),
    defaultValues: {
      annualRetirementIncome: 28000,
      annualDisabilityIncome: 0,
      otherAnnualIncome: 0,
      annualHousingCosts: 18000,
      annualHealthInsurancePremium: 5400,
      netAssets: 20000,
      locationId: 261,
      maritalStatus: "single",
      dependents: 0,
      age: 67,
      receivesAiBenefits: false,
      isRetired: true,
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="annualRetirementIncome" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.annualRetirementIncome")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="annualDisabilityIncome" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.annualDisabilityIncome")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="otherAnnualIncome" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.otherAnnualIncome")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="annualHousingCosts" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.annualHousingCosts")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormDescription>{t("descriptions.annualHousingCosts")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="annualHealthInsurancePremium" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.annualHealthInsurancePremium")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormDescription>{t("descriptions.annualHealthInsurancePremium")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="netAssets" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.netAssets")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormDescription>{t("descriptions.netAssets")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("fields.municipality")}</FormLabel>
                  <LocationSearch
                    value={field.value}
                    onChange={(location) => field.onChange(location?.TaxLocationID)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.maritalStatus")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="single">{t("options.single")}</SelectItem>
                      <SelectItem value="married">{t("options.married")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dependents" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.dependents")}</FormLabel>
                  <FormControl><Input type="number" min={0} max={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.age")}</FormLabel>
                  <FormControl><Input type="number" min={18} max={99} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-4">
                <FormField control={form.control} name="isRetired" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>{t("fields.isRetired")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="receivesAiBenefits" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>{t("fields.receivesAiBenefits")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("buttons.calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {t("buttons.submit")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// VAT COMPARISON FORM
// ============================================================================

export function VATComparisonForm({
  onSubmit, isLoading,
}: { onSubmit: (data: VatComparisonFormValues) => void; isLoading: boolean }) {
  const t = useTranslations("ScenarioCalculator.forms.vatComparison");
  const c = useTranslations("ScenarioCalculator.common");
  const form = useForm<VatComparisonFormValues>({
    resolver: zodResolver(vatComparisonSchema),
    defaultValues: {
      ca: 200000,
      secteur: TDFN_SECTORS[0]?.branche ?? "",
      achats: 50000,
      depenses: 30000,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ca" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.ca")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="secteur" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.secteur")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TDFN_SECTORS.map((s) => (
                        <SelectItem key={s.branche} value={s.branche}>{s.branche}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="achats" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.achats")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="depenses" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.depenses")}</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {c("calculating")}</> : <><Calculator className="mr-2 h-4 w-4" /> {t("buttons.submit")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
