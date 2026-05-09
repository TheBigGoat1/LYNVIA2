import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { FirebaseProvider } from '@/firebase/firebase-provider';
import { LocaleChrome } from '@/components/locale-chrome';

const locales = ['en', 'de', 'fr', 'es', 'it'];

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) {
    notFound();
  }
  
  // Enable static rendering
  unstable_setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LocaleChrome>
          <FirebaseProvider>
            {children}
          </FirebaseProvider>
        </LocaleChrome>
        <Toaster />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
