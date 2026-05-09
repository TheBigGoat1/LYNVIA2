"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "@/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { auth, firestore } from "@/firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { isAppLocale, type AppLocale } from "@/lib/user-locale";
import { INDIVIDUAL_ENTRY_ANIMATION_FLAG } from "@/components/individual/individual-entry-shell";
import { authErrorMessage } from "@/lib/toast-messages";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
  rememberMe: z.boolean().default(false).optional(),
});

function localeFromUserProfile(profile: unknown): AppLocale | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const lang = (profile as Record<string, unknown>).language;
  return typeof lang === "string" && isAppLocale(lang) ? lang : undefined;
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const activeLocale = useLocale();
  const t = useTranslations('Auth');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const userDocRef = doc(firestore, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;
        const preferredLocale = localeFromUserProfile(userData.profile) ?? (isAppLocale(activeLocale) ? activeLocale : undefined);
        const navOpts = preferredLocale ? { locale: preferredLocale } : undefined;

        if (role === 'business' || role === 'accounting_firm') {
            const companyId = userData.companyId;
            if (!companyId) {
                await auth.signOut();
                toast({ variant: "destructive", title: t('toast.loginFailedTitle'), description: "Your account is not configured correctly. Please contact support." });
                return;
            }

            const companyDocRef = doc(firestore, 'companies', companyId);
            const companyDoc = await getDoc(companyDocRef);

            if (!companyDoc.exists()) {
                await auth.signOut();
                toast({ variant: "destructive", title: t('toast.loginFailedTitle'), description: t('toast.userDataNotFound') });
                return;
            }

            const companyStatus = companyDoc.data().status;

            if (companyStatus === 'active') {
                if (userData.status !== 'active') {
                    await updateDoc(userDocRef, { status: 'active' });
                }
                toast({
                  variant: "success",
                  title: t('toast.loginSuccessTitle'),
                  description: t('toast.loginSuccessDescription'),
                });
                router.push(role === 'business' ? "/business/dashboard" : "/accounting-firm/dashboard", navOpts);
            } else if (companyStatus === 'pending_approval') {
                router.push('/pending-approval', navOpts);
            } else if (companyStatus === 'suspended') {
                await auth.signOut();
                toast({ variant: 'destructive', title: t('toast.accountSuspendedTitle'), description: t('toast.accountSuspendedDescription') });
            } else {
                 await auth.signOut();
                 toast({ variant: 'destructive', title: t('toast.loginFailedTitle'), description: 'Your company account has an unknown status. Please contact support.' });
            }
        } else {
            const userStatus = userData.status;
            if (userStatus === 'active') {
                 toast({
                   variant: "success",
                   title: t('toast.loginSuccessTitle'),
                   description: t('toast.loginSuccessDescription'),
                 });
                 if (role !== 'admin' && role !== 'business' && role !== 'accounting_firm') {
                   try {
                     sessionStorage.setItem(INDIVIDUAL_ENTRY_ANIMATION_FLAG, '1');
                   } catch {
                     /* ignore */
                   }
                 }
                 router.push(role === 'admin' ? "/admin/dashboard" : "/individual/dashboard", navOpts);
            } else if (userStatus === 'pending_approval') {
                router.push('/pending-approval', navOpts);
            } else if (userStatus === 'suspended') {
                 await auth.signOut();
                 toast({ variant: 'destructive', title: t('toast.accountSuspendedTitle'), description: t('toast.accountSuspendedDescription') });
            } else {
                await auth.signOut();
                toast({
                    variant: 'destructive',
                    title: `Account not active`,
                    description: `Your account status is: ${userStatus}. Please contact support if this is unexpected.`,
                });
            }
        }
      } else {
        await auth.signOut();
        toast({ variant: "destructive", title: t('toast.loginFailedTitle'), description: t('toast.userDataNotFound') });
      }
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: t('toast.loginFailedTitle'),
        description: authErrorMessage(error),
      });
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('loginTitle')}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t('loginDescription')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium">{t('emailLabel')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t('emailPlaceholder')}
                      className="h-11 border-border bg-card pl-10 shadow-sm transition-colors focus-visible:ring-primary"
                      autoComplete="email"
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
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <FormLabel className="text-sm font-medium">{t('passwordLabel')}</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-accent"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="h-11 border-border bg-card pl-10 pr-11 shadow-sm transition-colors focus-visible:ring-primary"
                      autoComplete="current-password"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
                      ) : (
                        <Eye className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  />
                </FormControl>
                <FormLabel className="cursor-pointer text-sm font-normal text-muted-foreground">
                  {t('rememberMe')}
                </FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" className="h-11 w-full font-medium" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                {t('loginButton')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
          <span className="bg-background px-3">New to Lynvia?</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t('signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}