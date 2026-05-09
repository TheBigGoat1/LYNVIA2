'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFirebase } from '@/firebase/firebase-provider';
import { useToast } from '@/hooks/use-toast';
import { deleteUser } from 'firebase/auth';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { authErrorMessage } from '@/lib/toast-messages';

export function DangerZone() {
  const { user } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations('Settings.dangerZone');
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await deleteUser(user);
      toast({
        variant: 'success',
        title: t('toast.successTitle'),
        description: t('toast.successDescription'),
      });
      router.push('/');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t('toast.errorTitle'),
        description: authErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">{t('deleteButton')}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('dialog.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('dialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
