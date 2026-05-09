import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const ACCENTS = [
  'var(--swiss-laurel-olive)',
  'var(--swiss-deep-amethyst)',
  'var(--swiss-alpine-slate)',
  'var(--swiss-deep-amethyst)',
] as const;

export function SwissKpiCard({
  title,
  value,
  description,
  icon,
  index = 0,
  className,
}: {
  title: string;
  value: ReactNode;
  description: string;
  icon: ReactNode;
  index?: number;
  className?: string;
}) {
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <div
      className={cn(
        'swiss-card-tilt relative flex min-h-[108px] flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      <div className="pointer-events-none absolute right-3 top-3 text-muted-foreground/25 [&_svg]:h-7 [&_svg]:w-7">
        {icon}
      </div>
      <p className="pr-14 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 min-w-0">
        <div className="text-xl font-bold tracking-tight text-foreground md:text-2xl">{value}</div>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
