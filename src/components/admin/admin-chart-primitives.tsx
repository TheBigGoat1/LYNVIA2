'use client';

import type { TooltipProps } from 'recharts';

/** Shared grid + axis styling for admin analytics */
export const adminChartMargin = { top: 12, right: 8, left: -8, bottom: 0 };

export function AdminChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 px-3 py-2.5 shadow-lg ring-1 ring-border/30 backdrop-blur-md">
      <p className="mb-2 border-b border-border/40 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1.5">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-3 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="flex-1 text-muted-foreground">{entry.name}</span>
            <span className="font-semibold tabular-nums text-foreground">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** SVG defs: call once inside ResponsiveContainer chart (as child of chart root) */
export function AdminLineAreaGradients() {
  return (
    <defs>
      <linearGradient id="adminGradPrimary" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="adminGradAccent" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.26} />
        <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="adminBarGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.95} />
        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.55} />
      </linearGradient>
    </defs>
  );
}

export function AdminAreaStackGradients() {
  return (
    <defs>
      <linearGradient id="adminArea1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.55} />
        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.08} />
      </linearGradient>
      <linearGradient id="adminArea2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.5} />
        <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0.08} />
      </linearGradient>
      <linearGradient id="adminArea3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.45} />
        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.06} />
      </linearGradient>
    </defs>
  );
}
