import { resolveSwissLocale } from '@/lib/format';

export function displayCurrency(amount: number, locale = 'de'): string {
  const formatter = new Intl.NumberFormat(resolveSwissLocale(locale), {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return formatter.format(amount);
}

export function displayCurrencyShort(amount: number, locale = 'de'): string {
    const formatter = new Intl.NumberFormat(resolveSwissLocale(locale), {
        style: 'currency',
        currency: 'CHF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    return formatter.format(amount).replace(/\s*CHF/g, '').trim();
}
