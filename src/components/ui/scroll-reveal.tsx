'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function ScrollReveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  /** If already in (or near) the viewport, show immediately — avoids “invisible cards” on short phones. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const margin = 120;
    if (rect.top < vh + margin && rect.bottom > -margin) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      {
        threshold: 0.05,
        // Positive bottom margin = trigger slightly before entering (mobile-friendly)
        rootMargin: '0px 0px 15% 0px',
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (visible) return;
    const t = window.setTimeout(() => setVisible(true), 2400);
    return () => window.clearTimeout(t);
  }, [visible]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
      className={cn(
        'duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
