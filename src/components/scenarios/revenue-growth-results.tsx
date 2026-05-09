'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle } from 'lucide-react';
import type { RevenueGrowthResult } from '@/lib/scenario-calculator/revenue-growth';

interface Props {
  results: RevenueGrowthResult;
}

function fmt(val: number): string {
  return val.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(val: number): string {
  return val.toFixed(1) + '%';
}

export default function RevenueGrowthResults({ results }: Props) {
  const isPositive = results.deltaResultat >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPositive ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
          Scenario Results
        </CardTitle>
        <CardDescription>
          Revenue growth of {pct(results.revenueGrowthPct)} — impact on profitability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── TVA Alert ── */}
        {results.tvaThresholdAlert && (
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <span>Projected revenue exceeds <strong>CHF 100,000</strong> — the company is subject to mandatory VAT registration.</span>
          </div>
        )}

        {/* ── Key Metrics ── */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Nouveau résultat"
            value={`CHF ${fmt(results.nouveauResultat)}`}
            delta={`${results.deltaResultat >= 0 ? '+' : ''}CHF ${fmt(results.deltaResultat)}`}
            positive={results.deltaResultat >= 0}
          />
          <MetricCard
            label="Résultat net %"
            value={pct(results.nouveauResultatPct)}
            delta={`${results.deltaResultatPct >= 0 ? '+' : ''}${pct(results.deltaResultatPct)}`}
            positive={results.deltaResultatPct >= 0}
          />
          <MetricCard
            label="Marge brute"
            value={pct(results.nouvelleMarge)}
            delta={`${results.deltaMarge >= 0 ? '+' : ''}${pct(results.deltaMarge)}`}
            positive={results.deltaMarge >= 0}
          />
          <MetricCard
            label="Total charges"
            value={`CHF ${fmt(results.totalCharges)}`}
            positive={false}
            neutral
          />
        </div>

        <Separator />

        {/* ── Charge Breakdown ── */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Projected Charges Breakdown</h4>
          <div className="space-y-2 text-sm">
            <LineItem label="Achats (COGS)" value={results.nouveauxAchats} />
            <LineItem label="Salaires bruts" value={results.nouveauxSalaires} />
            <LineItem label="Charges sociales (employer)" value={results.chargesSociales} />
            <LineItem label="Frais d'exploitation" value={results.nouveauxFrais} />
            <LineItem label="Charges financières" value={results.chargesFinancieres} />
            <LineItem label="Charges fixes annuelles" value={results.chargesFixesAnnuelles} highlight />
            <LineItem label="Autres charges" value={results.nouveauxAutres} />
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total charges</span>
              <span>CHF {fmt(results.totalCharges)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Before / After comparison ── */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Before → After</h4>
          <div className="space-y-2 text-sm">
            <ComparisonRow label="Résultat net" before={results.currentResult} after={results.nouveauResultat} />
            <ComparisonRow label="Marge brute" before={results.currentMargin} after={results.nouvelleMarge} isPct />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function MetricCard({ label, value, delta, positive, neutral }: {
  label: string; value: string; delta?: string; positive: boolean; neutral?: boolean;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {delta && !neutral && (
        <Badge variant={positive ? 'default' : 'destructive'} className="mt-1 text-xs">
          {delta}
        </Badge>
      )}
    </div>
  );
}

function LineItem({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex justify-between ${highlight ? 'font-semibold text-primary' : ''}`}>
      <span>{label}</span>
      <span>CHF {fmt(value)}</span>
    </div>
  );
}

function ComparisonRow({ label, before, after, isPct }: {
  label: string; before: number; after: number; isPct?: boolean;
}) {
  const positive = after >= before;
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span>{isPct ? pct(before) : `CHF ${fmt(before)}`}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className={positive ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
        {isPct ? pct(after) : `CHF ${fmt(after)}`}
      </span>
    </div>
  );
}
