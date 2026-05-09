'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Wallet, PiggyBank, Percent } from 'lucide-react';
import type { CompoundInterestResult } from '@/lib/scenario-calculator/investment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface Props {
  results: CompoundInterestResult;
}

function chf(v: number) {
  return `CHF ${v.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}`;
}

export default function CompoundInterestResults({ results }: Props) {
  const chartData = results.yearlyBreakdown.map(row => ({
    name: `An ${row.year}`,
    'Capital versé': Math.round(row.capitalDebut + row.versements - row.interets),
    'Plus-value': Math.round(row.capitalFin - (row.capitalDebut + row.versements - row.interets) > 0 ? row.capitalFin - row.capitalDebut - row.versements + row.interets : row.interets),
    'Capital total': Math.round(row.capitalFin),
  }));

  // Simplified chart: contributions cumulative vs capital fin
  const simplified = results.yearlyBreakdown.map((row, idx) => {
    const totalContrib = results.yearlyBreakdown
      .slice(0, idx + 1)
      .reduce((sum, r) => sum + r.versements, 0) + results.yearlyBreakdown[0].capitalDebut;
    return {
      name: `${row.year}`,
      'Montant versé': Math.round(totalContrib),
      'Intérêts cumulés': Math.round(row.capitalFin - totalContrib),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Résultats — Intérêts composés
        </CardTitle>
        <CardDescription>Projection sur {results.yearlyBreakdown.length} ans</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 mb-1">
              <Wallet className="h-4 w-4" /> Capital final
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {chf(results.capitalFinal)}
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 mb-1">
              <PiggyBank className="h-4 w-4" /> Plus-value
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              {chf(results.plusValue)}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Total versé</p>
            <p className="text-lg font-semibold">{chf(results.totalVerse)}</p>
          </div>

          <div className="p-4 bg-muted rounded-lg border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Percent className="h-3 w-3" /> Rendement total / annualisé
            </div>
            <p className="text-lg font-semibold">
              {results.rendementTotal.toFixed(1)}%{' '}
              <span className="text-sm text-muted-foreground">
                / {results.rendementAnnualise.toFixed(2)}% p.a.
              </span>
            </p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h4 className="text-sm font-medium mb-2">Croissance du capital</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={simplified} margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(simplified.length / 10) - 1)} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => chf(val)} />
                <Legend />
                <Bar dataKey="Montant versé" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Intérêts cumulés" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Year-by-year table */}
        <div>
          <h4 className="text-sm font-medium mb-2">Détail annuel</h4>
          <div className="max-h-64 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 text-left">Année</th>
                  <th className="p-2 text-right">Capital début</th>
                  <th className="p-2 text-right">Versements</th>
                  <th className="p-2 text-right">Intérêts</th>
                  <th className="p-2 text-right">Capital fin</th>
                </tr>
              </thead>
              <tbody>
                {results.yearlyBreakdown.map(row => (
                  <tr key={row.year} className="border-t">
                    <td className="p-2">{row.year}</td>
                    <td className="p-2 text-right">{chf(row.capitalDebut)}</td>
                    <td className="p-2 text-right">{chf(row.versements)}</td>
                    <td className="p-2 text-right text-green-600">{chf(row.interets)}</td>
                    <td className="p-2 text-right font-medium">{chf(row.capitalFin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
