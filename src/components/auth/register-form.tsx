"use client";

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@/navigation';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { swissCantons } from '@/lib/constants';
import { normalizeBrowserLanguage } from '@/lib/user-locale';
import { auth, firestore } from '@/firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import { authErrorMessage } from '@/lib/toast-messages';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, User, Mail, Lock, Phone, MapPin, ArrowRight, Loader2 } from 'lucide-react';

const passwordValidation = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long.' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number.' });

const baseSchema = {
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: passwordValidation,
  phone: z.string().min(1, { message: 'Phone number is required.' }),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions.' }),
  }),
};

const individualSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  canton: z.string({ required_error: 'Please select a canton.' }),
  ...baseSchema,
});

const accountingFirmSchema = z.object({
  firmName: z.string().min(1, { message: 'Firm name is required.' }),
  primaryContactName: z
    .string()
    .min(1, { message: 'Contact name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: passwordValidation,
  phone: z.string().min(1, { message: 'Phone number is required.' }),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions.' }),
  }),
});

type FormType = 'individual' | 'accounting_firm';

const logSystemEvent = async (level: "INFO" | "WARN" | "ERROR" | "SECURITY", service: string, message: string, details: object = {}) => {
  try {
    await addDoc(collection(firestore, 'system_logs'), {
      timestamp: serverTimestamp(),
      level,
      service,
      message,
      ipAddress: '127.0.0.1',
      details,
    });
  } catch (error) {
    console.error("Failed to log system event:", error);
  }
};

