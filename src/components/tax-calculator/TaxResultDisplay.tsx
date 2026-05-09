
'use client';

import React from 'react';
import { TaxResult } from '@/lib/taxes/typesClient';
import { displayCurrencyShort } from '@/lib/utils/format';
import { Separator } from '@/components/ui/separator';

interface TaxResultDisplayProps {
  taxes: TaxResult;
}

const ProgressBar: React.FC<{ value: number; total: number }> = ({ value, total }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="col-span-2 mt-2 bg-muted h-1.5 rounded-full">
      <div
        className="h-1.5 bg-primary rounded-full"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const TaxResultDisplay: React.FC<TaxResultDisplayProps> = ({ taxes }) => {
  if (!taxes) return null;
  
  return (
    <div className="max-w-md">
      <h3 className="text-lg leading-7 font-semibold">Tax Calculation Result</h3>
      <div className="grid grid-cols-2 text-sm mt-4 gap-y-1">
        {/* Taxes canton */}
        <div className="font-medium">Cantonal Tax</div>
        <div className="font-medium text-right">
          {displayCurrencyShort(taxes.taxesIncomeCanton + taxes.taxesFortuneCanton)}
        </div>

        <div className="text-muted-foreground">Income Tax</div>
        <div className="text-sm text-right text-muted-foreground">
          {displayCurrencyShort(taxes.taxesIncomeCanton)}
        </div>

        <div className="text-muted-foreground">Wealth Tax</div>
        <div className="text-right text-muted-foreground">
          {displayCurrencyShort(taxes.taxesFortuneCanton)}
        </div>
        <ProgressBar
          value={taxes.taxesIncomeCanton + taxes.taxesFortuneCanton}
          total={taxes.taxesTotal}
        />

        {/* Taxes city */}
        <div className="col-span-2 mt-4"></div>
        <div className="font-medium">Municipal Tax</div>
        <div className="font-medium text-right">
          {displayCurrencyShort(taxes.taxesIncomeCity + taxes.taxesFortuneCity)}
        </div>

        <div className="text-muted-foreground">Income Tax</div>
        <div className="text-sm text-right text-muted-foreground">
          {displayCurrencyShort(taxes.taxesIncomeCity)}
        </div>

        <div className="text-muted-foreground">Wealth Tax</div>
        <div className="text-right text-muted-foreground">
          {displayCurrencyShort(taxes.taxesFortuneCity)}
        </div>
        <ProgressBar
          value={taxes.taxesIncomeCity + taxes.taxesFortuneCity}
          total={taxes.taxesTotal}
        />

        {/* Taxes Church */}
        <div className="col-span-2 mt-4"></div>
        <div className="font-medium">Church Tax</div>
        <div className="font-medium text-right">
          {displayCurrencyShort(taxes.taxesIncomeChurch + taxes.taxesFortuneChurch)}
        </div>

        <div className="text-muted-foreground">Income Tax</div>
        <div className="text-sm text-right text-muted-foreground">
          {displayCurrencyShort(taxes.taxesIncomeChurch)}
        </div>

        <div className="text-muted-foreground">Wealth Tax</div>
        <div className="text-right text-muted-foreground">
          {displayCurrencyShort(taxes.taxesFortuneChurch)}
        </div>
        <ProgressBar
          value={taxes.taxesIncomeChurch + taxes.taxesFortuneChurch}
          total={taxes.taxesTotal}
        />

        {/* Taxes personnel */}
        <div className="col-span-2 mt-4"></div>
        <div className="font-medium">Personal Tax</div>
        <div className="font-medium text-right">
          {displayCurrencyShort(taxes.taxesPersonnel)}
        </div>
        <ProgressBar value={taxes.taxesPersonnel} total={taxes.taxesTotal} />

        {/* Taxes Bund */}
        <div className="col-span-2 mt-4"></div>
        <div className="font-medium">Direct Federal Tax</div>
        <div className="font-medium text-right">
          {displayCurrencyShort(taxes.taxesIncomeBund)}
        </div>
        <ProgressBar value={taxes.taxesIncomeBund} total={taxes.taxesTotal} />

        {/* Taxes total */}
        <div className="col-span-2 mt-4">
            <Separator />
        </div>
        <div className="mt-4">Total Income Tax</div>
        <div className="text-sm text-right mt-4">
          {displayCurrencyShort(
            taxes.taxesIncomeCity +
              taxes.taxesIncomeCanton +
              taxes.taxesIncomeChurch +
              taxes.taxesIncomeBund
          )}
        </div>

        <div>Total Wealth Tax</div>
        <div className="text-right">
          {displayCurrencyShort(
            taxes.taxesFortuneCity + taxes.taxesFortuneCanton + taxes.taxesFortuneChurch
          )}
        </div>
        <div className="font-medium">Total Taxes</div>
        <div className="font-medium text-right">
          {displayCurrencyShort(taxes.taxesTotal)}
        </div>
      </div>
    </div>
  );
};

export default TaxResultDisplay;
