export function resolveSwissLocale(locale: string): string {
  const normalized = locale.toLowerCase().split('-')[0];
  if (normalized === 'fr' || normalized === 'de' || normalized === 'it' || normalized === 'en') {
    return `${normalized}-CH`;
  }
  return 'en-CH';
}

export function fmtCHF(value: number, locale: string): string {
  return value.toLocaleString(resolveSwissLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPct(value: number, locale: string): string {
  const formatter = new Intl.NumberFormat(resolveSwissLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatter.format(value * 100)}%`;
}
