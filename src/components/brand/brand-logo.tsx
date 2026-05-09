'use client';

import { cn } from '@/lib/utils';

const LOGO_PATH = '/brand/lynvia-mark.png';

/** Theme-aware: dark mark in light UI, light mark in dark UI. `onDarkSurface` = always light ink (e.g. auth hero). */
export type BrandMarkTone = 'theme' | 'onDarkSurface';

const toneClass: Record<BrandMarkTone, string> = {
  theme: 'bg-foreground opacity-95 dark:opacity-90',
  onDarkSurface: 'bg-white opacity-95',
};

export function BrandLogo({
  size = 40,
  responsive = false,
  className,
  decorative = false,
  tone = 'theme',
}: {
  size?: number;
  responsive?: boolean;
  className?: string;
  decorative?: boolean;
  tone?: BrandMarkTone;
}) {
  const maskStyle = {
    maskImage: `url('${LOGO_PATH}')`,
    WebkitMaskImage: `url('${LOGO_PATH}')`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  } as const;

  if (responsive) {
    return (
      <div
        aria-hidden={decorative || undefined}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : 'Lynvia Digital'}
        className={cn(
          'inline-flex shrink-0 rounded-none',
          toneClass[tone],
          'h-7 w-7 min-h-[1.75rem] min-w-[1.75rem] sm:h-9 sm:w-9 sm:min-h-[2.25rem] sm:min-w-[2.25rem] md:h-10 md:w-10 md:min-h-[2.5rem] md:min-w-[2.5rem]',
          className,
        )}
        style={maskStyle}
      />
    );
  }

  return (
    <div
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Lynvia Digital'}
      className={cn('inline-flex shrink-0 rounded-none', toneClass[tone], className)}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        ...maskStyle,
      }}
    />
  );
}
