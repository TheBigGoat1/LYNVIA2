'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function Magnetic({
  children,
  className,
  strength = 0.12,
}: {
  children: React.ReactElement<{ className?: string; ref?: React.Ref<HTMLElement> }>;
  className?: string;
  strength?: number;
}) {
  const root = React.useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * strength;
    const dy = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${clamp(dx, -6, 6)}px, ${clamp(dy, -6, 6)}px)`;
  };

  const onLeave = () => {
    const el = root.current;
    if (!el) return;
    el.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div
      ref={root}
      className={cn('inline-flex transition-transform duration-200 ease-out will-change-transform', className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}
