'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Bell, ShoppingCart, ChevronRight, Wallet } from 'lucide-react';

const rows = [
  { href: '/individual/my-orders' as const, icon: Package, key: 'orders' as const },
  { href: '/individual/purchase-services' as const, icon: ShoppingCart, key: 'services' as const },
  { href: '/individual/notifications' as const, icon: Bell, key: 'notifications' as const },
  { href: '/individual/settings#wallet' as const, icon: Wallet, key: 'wallet' as const },
];

export function IndividualShortcutsCard() {
  const t = useTranslations('Settings.shortcuts');

  return (
    <Card className="border-border/80 bg-muted/20 swiss-card-tilt">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline tracking-tight">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(({ href, icon: Icon, key }) => (
          <Link
            key={key}
            href={href}
            className="group flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-3 text-sm shadow-sm transition-colors hover:border-[var(--swiss-laurel-olive)]/40 hover:bg-background"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-[var(--swiss-deep-amethyst)]" aria-hidden />
              <span className="truncate font-medium">{t(key)}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
