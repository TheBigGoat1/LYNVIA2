'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/navigation';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { auth } from '@/firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { authErrorMessage } from '@/lib/toast-messages';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

const schema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const t = useTranslations('ForgotPassword');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        variant: 'success',
        title: t('toastSuccessTitle'),
        description: t('toastSuccess'),
      });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: t('toastError'),
        description: authErrorMessage(e),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#1A1A1A] dark:text-foreground">
          {t('title')}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t('description')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('emailLabel')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      className="h-11 pl-10 bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors"
                      autoComplete="email"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                …
              </>
            ) : (
              t('submit')
            )}
          </Button>
        </form>
      </Form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToLogin')}
        </Link>
      </div>
    </div>
  );
}