const FormRenderer = ({ type }: { type: FormType }) => {
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations('Auth');
  const [cantons, setCantons] = useState<{ value: string, label: string }[]>([]);
  const [cantonsLoading, setCantonsLoading] = useState(true);

  const schema = {
    individual: individualSchema,
    accounting_firm: accountingFirmSchema,
  }[type];

  useEffect(() => {
    const fetchCantons = async () => {
      setCantonsLoading(true);
      try {
        const res = await fetch('/api/cantons');
        const data = await res.json();
        setCantons(data);
      } catch {
        setCantons(swissCantons);
        toast({
          variant: 'warning',
          title: t('cantonsLoadWarningTitle'),
          description: t('cantonsLoadWarningDescription'),
        });
      } finally {
        setCantonsLoading(false);
      }
    }
    fetchCantons();
  }, [t, toast]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues:
      type === 'accounting_firm'
        ? {
            firmName: '',
            primaryContactName: '',
            email: '',
            password: '',
            phone: '',
            terms: false,
          }
        : {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phone: '',
            canton: undefined,
            terms: false,
          },
  });

  async function onSubmit(values: any) {
    try {
      const browserLanguage =
        typeof navigator !== 'undefined' ? normalizeBrowserLanguage(navigator.language) : 'en';
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      let companyId: string | null = null;
      const status = 'active';

      if (type === 'accounting_firm') {
        const companyName = values.firmName;
        const contactName = values.primaryContactName;
        const companyStatus = 'active';
        const companyData = {
            companyName,
            adminUserId: user.uid,
            contactName,
            contactEmail: values.email,
            phone: values.phone,
            canton: null,
            status: companyStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            type,
            profileCompleted: false,
        };
        const companyDocRef = await addDoc(collection(firestore, "companies"), companyData);
        companyId = companyDocRef.id;

        if (!companyId) {
          throw new Error('Failed to create organization record.');
        }

        await logSystemEvent(
          'INFO',
          'Authentication',
          `New ${type} '${companyName}' registered with status '${companyStatus}'.`,
          { companyId, adminUserId: user.uid }
        );
      }

      let profileData: any;
      let userRole = type;
        if (type === 'accounting_firm') {
          const nameParts = values.primaryContactName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || '';
          profileData = {
              firstName,
              lastName,
              phone: values.phone,
            canton: null,
            language: browserLanguage,
          }
      } else {
          profileData = {
              firstName: values.firstName,
              lastName: values.lastName,
              phone: values.phone,
              canton: values.canton,
              language: browserLanguage,
          }
      }

      await setDoc(doc(firestore, "users", user.uid), {
        email: user.email,
        role: userRole,
        companyId: companyId,
        profile: profileData,
        createdAt: serverTimestamp(),
        status: status,
      });

      await logSystemEvent('INFO', 'Authentication', `New user registered: ${values.email}`, { userId: user.uid, role: userRole });

      toast({
        variant: 'success',
        title: t('toastRegister.successTitle'),
        description: t('toastRegister.successDescriptionActive'),
      });

      const localeOpts = { locale: browserLanguage };
      if (type === 'accounting_firm') {
        router.push('/accounting-firm/dashboard', localeOpts);
      } else {
        router.push('/individual/dashboard', localeOpts);
      }

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logSystemEvent('ERROR', 'Authentication', `User registration failed: ${msg}`, { email: values.email });
      toast({
        variant: 'destructive',
        title: t('toastRegister.failedTitle'),
        description: authErrorMessage(error),
      });
    }
  }

  const inputClassName = "h-9.5 bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors";
  const inputWithIconClassName = "pl-10 " + inputClassName;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
        {type === 'accounting_firm' ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <FormField
                control={form.control}
                name="firmName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">
                      {t('firmNameLabel')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('firmNamePlaceholder')}
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('primaryContactNameLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('primaryContactNamePlaceholder')}
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('emailLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('emailPlaceholder')}
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('phoneLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('phonePlaceholder')}
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:items-end">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('passwordLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      {t('passwordDescription')}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border/60 px-3 py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary mt-0.5"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-tight">
                      <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                        {t.rich('termsLabel', {
                          termsLink: () => (
                            <Link href="/terms-and-conditions" className="text-primary hover:underline underline-offset-2">
                              {t('termsLinkText')}
                            </Link>
                          )
                        })}
                      </FormLabel>
                      <FormMessage className="text-xs" />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('firstNameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('firstNamePlaceholder')}
                        className={inputClassName}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('lastNameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('lastNamePlaceholder')}
                        className={inputClassName}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('emailLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('emailPlaceholder')}
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('phoneLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('phonePlaceholder')}
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">{t('passwordLabel')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          className={inputWithIconClassName}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      {t('passwordDescription')}
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="canton"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">{t('cantonLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={cantonsLoading}>
                      <FormControl>
                        <SelectTrigger className={inputClassName}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={cantonsLoading ? "Loading..." : t('cantonPlaceholder')} />
                          </div>
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
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}

        {type === 'individual' ? (
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-0.5">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-primary mt-0.5"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                    {t.rich('termsLabel', {
                      termsLink: () => (
                        <Link href="/terms-and-conditions" className="text-primary hover:underline underline-offset-2">
                          {t('termsLinkText')}
                        </Link>
                      )
                    })}
                  </FormLabel>
                  <FormMessage className="text-xs" />
                </div>
              </FormItem>
            )}
          />
        ) : null}

        <Button
          type="submit"
          className="mt-1.5 h-10.5 w-full font-medium transition-all duration-200 hover:shadow-md"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('creatingAccountButton')}
            </>
          ) : (
            <>
              {t('createAccountButton')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export function RegisterForm() {
  const [isClient, setIsClient] = useState(false);
  const t = useTranslations('Auth');

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="w-full space-y-2.5">
      {/* Header */}
      <div className="space-y-1 text-center">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          {t('registerTitle')}
        </h1>
        <p className="hidden text-sm text-muted-foreground min-[860px]:block">
          {t('registerDescription')}
        </p>
      </div>

      {/* Tabs & Forms */}
      {isClient ? (
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid h-11 w-full grid-cols-2 gap-1 rounded-full border border-[var(--swiss-alpine-slate)]/12 bg-[color:color-mix(in_srgb,var(--swiss-mineral-cream)_88%,var(--swiss-alpine-slate)_12%)] p-1 dark:border-white/12 dark:bg-muted/50">
            <TabsTrigger
              value="individual"
              className="rounded-full text-sm font-medium text-foreground transition-colors data-[state=active]:bg-[var(--swiss-alpine-slate)] data-[state=active]:text-white dark:data-[state=active]:bg-[var(--swiss-mineral-cream)] dark:data-[state=active]:text-[var(--swiss-alpine-slate)]"
            >
              <User className="mr-2 h-4 w-4" />
              {t('individualTab')}
            </TabsTrigger>
            <TabsTrigger
              value="accounting_firm"
              className="rounded-full text-sm font-medium text-foreground transition-colors data-[state=active]:bg-[var(--swiss-alpine-slate)] data-[state=active]:text-white dark:data-[state=active]:bg-[var(--swiss-mineral-cream)] dark:data-[state=active]:text-[var(--swiss-alpine-slate)]"
            >
              <Building2 className="mr-2 h-4 w-4" />
              {t('accountingFirmTab')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="individual" className="pt-3 focus-visible:outline-none focus-visible:ring-0">
            <FormRenderer type="individual" />
          </TabsContent>
          <TabsContent value="accounting_firm" className="pt-3 focus-visible:outline-none focus-visible:ring-0">
            <FormRenderer type="accounting_firm" />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <div className="h-12 w-full animate-pulse bg-muted rounded-lg" />
          <div className="h-[400px] w-full animate-pulse bg-muted/50 rounded-lg" />
        </div>
      )}

      <div className="text-center pb-0.5 pt-1">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline underline-offset-4 transition-colors"
          >
            {t('loginTitle')}
          </Link>
        </p>
      </div>
    </div>
  );
}
