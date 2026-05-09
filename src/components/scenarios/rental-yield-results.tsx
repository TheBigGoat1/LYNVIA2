'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, ShieldCheck, AlertTriangle, ArrowDown } from 'lucide-react';
import type { RentalYieldResult } from '@/lib/scenario-calculator/investment';

interface Props {
  results: RentalYieldResult;
}

function chf(v: number) {
  return `CHF ${v.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}`;
}

function pct(v: number) {
  return `${v.toFixed(2)}%`;
}

function verdictColor(v: RentalYieldResult['verdict']) {
  switch (v) {
    case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'bon': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'moyen': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'faible': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}

function VerdictIcon({ verdict }: { verdict: RentalYieldResult['verdict'] }) {
  switch (verdict) {
    case 'excellent': return <TrendingUp className="h-4 w-4" />;
    case 'bon': return <ShieldCheck className="h-4 w-4" />;
    case 'moyen': return <AlertTriangle className="h-4 w-4" />;
    case 'faible': return <ArrowDown className="h-4 w-4" />;
  }
}

export default function RentalYieldResults({ results }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Résultats — Rendement locatif
            </CardTitle>
            <CardDescription>Analyse complète de l&apos;investissement immobilier</CardDescription>
          </div>
          <Badge className={`text-sm px-3 py-1 ${verdictColor(results.verdict)}`}>
            <VerdictIcon verdict={results.verdict} />
            <span className="ml-1">{results.verdictLabel}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 3-tier yields */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Rendements
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Rendement brut</p>
              <p className="text-xl font-bold">{pct(results.rendementBrut)}</p>
            </div>
            <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950 text-center">
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Rendement net</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{pct(results.rendementNet)}</p>
            </div>
            <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950 text-center">
              <p className="text-xs text-green-700 dark:text-green-300 mb-1">Rendement net-net</p>
              <p className="text-xl font-bold text-green-800 dark:text-green-200">{pct(results.rendementNetNet)}</p>
            </div>
          </div>
        </div>

        {/* Cash flow */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Cash flow
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Loyer annuel brut (après vacance)</p>
              <p className="text-lg font-semibold">{chf(results.loyerAnnuelBrut)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Charges annuelles totales</p>
              <p className="text-lg font-semibold text-red-600">{chf(results.totalChargesAnnuelles)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Revenu net avant impôt</p>
              <p className="text-lg font-semibold">{chf(results.revenuNetAvantImpot)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Impôt estimé</p>
              <p className="text-lg font-semibold text-orange-600">{chf(results.impotEstime)}</p>
            </div>
            <div className="p-3 border rounded-lg col-span-2 bg-green-50 dark:bg-green-950">
              <p className="text-xs text-green-700 dark:text-green-300">Cash flow mensuel net</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                {chf(results.cashFlowMensuel)}
                <span className="text-sm font-normal text-muted-foreground"> /mois</span>
              </p>
            </div>
          </div>
        </div>

        {/* Acquisition summary */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Acquisition &amp; Financement
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Coût total d&apos;acquisition</p>
              <p className="text-lg font-semibold">{chf(results.coutTotalAcquisition)}</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-muted-foreground">Dette hypothécaire</p>
              <p className="text-lg font-semibold">{chf(results.dette)}</p>
            </div>
          </div>
        </div>

        {/* Ratios */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Ratios avancés
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-2 border rounded">
              <span className="text-muted-foreground">ROI sur fonds propres</span>
              <span className="font-semibold">{pct(results.roi)}</span>
            </div>
            <div className="flex justify-between p-2 border rounded">
              <span className="text-muted-foreground">Rendement effectif</span>
              <span className="font-semibold">{pct(results.rendementEffectif)}</span>
            </div>
            <div className="flex justify-between p-2 border rounded">
              <span className="text-muted-foreground">Ratio emprunt/fonds propres</span>
              <span className="font-semibold">{results.ratioEmpruntFondsPropres.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between p-2 border rounded">
              <span className="text-muted-foreground">Ratio endettement</span>
              <span className="font-semibold">{pct(results.ratioEndettement)}</span>
            </div>
            <div className="flex justify-between p-2 border rounded col-span-2">
              <span className="text-muted-foreground">DSCR (Debt Service Coverage Ratio)</span>
              <span className={`font-semibold ${results.dscr >= 1.2 ? 'text-green-600' : results.dscr >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                {results.dscr.toFixed(2)}x
                {results.dscr < 1 && <span className="text-xs ml-1">(insuffisant)</span>}
                {results.dscr >= 1 && results.dscr < 1.2 && <span className="text-xs ml-1">(limite)</span>}
                {results.dscr >= 1.2 && <span className="text-xs ml-1">(sain)</span>}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
