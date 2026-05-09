
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';

export default function CancelPage() {
    const t = useTranslations('TaxServices.cancelPage');
    return (
        <div className="flex justify-center items-center py-20">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                     <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
                         <XCircle className="h-12 w-12 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">{t('title')}</CardTitle>
                    <CardDescription>
                       {t('description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="outline">
                        <Link href="/individual/my-orders">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('button')}
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
