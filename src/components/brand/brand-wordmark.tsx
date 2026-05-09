'use client';

import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/brand-logo';

export type BrandTone = 'dashboard' | 'marketing';

export function BrandWordmark({
  layout = 'inline',
  tone = 'dashboard',
  tagline,
  invertOnDark = false,
  className,
  wordmarkClassName,
}: {
  layout?: 'inline' | 'stacked';
  tone?: BrandTone;
  tagline?: string;
  /** Auth hero / dark side panel: light wordmark + mark tuned for dark bg */
  invertOnDark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  const name = (
    <div
      className={cn(
        'min-w-0 font-bold leading-tight tracking-tight',
        layout === 'stacked' && 'text-center',
        tone === 'marketing' &&
          'truncate text-base font-black uppercase tracking-tighter sm:text-lg md:text-xl',
        tone === 'dashboard' && 'truncate text-base sm:text-lg md:text-xl',
        invertOnDark ? 'text-white' : 'text-foreground',
        wordmarkClassName,
      )}
    >
      LYNVIA
      <span
        className={cn(
          'font-light',
          invertOnDark ? 'text-white/88' : 'text-[var(--swiss-deep-amethyst)]',
        )}
      >
        DIGITAL
      </span>
    </div>
  );

  const taglineNode =
    tagline != null ? (
      <span
        className={cn(
          'line-clamp-2 text-[9px] font-bold uppercase leading-snug tracking-[0.2em] sm:text-[10px] sm:tracking-[0.25em]',
          layout === 'stacked' ? 'text-center' : 'text-left',
          invertOnDark ? 'text-white/72' : 'text-[var(--swiss-laurel-olive)]',
        )}
      >
        {tagline}
      </span>
    ) : null;

  const mark = (
    <BrandLogo
      responsive
      decorative
      tone={invertOnDark ? 'onDarkSurface' : 'theme'}
    />
  );

  if (layout === 'stacked') {
    return (
      <div className={cn('flex flex-col items-center gap-3 text-center sm:gap-4', className)}>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {mark}
          {name}
        </div>
        {taglineNode}
      </div>
    );
  }

  if (taglineNode) {
    return (
      <div className={cn('flex min-w-0 items-center gap-2 sm:gap-3', className)}>
        {mark}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
          {name}
          {taglineNode}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-2 sm:gap-2.5', className)}>
      {mark}
      {name}
    </div>
  );
}
