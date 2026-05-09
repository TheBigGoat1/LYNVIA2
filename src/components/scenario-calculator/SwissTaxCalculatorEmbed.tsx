'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EMBED_SRC = 'https://swisstaxcalculator.vercel.app/';

/**
 * Official-style Swiss income/tax reference UI (embedded third-party calculator).
 * Lynvia scenario deltas and saved baselines remain in the forms below this panel.
 */
export function SwissTaxCalculatorEmbed() {
  const t = useTranslations('ScenarioCalculator.embed');
  const locale = useLocale();

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-[16/11] w-full min-h-[520px] bg-muted">
          <iframe
            title={t('iframeTitle')}
            src={EMBED_SRC}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="clipboard-read; clipboard-write"
            lang={locale}
          />
        </div>
        <p className="border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{t('disclaimer')}</p>
      </CardContent>
    </Card>
  );
}
