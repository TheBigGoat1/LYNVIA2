'use client';

import React from 'react';
import { TaxResult } from '@/lib/taxes/typesClient';
import { displayCurrency } from '@/lib/utils/format';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface TaxDetailsDisplayProps {
  taxes: TaxResult;
  showSecondPerson: boolean;
}

type GrossNetItem = { label: string; p1: number; p2?: number };
type DeductionItem = { label: string; canton: number; bund: number };

const TaxDetailsDisplay: React.FC<TaxDetailsDisplayProps> = ({ taxes, showSecondPerson }) => {
  const detailsGrossNet: GrossNetItem[] = (() => {
    if (!taxes || !taxes.details.grossNetDetails) return [];

    const details: GrossNetItem[] = [];

    const grossP1 = taxes.details.grossNetDetails[0];
    const grossP2 =
      taxes.details.grossNetDetails.length > 1
        ? taxes.details.grossNetDetails[1]
        : undefined;

    details.push({ label: 'Gross Income', p1: grossP1.grossIncome, p2: grossP2?.grossIncome });
    details.push({ label: 'AHV, IV, EO contributions', p1: grossP1.ahvIvEo, p2: grossP2?.ahvIvEo });
    details.push({ label: 'ALV contributions', p1: grossP1.alv, p2: grossP2?.alv });
    details.push({ label: 'NBU contributions', p1: grossP1.nbu, p2: grossP2?.nbu });
    details.push({ label: 'Pension fund contributions', p1: grossP1.pk, p2: grossP2?.pk });
    details.push({ label: 'Net Income', p1: grossP1.netIncome, p2: grossP2?.netIncome });

    return details;
  })();

  const detailsDeductionsIncome: DeductionItem[] = (() => {
    if (!taxes) return [];

    const details: DeductionItem[] = [];
    const deductionsIncome = taxes.details.deductionsIncome;

    details.push({
      label: 'Net income from main employment',
      canton: taxes.details.netIncomeCanton,
      bund: taxes.details.netIncomeBund
    });

    deductionsIncome.forEach((deduction) => {
      details.push({
        label:
          deduction.name + (showSecondPerson && deduction.target ? ` ${deduction.target}` : ''),
        canton: deduction.amountCanton,
        bund: deduction.amountBund
      });
    });

    details.push({
      label: 'Taxable Income',
      canton: taxes.details.taxableIncomeCanton,
      bund: taxes.details.taxableIncomeBund
    });

    return details;
  })();

  const detailsDeductionsFortune: DeductionItem[] = (() => {
    if (!taxes) return [];

    const details: DeductionItem[] = [];
    const deductionsFortune = taxes.details.deductionsFortune;

    details.push({
      label: 'Net wealth',
      canton: taxes.input.fortune,
      bund: 0
    });

    deductionsFortune.forEach((deduction) => {
      details.push({
        label: deduction.name + (showSecondPerson ? deduction.target : ''),
        canton: deduction.amountCanton,
        bund: deduction.amountBund
      });
    });

    details.push({
      label: 'Taxable wealth',
      canton: taxes.details.taxableFortuneCanton,
      bund: 0
    });

    return details;
  })();

  return (
    <div className="max-w-2xl text-sm space-y-8">
      <h3 className="text-lg leading-7 font-semibold">Tax Calculation Details</h3>

      {/* Gross to net */}
      {detailsGrossNet.length > 0 && (
        <div>
            <h4 className="font-medium mb-2">Gross / Net Income</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">P1</TableHead>
                        {showSecondPerson && <TableHead className="text-right">P2</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {detailsGrossNet.map((item, index) => (
                    <TableRow key={index} className={index === detailsGrossNet.length - 1 ? 'font-medium' : ''}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell className="text-right">{displayCurrency(item.p1)}</TableCell>
                        {showSecondPerson && <TableCell className="text-right">{displayCurrency(item.p2 ?? 0)}</TableCell>}
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      )}

      {/* Deductions Income */}
       <div>
            <h4 className="font-medium mb-2">Income</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Canton</TableHead>
                        <TableHead className="text-right">Federal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {detailsDeductionsIncome.map((item, index) => (
                    <TableRow key={index} className={index === detailsDeductionsIncome.length - 1 ? 'font-medium' : ''}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell className="text-right">{displayCurrency(item.canton)}</TableCell>
                    <TableCell className="text-right">{displayCurrency(item.bund)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
       </div>

      {/* Fortune */}
      <div>
        <h4 className="font-medium mb-2">Wealth</h4>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Canton</TableHead>
                    {showSecondPerson && <TableHead></TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
            {detailsDeductionsFortune.map((item, index) => (
                <TableRow key={index} className={index === detailsDeductionsFortune.length - 1 ? 'font-medium' : ''}>
                <TableCell>{item.label}</TableCell>
                <TableCell className="text-right">{displayCurrency(item.canton)}</TableCell>
                 {showSecondPerson && <TableCell></TableCell>}
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>

    </div>
  );
};

export default TaxDetailsDisplay;
