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
import { useState, useEffect } from 'react';
import { Loader2, Building2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { swissCantons } from '@/lib/constants';
import { CLA_RULES, resolveClaForIndustry } from '@/lib/cla-rules';
import { auth } from '@/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import { useTranslations } from 'next-intl';

type AccountingFirm = {
  id: string;
  name: string;
};

interface CreateBusinessFormProps {
  onClose: () => void;
}

export function CreateBusinessForm({ onClose }: CreateBusinessFormProps) {
  const t = useTranslations('CreateBusinessForm');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [cantons, setCantons] = useState<{ value: string, label: string }[]>([]);
  const [cantonsLoading, setCantonsLoading] = useState(true);
  const [accountingFirms, setAccountingFirms] = useState<AccountingFirm[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(true);

  const createBusinessSchema = z.object({
    companyName: z.string().min(1, () => t('errors.companyNameRequired')),
    firstName: z.string().min(1, () => t('errors.firstNameRequired')),
    lastName: z.string().min(1, () => t('errors.lastNameRequired')),
    email: z.string().email(() => t('errors.invalidEmail')),
    password: z.string().min(8, () => t('errors.passwordMinLength')),
    phone: z.string().min(1, () => t('errors.phoneRequired')),
    canton: z.string({ required_error: t('errors.cantonRequired') }),
    industry: z.string({ required_error: t('errors.industryRequired') }),
    accountingFirmId: z.string().optional(),
  });

  type CreateBusinessFormValues = z.infer<typeof createBusinessSchema>;

  const form = useForm<CreateBusinessFormValues>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      companyName: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      canton: undefined,
      industry: undefined,
      accountingFirmId: undefined,
    },
  });

  const industry = form.watch('industry');
  const claResolution = industry ? resolveClaForIndustry(industry) : null;
  const selectedCla = claResolution?.cla ?? null;
  const industryOptions = Array.from(
    new Set(CLA_RULES.flatMap((rule) => rule.industries.map((entry) => entry.trim())).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  useEffect(() => {
    const fetchCantons = async () => {
      setCantonsLoading(true);
      try {
        const res = await fetch('/api/cantons');
        const data = await res.json();
        setCantons(data);
      } catch (e) {
        setCantons(swissCantons);
      } finally {
        setCantonsLoading(false);
      }
    }
    fetchCantons();
  }, []);

  useEffect(() => {
    const fetchFirms = async () => {
      setFirmsLoading(true);
      try {
        const q = query(collection(firestore, 'companies'), where('type', '==', 'accounting_firm'));
        const snapshot = await getDocs(q);
        setAccountingFirms(snapshot.docs.map(d => ({ id: d.id, name: d.data().companyName || d.id })));
      } catch (e) {
        setAccountingFirms([]);
      } finally {
        setFirmsLoading(false);
      }
    };
    fetchFirms();
  }, []);

  const handleCreateBusiness = async (values: CreateBusinessFormValues) => {
    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error(t('errors.notLoggedIn'));
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/admin/create-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: 'business',
          companyName: values.companyName,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          password: values.password,
          phone: values.phone,
          canton: values.canton,
          industry: values.industry,
          accountingFirmId: values.accountingFirmId || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || t('errors.createFailed'));
      }

      toast({
        title: t('toast.created.title'),
        description: t('toast.created.description'),
      });

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('toast.failed.title'),
        description: error.message || t('errors.unableToCreate'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="w-[min(96vw,1100px)] max-w-5xl overflow-hidden border bg-background p-0 shadow-2xl">
      <DialogHeader className="border-b bg-muted/30 px-6 py-5 sm:px-8">
        <DialogTitle className="text-2xl font-semibold tracking-tight">{t('title')}</DialogTitle>
        <DialogDescription className="max-w-3xl text-sm text-muted-foreground">
          {t('description')}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleCreateBusiness)} className="flex max-h-[80vh] flex-col">
          <div className="overflow-y-auto px-6 py-6 sm:px-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <div className="space-y-6">
                <section className="rounded-xl border bg-card p-5 sm:p-6">
                  <div className="mb-5 space-y-1">
                    <h3 className="text-base font-semibold">{t('businessProfile.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('businessProfile.description')}
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>{t('labels.companyName')}</FormLabel>
                        <FormControl><Input placeholder={t('placeholders.companyName')} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('labels.industry')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('placeholders.industry')}
                              list="industry-suggestions"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <datalist id="industry-suggestions">
                            {industryOptions.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="canton"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('labels.canton')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={cantonsLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={cantonsLoading ? t('placeholders.cantonLoading') : t('placeholders.canton')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cantons.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
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
                      name="accountingFirmId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            {t('labels.accountingFirm')} <span className="text-muted-foreground">{t('labels.optional')}</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={firmsLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={firmsLoading ? t('placeholders.firmsLoading') : t('placeholders.firm')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accountingFirms.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <section className="rounded-xl border bg-card p-5 sm:p-6">
                  <div className="mb-5 space-y-1">
                    <h3 className="text-base font-semibold">{t('adminOwner.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('adminOwner.description')}
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('labels.adminFirstName')}</FormLabel>
                        <FormControl><Input placeholder={t('placeholders.adminFirstName')} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('labels.adminLastName')}</FormLabel>
                        <FormControl><Input placeholder={t('placeholders.adminLastName')} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('labels.adminEmail')}</FormLabel>
                        <FormControl><Input type="email" placeholder={t('placeholders.adminEmail')} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('labels.phoneNumber')}</FormLabel>
                        <FormControl><Input placeholder={t('placeholders.phone')} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>{t('labels.password')}</FormLabel>
                        <FormControl><Input type="password" placeholder={t('placeholders.password')} {...field} /></FormControl>
                        <p className="text-xs text-muted-foreground">
                          {t('hints.password')}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </section>
              </div>

              <aside className="space-y-6 xl:sticky xl:top-0 xl:self-start">
                <section className="rounded-xl border bg-muted/25 p-5 sm:p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="rounded-lg border bg-background p-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{t('creationChecklist.title')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('creationChecklist.description')}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="rounded-lg border bg-background px-3 py-2">
                      {t('creationChecklist.item1')}
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-2">
                      {t('creationChecklist.item2')}
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-2">
                      {t('creationChecklist.item3')}
                    </div>
                  </div>
                </section>

                {selectedCla && (
                  <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{t('claResolution.title')}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('claResolution.description')}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          claResolution?.matchType === 'exact'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : claResolution?.matchType === 'contains'
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-red-300 bg-red-50 text-red-800'
                        }
                      >
                        {claResolution?.matchType === 'exact' ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" />{t('claResolution.exactMatch')}</>
                        ) : claResolution?.matchType === 'contains' ? (
                          <><AlertTriangle className="mr-1 h-3 w-3" />{t('claResolution.partialMatch')}</>
                        ) : (
                          <><Info className="mr-1 h-3 w-3" />{t('claResolution.coFallback')}</>
                        )}
                      </Badge>
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-semibold">{selectedCla.name}</p>
                      {selectedCla.minimumMonthlyWage > 0 ? (
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-xs text-muted-foreground">{t('claResolution.minWage')}</span>
                          <span className="text-lg font-semibold text-foreground">
                            CHF {selectedCla.minimumMonthlyWage.toLocaleString('fr-CH')}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t('claResolution.noCctMinimum')}
                        </p>
                      )}
                    </div>

                    {claResolution?.matchedAlias && claResolution.matchType !== 'exact' && (
                      <p className="text-xs text-muted-foreground">
                        {t('claResolution.matchedKeyword')} <span className="font-medium text-foreground">{claResolution.matchedAlias}</span>
                      </p>
                    )}
                    {claResolution?.matchType === 'exact' && (
                      <p className="flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {t('claResolution.exactDescription')}
                      </p>
                    )}
                    {claResolution?.matchType === 'contains' && (
                      <p className="flex items-center gap-2 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        {t('claResolution.partialDescription')}
                      </p>
                    )}
                    {claResolution?.matchType === 'fallback' && (
                      <p className="flex items-center gap-2 text-xs text-red-700">
                        <Info className="h-3.5 w-3.5 flex-shrink-0" />
                        {t('claResolution.fallbackDescription')}
                      </p>
                    )}
                  </section>
                )}
              </aside>
            </div>
          </div>

          <DialogFooter className="border-t bg-background px-6 py-4 sm:px-8">
            <DialogClose asChild>
              <Button type="button" variant="ghost">{t('buttons.cancel')}</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="min-w-36">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? t('buttons.creating') : t('buttons.createBusiness')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
