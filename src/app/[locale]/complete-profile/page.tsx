'use client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase/firebase-provider';
import { firestore } from '@/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { CLA_RULES } from '@/lib/cla-rules';
import { resolveClaForBusiness } from '@/lib/business/cct-resolution';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { authErrorMessage } from '@/lib/toast-messages';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CantonSearch } from '@/components/ui/canton-search';


const validationErrors = {
  companyName: 'Company name is required.',
  directorFirstName: "Director's first name is required.",
  directorLastName: "Director's last name is required.",
  address: 'Address is required.',
  postalCode: 'Postal code must be at least 4 digits.',
  city: 'City is required.',
  canton: 'Canton is required.',
  industry: 'Field of work is required.',
  required: 'Please answer this question.',
  cheNumber: 'CHE number is required when registered.',
  vatMethod: 'Please select a VAT method.',
  withholdingTax: 'Please answer the withholding tax question.',
};

const profileSchema = z.object({
  companyName: z.string().min(1, validationErrors.companyName),
  directorFirstName: z.string().min(1, validationErrors.directorFirstName),
  directorLastName: z.string().min(1, validationErrors.directorLastName),
  address: z.string().min(1, validationErrors.address),
  postalCode: z.string().min(4, validationErrors.postalCode),
  city: z.string().min(1, validationErrors.city),
  canton: z.string().min(1, validationErrors.canton),
  industry: z.string().min(1, validationErrors.industry),
  commercialRegisterRegistered: z.enum(['yes', 'no'], { required_error: validationErrors.required }),
  cheNumber: z.string().optional(),
  submittedToVAT: z.enum(['yes', 'no'], { required_error: validationErrors.required }),
  vatMethod: z.enum(['effective', 'tdfn']).optional(),
  vatNumber: z.string().optional(),
  hasEmployees: z.enum(['yes', 'no'], { required_error: validationErrors.required }),
  employeeInsurances: z.array(z.string()).optional(),
  hasWithholdingTaxEmployees: z.enum(['yes', 'no']).optional(),
}).superRefine((data, ctx) => {
  if (data.commercialRegisterRegistered === 'yes' && !data.cheNumber?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationErrors.cheNumber, path: ['cheNumber'] });
  }
  if (data.submittedToVAT === 'yes' && !data.vatMethod) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationErrors.vatMethod, path: ['vatMethod'] });
  }
  if (data.hasEmployees === 'yes' && !data.hasWithholdingTaxEmployees) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: validationErrors.withholdingTax, path: ['hasWithholdingTaxEmployees'] });
  }
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const INSURANCE_OPTIONS = [
  { id: 'accident', labelKey: 'insurances.accident' },
  { id: 'sickness_leave', labelKey: 'insurances.sickness' },
  { id: 'lpp', labelKey: 'insurances.lpp' },
] as const;

