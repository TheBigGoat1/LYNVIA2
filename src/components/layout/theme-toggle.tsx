'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const touchClass =
  'h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const runWipe = (e: React.MouseEvent<HTMLButtonElement>) => {
    const goingDark = resolvedTheme !== 'dark';
    const fill = goingDark ? 'var(--swiss-midnight-void)' : 'var(--swiss-mineral-cream)';

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    document.documentElement.style.setProperty('--theme-wipe-x', `${x}px`);
    document.documentElement.style.setProperty('--theme-wipe-y', `${y}px`);

    const overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.className = 'theme-wipe-overlay fixed inset-0 z-[200] pointer-events-none';
    overlay.style.background = fill;
    document.body.appendChild(overlay);

    document.documentElement.classList.add('theme-transitioning');

    requestAnimationFrame(() => {
      overlay.classList.add('theme-wipe-expand');
    });

    window.setTimeout(() => {
      setTheme(goingDark ? 'dark' : 'light');
    }, 220);

    window.setTimeout(() => {
      overlay.classList.add('theme-wipe-fade');
    }, 400);

    window.setTimeout(() => {
      overlay.remove();
      document.documentElement.classList.remove('theme-transitioning');
    }, 720);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-hidden className={cn('relative', touchClass, className)}>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', touchClass, className)}
      type="button"
      onClick={runWipe}
      aria-label="Toggle color theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme ({theme})</span>
    </Button>
  );
}
