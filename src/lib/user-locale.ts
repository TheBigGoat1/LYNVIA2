import { locales } from '@/i18n';

export type AppLocale = (typeof locales)[number];

export function normalizeBrowserLanguage(browserLang: string | undefined | null): AppLocale {
  if (!browserLang) return 'en';
  const base = browserLang.toLowerCase().split('-')[0];
  if ((locales as readonly string[]).includes(base)) {
    return base as AppLocale;
  }
  return 'en';
}

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return Boolean(value && (locales as readonly string[]).includes(value));
}