export default function CompleteProfilePage() {
    const { user, userRole, loading: authLoading } = useFirebase();
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();
    const t = useTranslations('CompleteProfile');

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            companyName: '',
            directorFirstName: '',
            directorLastName: '',
            address: '',
            postalCode: '',
            city: '',
            canton: '',
            industry: '',
            commercialRegisterRegistered: undefined,
            cheNumber: '',
            submittedToVAT: undefined,
            vatMethod: undefined,
            vatNumber: '',
            hasEmployees: undefined,
            employeeInsurances: [],
            hasWithholdingTaxEmployees: undefined,
        }
    });

    const industry = form.watch('industry');
    const cantonWatch = form.watch('canton');
    const commercialRegisterRegistered = form.watch('commercialRegisterRegistered');
    const submittedToVAT = form.watch('submittedToVAT');
    const hasEmployees = form.watch('hasEmployees');

    const claResolution = industry ? resolveClaForBusiness(industry, cantonWatch) : null;
    const selectedCla = claResolution?.cla ?? null;
    const industryOptions = Array.from(
        new Set(CLA_RULES.flatMap((r) => r.industries.map((e) => e.trim())).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'fr'));

    useEffect(() => {
        if (!user) return;
        const fetchCompanyData = async () => {
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().companyId) {
                const cid = userDoc.data().companyId;
                setCompanyId(cid);
                const companyDoc = await getDoc(doc(firestore, 'companies', cid));
                if (companyDoc.exists()) {
                    const data = companyDoc.data();
                    const boolToYesNo = (val: unknown): 'yes' | 'no' | undefined =>
                        val === true ? 'yes' : val === false ? 'no' : undefined;
                    form.reset({
                        companyName: data.companyName || '',
                        directorFirstName: data.directorFirstName || '',
                        directorLastName: data.directorLastName || '',
                        address: data.address || '',
                        postalCode: data.postalCode || '',
                        city: data.city || '',
                        canton: data.canton || '',
                        industry: data.industry || '',
                        commercialRegisterRegistered: boolToYesNo(data.commercialRegisterRegistered),
                        cheNumber: data.cheNumber || '',
                        submittedToVAT: boolToYesNo(data.submittedToVAT),
                        vatMethod: data.vatMethod || undefined,
                        vatNumber: data.vatNumber || '',
                        hasEmployees: boolToYesNo(data.hasEmployees),
                        employeeInsurances: Array.isArray(data.employeeInsurances)
                            ? data.employeeInsurances.filter((i: string) => i !== 'avs')
                            : [],
                        hasWithholdingTaxEmployees: boolToYesNo(data.hasWithholdingTaxEmployees),
                    });
                }
            }
            setIsDataLoading(false);
        };
        fetchCompanyData();
    }, [user, form]);
    
    const onSubmit = async (values: ProfileFormValues) => {
        if (!user || !companyId) return;
        setIsLoading(true);
        try {
            const companyDocRef = doc(firestore, 'companies', companyId);
            const submitClaResolution = values.industry ? resolveClaForBusiness(values.industry, values.canton) : null;
            const submitCla = submitClaResolution?.cla ?? null;

            const insurances = values.hasEmployees === 'yes'
                ? Array.from(new Set([...(values.employeeInsurances ?? []), 'avs']))
                : [];

            const vatFrequency = values.submittedToVAT === 'yes'
                ? (values.vatMethod === 'effective' ? 'quarterly' : 'biannual')
                : null;

            await updateDoc(companyDocRef, {
                companyName: values.companyName,
                directorFirstName: values.directorFirstName,
                directorLastName: values.directorLastName,
                address: values.address,
                postalCode: values.postalCode,
                city: values.city,
                canton: values.canton,
                industry: values.industry,
                commercialRegisterRegistered: values.commercialRegisterRegistered === 'yes',
                cheNumber: values.commercialRegisterRegistered === 'yes' ? (values.cheNumber ?? '') : null,
                submittedToVAT: values.submittedToVAT === 'yes',
                vatMethod: values.submittedToVAT === 'yes' ? (values.vatMethod ?? null) : null,
                vatFrequency,
                vatNumber: values.submittedToVAT === 'yes' ? (values.vatNumber ?? '') : null,
                hasEmployees: values.hasEmployees === 'yes',
                employeeInsurances: insurances,
                hasWithholdingTaxEmployees: values.hasEmployees === 'yes'
                    ? values.hasWithholdingTaxEmployees === 'yes'
                    : null,
                cla: submitCla ? {
                    id: submitCla.id,
                    name: submitCla.name,
                    minimumMonthlyWage: submitCla.minimumMonthlyWage,
                    cctUrl: submitCla.cctUrl,
                } : null,
                claSelectionMeta: submitClaResolution ? {
                    matchType: submitClaResolution.matchType,
                    matchedAlias: submitClaResolution.matchedAlias,
                    sourceField: 'industry+canton',
                    sourceValue: values.industry,
                    canton: submitClaResolution.canton,
                    cantonOverrideApplied: submitClaResolution.cantonOverrideApplied,
                } : null,
                profileCompleted: true,
                updatedAt: new Date(),
            });

            toast({
              variant: 'success',
              title: t('toast.successTitle'),
              description: t('toast.successDescription'),
            });
            
            if (userRole === 'business') {
                router.push('/business/dashboard');
            } else if (userRole === 'accounting_firm') {
                router.push('/accounting-firm/dashboard');
            } else {
                router.replace('/?onboarding=complete');
            }

        } catch (error: unknown) {
            toast({
              variant: 'destructive',
              title: t('toast.errorTitle'),
              description: authErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (authLoading || isDataLoading) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-[var(--swiss-mineral-cream)] dark:bg-background">
            <div className="flex flex-col items-center gap-5">
              <BrandWordmark layout="stacked" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('loading')}</span>
              </div>
            </div>
          </div>
        );
    }

    return (
        <Card className="w-full max-w-2xl border-border shadow-sm">
            <CardHeader className="space-y-4">
                <BrandWordmark layout="inline" className="justify-center sm:justify-start" />
                <div>
                  <CardTitle>{t('title')}</CardTitle>
                  <CardDescription>{t('description')}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                        {/* Company name */}
                        <FormField control={form.control} name="companyName" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('labels.companyName')}</FormLabel>
                                <FormControl><Input placeholder={t('placeholders.companyName')} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Director name */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="directorFirstName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('labels.directorFirstName')}</FormLabel>
                                    <FormControl><Input placeholder={t('placeholders.directorFirstName')} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="directorLastName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('labels.directorLastName')}</FormLabel>
                                    <FormControl><Input placeholder={t('placeholders.directorLastName')} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Address */}
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('labels.address')}</FormLabel>
                                <FormControl><Input placeholder={t('placeholders.address')} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* ZIP / City */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="postalCode" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('labels.postalCode')}</FormLabel>
                                    <FormControl><Input placeholder={t('placeholders.postalCode')} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('labels.city')}</FormLabel>
                                    <FormControl><Input placeholder={t('placeholders.city')} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Canton */}
                        <FormField control={form.control} name="canton" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('labels.canton')}</FormLabel>
                                <FormControl>
                                    <CantonSearch value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Field of work / Industry */}
                        <FormField control={form.control} name="industry" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('labels.industry')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t('placeholders.industry')}
                                        list="profile-industry-options"
                                        {...field}
                                    />
                                </FormControl>
                                <datalist id="profile-industry-options">
                                    {industryOptions.map((opt) => (
                                        <option key={opt} value={opt} />
                                    ))}
                                </datalist>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* CCT auto-detection result */}
                        {selectedCla && (
                            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <p className="text-sm font-semibold truncate">{selectedCla.name}</p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={
                                            claResolution?.matchType === 'exact'
                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 flex-shrink-0'
                                                : claResolution?.matchType === 'contains'
                                                ? 'border-amber-300 bg-amber-50 text-amber-800 flex-shrink-0'
                                                : 'border-red-300 bg-red-50 text-red-800 flex-shrink-0'
                                        }
                                    >
                                        {claResolution?.matchType === 'exact' ? (
                                            <><CheckCircle2 className="h-3 w-3 mr-1" />{t('cla.exactMatch')}</>
                                        ) : claResolution?.matchType === 'contains' ? (
                                            <><AlertTriangle className="h-3 w-3 mr-1" />{t('cla.partialMatch')}</>
                                        ) : (
                                            <><Info className="h-3 w-3 mr-1" />{t('cla.coFallback')}</>
                                        )}
                                    </Badge>
                                </div>
                                {selectedCla.minimumMonthlyWage > 0 ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs text-muted-foreground">{t('cla.minMonthlyWage')}</span>
                                        <span className="text-sm font-bold text-foreground">
                                            CHF {selectedCla.minimumMonthlyWage.toLocaleString('fr-CH')}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{t('cla.perMonth')}</span>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">{t('cla.noMinimum')}</p>
                                )}
                                {claResolution?.matchedAlias && claResolution.matchType !== 'exact' && (
                                    <p className="text-xs text-muted-foreground">
                                        {t('cla.matchedOnKeyword')} <span className="font-medium">{claResolution.matchedAlias}</span>
                                    </p>
                                )}
                                {claResolution?.matchType === 'exact' && (
                                    <p className="text-xs text-emerald-700 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                        {t('cla.exactMatchDesc')}
                                    </p>
                                )}
                                {claResolution?.matchType === 'contains' && (
                                    <p className="text-xs text-amber-700 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                        {t('cla.partialMatchDesc')}
                                    </p>
                                )}
                                {claResolution?.matchType === 'fallback' && (
                                    <p className="text-xs text-red-700 flex items-center gap-1">
                                        <Info className="h-3 w-3 flex-shrink-0" />
                                        {t('cla.coFallbackDesc')}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ── Commercial Register ── */}
                        <div className="pt-1 border-t">
                            <p className="text-sm font-semibold text-foreground mb-3">{t('sections.commercialRegister')}</p>

                            <FormField control={form.control} name="commercialRegisterRegistered" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('labels.commercialRegister')}</FormLabel>
                                    <FormControl>
                                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6 mt-1">
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="yes" id="cr-yes" />
                                                <Label htmlFor="cr-yes">{t('options.yes')}</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="no" id="cr-no" />
                                                <Label htmlFor="cr-no">{t('options.no')}</Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {commercialRegisterRegistered === 'yes' && (
                                <FormField control={form.control} name="cheNumber" render={({ field }) => (
                                    <FormItem className="mt-3">
                                        <FormLabel>{t('labels.cheNumber')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('placeholders.cheNumber')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                        </div>

                        {/* ── VAT ── */}
                        <div className="pt-1 border-t">
                            <p className="text-sm font-semibold text-foreground mb-3">{t('sections.vat')}</p>

                            <FormField control={form.control} name="submittedToVAT" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('labels.submittedToVAT')}</FormLabel>
                                    <FormControl>
                                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6 mt-1">
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="yes" id="vat-yes" />
                                                <Label htmlFor="vat-yes">{t('options.yes')}</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="no" id="vat-no" />
                                                <Label htmlFor="vat-no">{t('options.no')}</Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {submittedToVAT === 'yes' && (
                                <div className="mt-3 space-y-3">
                                    <FormField control={form.control} name="vatMethod" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('labels.vatMethod')}</FormLabel>
                                            <FormControl>
                                                <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-2 mt-1">
                                                    <div className="flex items-start gap-2">
                                                        <RadioGroupItem value="effective" id="vat-effective" className="mt-0.5" />
                                                        <div>
                                                            <Label htmlFor="vat-effective" className="cursor-pointer">{t('options.vatMethodEffective')}</Label>
                                                            <p className="text-xs text-muted-foreground">{t('options.vatMethodEffectiveDesc')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <RadioGroupItem value="tdfn" id="vat-tdfn" className="mt-0.5" />
                                                        <div>
                                                            <Label htmlFor="vat-tdfn" className="cursor-pointer">{t('options.vatMethodTdfn')}</Label>
                                                            <p className="text-xs text-muted-foreground">{t('options.vatMethodTdfnDesc')}</p>
                                                        </div>
                                                    </div>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="vatNumber" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('labels.vatNumber')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('placeholders.vatNumber')} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            )}
                        </div>

                        {/* ── Employees ── */}
                        <div className="pt-1 border-t">
                            <p className="text-sm font-semibold text-foreground mb-3">{t('sections.employees')}</p>

                            <FormField control={form.control} name="hasEmployees" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('labels.hasEmployees')}</FormLabel>
                                    <FormControl>
                                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6 mt-1">
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="yes" id="emp-yes" />
                                                <Label htmlFor="emp-yes">{t('options.yes')}</Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RadioGroupItem value="no" id="emp-no" />
                                                <Label htmlFor="emp-no">{t('options.no')}</Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {hasEmployees === 'yes' && (
                                <div className="mt-3 space-y-3">
                                    {/* Insurance checkboxes */}
                                    <FormField control={form.control} name="employeeInsurances" render={() => (
                                        <FormItem>
                                            <FormLabel>{t('labels.employeeInsurances')}</FormLabel>
                                            <div className="space-y-2 mt-1">
                                                {INSURANCE_OPTIONS.map((opt) => (
                                                    <FormField
                                                        key={opt.id}
                                                        control={form.control}
                                                        name="employeeInsurances"
                                                        render={({ field }) => {
                                                            const checked = field.value?.includes(opt.id) ?? false;
                                                            return (
                                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={checked}
                                                                            onCheckedChange={(c) => {
                                                                                const current = field.value ?? [];
                                                                                field.onChange(
                                                                                    c
                                                                                        ? [...current, opt.id]
                                                                                        : current.filter((v) => v !== opt.id)
                                                                                );
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal cursor-pointer">{t(opt.labelKey)}</FormLabel>
                                                                </FormItem>
                                                            );
                                                        }}
                                                    />
                                                ))}
                                                {/* AVS — always mandatory */}
                                                <div className="flex items-center gap-2">
                                                    <Checkbox checked disabled />
                                                    <Label className="font-normal text-muted-foreground">
                                                        {t('insurances.avs')}
                                                        <span className="ml-1 text-xs">({t('insurances.avsNote')})</span>
                                                    </Label>
                                                </div>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    {/* Withholding tax */}
                                    <FormField control={form.control} name="hasWithholdingTaxEmployees" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('labels.withholdingTax')}</FormLabel>
                                            <FormControl>
                                                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="yes" id="wt-yes" />
                                                        <Label htmlFor="wt-yes">{t('options.yes')}</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="no" id="wt-no" />
                                                        <Label htmlFor="wt-no">{t('options.no')}</Label>
                                                    </div>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? t('buttonSaving') : t('button')}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
