'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase } from "@/firebase/firebase-provider";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Link as LinkIcon } from "lucide-react";
import { useTranslations } from 'next-intl';

type CronStatus = {
    endpoint: string;
    mode: string;
    autoRunEnabled: boolean;
    secretConfigured: boolean;
    message: string;
};

export default function NotificationTesterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<CronStatus | null>(null);
    const [isStatusLoading, setIsStatusLoading] = useState(true);
    const { user } = useFirebase();
    const { toast } = useToast();
    const t = useTranslations('NotificationTester');

    useEffect(() => {
        const loadStatus = async () => {
            setIsStatusLoading(true);
            try {
                const response = await fetch('/api/notifications/cron', { cache: 'no-store' });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load cron status');
                }
                setStatus(data as CronStatus);
            } catch (error) {
                console.error('Error loading cron status:', error);
            } finally {
                setIsStatusLoading(false);
            }
        };

        void loadStatus();
    }, []);

    const handleRunCronJob = async () => {
        if (!user) {
            toast({
                variant: "destructive",
                title: t('toast.notLoggedIn.title'),
                description: t('toast.notLoggedIn.description'),
            });
            return;
        }

        setIsLoading(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/notifications/cron', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ source: 'ui' }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || t('toast.error.description'));
            }

            toast({
                title: t('toast.success.title'),
                description: t('toast.success.description', { endpoint: data.endpoint || '/api/notifications/cron' }),
            });
        } catch (error) {
            console.error("Error running cron job:", error);
            toast({
                variant: "destructive",
                title: t('toast.error.title'),
                description: error instanceof Error ? error.message : t('toast.error.description'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground">
                    {t('subtitle')}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('card.title')}</CardTitle>
                    <CardDescription>
                       {t('card.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">{t('status.title')}</p>
                                <p className="text-sm text-muted-foreground">{t('status.description')}</p>
                            </div>
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
                                {t('status.manualOnly')}
                            </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <LinkIcon className="h-4 w-4" />
                                <span>{t('status.endpointLabel')} {isStatusLoading ? '...' : status?.endpoint || '/api/notifications/cron'}</span>
                            </div>
                            <p className="text-muted-foreground">
                                {isStatusLoading ? t('status.loading') : status?.message || t('status.fallback')}
                            </p>
                        </div>
                    </div>

                    <Button onClick={handleRunCronJob} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('button.sending')}
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                {t('button.send')}
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
