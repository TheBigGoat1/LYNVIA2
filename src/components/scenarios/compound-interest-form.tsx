'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Loader2 } from 'lucide-react';
import type { CompoundInterestInput } from '@/lib/scenario-calculator/investment';

interface Props {
  onCalculate: (data: CompoundInterestInput) => void;
  isLoading: boolean;
}

export default function CompoundInterestForm({ onCalculate, isLoading }: Props) {
  const [form, setForm] = useState<CompoundInterestInput>({
    capitalInitial: 10000,
    versementPeriodique: 500,
    frequenceVersement: 'monthly',
    tauxRendementAnnuel: 5,
    dureeAnnees: 20,
    frequenceCapitalisation: 'monthly',
  });

  const set = (key: keyof CompoundInterestInput, val: string | number) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculateur d&apos;intérêts composés
        </CardTitle>
        <CardDescription>
          Projetez la croissance de votre capital avec versements périodiques et capitalisation des intérêts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ci-capital">Capital initial (CHF)</Label>
              <Input
                id="ci-capital"
                type="number"
                min={0}
                value={form.capitalInitial}
                onChange={e => set('capitalInitial', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci-versement">Versement périodique (CHF)</Label>
              <Input
                id="ci-versement"
                type="number"
                min={0}
                value={form.versementPeriodique}
                onChange={e => set('versementPeriodique', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fréquence de versement</Label>
              <Select
                value={form.frequenceVersement}
                onValueChange={v => set('frequenceVersement', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="quarterly">Trimestriel</SelectItem>
                  <SelectItem value="annual">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fréquence de capitalisation</Label>
              <Select
                value={form.frequenceCapitalisation}
                onValueChange={v => set('frequenceCapitalisation', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                  <SelectItem value="quarterly">Trimestrielle</SelectItem>
                  <SelectItem value="semi-annual">Semestrielle</SelectItem>
                  <SelectItem value="annual">Annuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ci-taux">Rendement annuel (%)</Label>
              <Input
                id="ci-taux"
                type="number"
                min={0}
                max={50}
                step={0.1}
                value={form.tauxRendementAnnuel}
                onChange={e => set('tauxRendementAnnuel', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci-duree">Durée (années)</Label>
              <Input
                id="ci-duree"
                type="number"
                min={1}
                max={100}
                value={form.dureeAnnees}
                onChange={e => set('dureeAnnees', Number(e.target.value))}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
            Projeter la croissance
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
