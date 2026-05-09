'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import type { RevenueGrowthInput } from '@/lib/scenario-calculator/revenue-growth';

interface Props {
  onCalculate: (data: RevenueGrowthInput) => void;
  isLoading?: boolean;
}

export default function RevenueGrowthForm({ onCalculate, isLoading }: Props) {
  const [form, setForm] = useState<RevenueGrowthInput>({
    caActuel: 250_000,
    nouveauCA: 350_000,
    achatsActuels: 90_000,
    augmentationAchats: 20,
    salairesActuels: 70_000,
    augmentationSalaires: 15,
    fraisActuels: 18_000,
    augmentationFrais: 10,
    autresActuels: 2_000,
    augmentationAutres: 5,
    chargesFinancieres: 3_500,
    chargesFixesAnnuelles: 0,
  });

  const set = (key: keyof RevenueGrowthInput, raw: string) => {
    setForm(prev => ({ ...prev, [key]: parseFloat(raw) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(form);
  };

  const growthPct = form.caActuel > 0
    ? (((form.nouveauCA - form.caActuel) / form.caActuel) * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Growth Scenario
        </CardTitle>
        <CardDescription>
          Simulate the financial impact of a change in revenue on your P&L.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Revenue ── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Revenue (Chiffre d'affaires)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CA actuel annuel (CHF)</Label>
                <Input type="number" value={form.caActuel} onChange={e => set('caActuel', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Nouveau CA annualisé (CHF)</Label>
                <Input type="number" value={form.nouveauCA} onChange={e => set('nouveauCA', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Growth: <Badge variant={Number(growthPct) >= 0 ? 'default' : 'destructive'} className="ml-1">{growthPct}%</Badge>
            </p>
          </div>

          {form.nouveauCA > 100_000 && (
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <span>Revenue above <strong>CHF 100,000</strong> — the company is subject to mandatory VAT registration (art. 10 LTVA).</span>
            </div>
          )}

          <Separator />

          {/* ── Purchases ── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Purchases / COGS (Achats)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Achats actuels (CHF)</Label>
                <Input type="number" value={form.achatsActuels} onChange={e => set('achatsActuels', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Augmentation achats (%)</Label>
                <Input type="number" value={form.augmentationAchats} onChange={e => set('augmentationAchats', e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Salaries ── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Salaries (Salaires bruts)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Salaires actuels annuels (CHF)</Label>
                <Input type="number" value={form.salairesActuels} onChange={e => set('salairesActuels', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Augmentation salaires (%)</Label>
                <Input type="number" value={form.augmentationSalaires} onChange={e => set('augmentationSalaires', e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Social charges (AHV/ALV/NBUV/CAF) calculated automatically from official 2026 rates.
            </p>
          </div>

          <Separator />

          {/* ── Operating expenses ── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Operating Expenses (Frais d'exploitation)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Frais actuels (CHF)</Label>
                <Input type="number" value={form.fraisActuels} onChange={e => set('fraisActuels', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Augmentation frais (%)</Label>
                <Input type="number" value={form.augmentationFrais} onChange={e => set('augmentationFrais', e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Financial charges + Fixed costs ── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Fixed & Financial Charges</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Charges financières (CHF)</Label>
                <Input type="number" value={form.chargesFinancieres} onChange={e => set('chargesFinancieres', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-primary">Charges fixes annuelles (CHF)</Label>
                <Input type="number" value={form.chargesFixesAnnuelles} onChange={e => set('chargesFixesAnnuelles', e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Rent, insurance, leases — unaffected by revenue.</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Other charges ── */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Other Charges (Autres)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Autres actuels (CHF)</Label>
                <Input type="number" value={form.autresActuels} onChange={e => set('autresActuels', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Augmentation autres (%)</Label>
                <Input type="number" value={form.augmentationAutres} onChange={e => set('augmentationAutres', e.target.value)} />
              </div>
            </div>
          </div>

        </form>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
          Calculate Scenario
        </Button>
      </CardFooter>
    </Card>
  );
}
