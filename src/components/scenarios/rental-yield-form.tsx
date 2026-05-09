'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, Loader2 } from 'lucide-react';
import type { RentalYieldInput } from '@/lib/scenario-calculator/investment';

interface Props {
  onCalculate: (data: RentalYieldInput) => void;
  isLoading: boolean;
}

export default function RentalYieldForm({ onCalculate, isLoading }: Props) {
  const [form, setForm] = useState<RentalYieldInput>({
    prixAchat: 800000,
    fraisNotaire: 15000,
    fraisAgence: 20000,
    travaux: 10000,
    loyerMensuel: 2500,
    tauxVacance: 5,
    chargesPPE: 3600,
    impotFoncier: 2400,
    assuranceImmeuble: 1200,
    fraisGerance: 1800,
    entretienCourant: 4000,
    tauxImposition: 25,
    fondsPropres: 200000,
    chargesHypothecaires: 12000,
  });

  const set = (key: keyof RentalYieldInput, val: number) => {
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
          <Building2 className="h-5 w-5" />
          Rendement locatif
        </CardTitle>
        <CardDescription>
          Simulateur complet incluant rendement brut, net, net-net, ratios d&apos;endettement et DSCR.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          {/* Acquisition */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Acquisition
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ry-prix">Prix d&apos;achat (CHF)</Label>
                <Input id="ry-prix" type="number" min={0} value={form.prixAchat}
                  onChange={e => set('prixAchat', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-notaire">Frais de notaire (CHF)</Label>
                <Input id="ry-notaire" type="number" min={0} value={form.fraisNotaire}
                  onChange={e => set('fraisNotaire', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-agence">Frais d&apos;agence (CHF)</Label>
                <Input id="ry-agence" type="number" min={0} value={form.fraisAgence}
                  onChange={e => set('fraisAgence', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-travaux">Travaux prévus (CHF)</Label>
                <Input id="ry-travaux" type="number" min={0} value={form.travaux}
                  onChange={e => set('travaux', Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Revenus
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ry-loyer">Loyer mensuel (CHF)</Label>
                <Input id="ry-loyer" type="number" min={0} value={form.loyerMensuel}
                  onChange={e => set('loyerMensuel', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-vacance">Taux de vacance (%)</Label>
                <Input id="ry-vacance" type="number" min={0} max={100} step={0.5} value={form.tauxVacance}
                  onChange={e => set('tauxVacance', Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Charges */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Charges annuelles
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ry-ppe">Charges PPE (CHF/an)</Label>
                <Input id="ry-ppe" type="number" min={0} value={form.chargesPPE}
                  onChange={e => set('chargesPPE', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-impot">Impôt foncier (CHF/an)</Label>
                <Input id="ry-impot" type="number" min={0} value={form.impotFoncier}
                  onChange={e => set('impotFoncier', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-assur">Assurance immeuble (CHF/an)</Label>
                <Input id="ry-assur" type="number" min={0} value={form.assuranceImmeuble}
                  onChange={e => set('assuranceImmeuble', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-gerance">Frais de gérance (CHF/an)</Label>
                <Input id="ry-gerance" type="number" min={0} value={form.fraisGerance}
                  onChange={e => set('fraisGerance', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-entret">Entretien courant (CHF/an)</Label>
                <Input id="ry-entret" type="number" min={0} value={form.entretienCourant}
                  onChange={e => set('entretienCourant', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-taux-impot">Taux d&apos;imposition (%)</Label>
                <Input id="ry-taux-impot" type="number" min={0} max={100} step={0.5} value={form.tauxImposition}
                  onChange={e => set('tauxImposition', Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Financing */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Financement
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ry-fonds">Fonds propres (CHF)</Label>
                <Input id="ry-fonds" type="number" min={0} value={form.fondsPropres}
                  onChange={e => set('fondsPropres', Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ry-hypo">Charges hypothécaires (CHF/an)</Label>
                <Input id="ry-hypo" type="number" min={0} value={form.chargesHypothecaires}
                  onChange={e => set('chargesHypothecaires', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
            Calculer le rendement
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
