'use client';

import { useFirebase } from '@/firebase/firebase-provider';
import { useTranslations } from 'next-intl';
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form';
import { PasswordSettingsForm } from '@/components/settings/password-settings-form';
import { DangerZone } from '@/components/settings/danger-zone';
import { IndividualShortcutsCard } from '@/components/settings/individual-shortcuts-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useScenarioUsageSummary } from '@/hooks/use-scenario-usage-summary';

function ScenarioUsageBanner() {
  const t = useTranslations('Settings.usage');
  const { user } = useFirebase();
  const { used, includedFree, loading } = useScenarioUsageSummary(user?.uid);
  const pct = Math.min(100, Math.round((used / Math.max(includedFree, 1)) * 100));

  return (
    <Card className="border-border/80 bg-muted/15">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <CardDescription>
          {loading ? t('loading') : t('description', { used, total: includedFree })}
        </CardDescription>
      </CardHeader>
      {!loading && (
        <CardContent className="space-y-2 pb-4">
          <Progress value={pct} className="h-2" />
        </CardContent>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const { loading } = useFirebase();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <ScenarioUsageBanner />
      <IndividualShortcutsCard />
      <div className="space-y-8 max-w-3xl">
        <ProfileSettingsForm />
        <PasswordSettingsForm />
        <DangerZone />
      </div>
    </div>
  );
}
