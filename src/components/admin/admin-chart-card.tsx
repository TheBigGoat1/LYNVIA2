import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Premium shell for Recharts on admin — glassy border, soft gradient, no layout change to data.
 */
export function AdminChartCard({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        'admin-chart-card group overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-muted/25 shadow-sm ring-1 ring-border/35 transition-shadow duration-300 hover:shadow-md hover:ring-border/50',
        className,
      )}
    >
      <CardHeader className="space-y-1 border-b border-border/30 bg-muted/20 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-headline text-lg tracking-tight">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}
