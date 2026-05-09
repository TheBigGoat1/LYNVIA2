'use client';

import { useState } from 'react';
import ScenarioCalculator from '@/components/scenario-calculator/ScenarioCalculator';
import { SwissTaxMasterCalculator } from '@/components/scenario-calculator/SwissTaxMasterCalculator';
import { useTranslations } from 'next-intl';
import type { IncomeChangeFormValues } from '@/lib/scenario-calculator/schemas';

export default function ScenarioCalculatorPage() {
  const t = useTranslations('ScenarioCalculator');
  const [baselineSeed, setBaselineSeed] = useState<Partial<IncomeChangeFormValues> | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>
      <SwissTaxMasterCalculator onBaselineSaved={setBaselineSeed} />
      <ScenarioCalculator hideVatTab baselineSeed={baselineSeed} />
    </div>
  );
}
