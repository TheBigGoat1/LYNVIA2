'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { firestore } from '@/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

export type CompanyRates = {
  avs: number;
  ac: number;
  caf: number;
  ijm: number;
  laa: number;
};

const DEFAULT_RATES: CompanyRates = {
  avs: 0.053,
  ac: 0.011,
  caf: 0.00171,
  ijm: 0.021,
  laa: 0.015,
};

const RATE_KEYS: (keyof CompanyRates)[] = ['avs', 'ac', 'caf', 'ijm', 'laa'];

export default function CompanyRatesSettings({ companyId }: { companyId: string }) {
  const [rates, setRates] = useState<CompanyRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations('CompanyRates');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    getDoc(doc(firestore, 'companies', companyId, 'settings', 'rates')).then((docSnap) => {
      if (docSnap.exists()) {
        setRates(docSnap.data() as CompanyRates);
      }
      setLoading(false);
    });
  }, [companyId]);

  const handleChange = (field: keyof CompanyRates, value: number) => {
    setRates((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    await setDoc(doc(firestore, 'companies', companyId, 'settings', 'rates'), rates);
    setLoading(false);
    toast({ title: t('toast.savedTitle'), description: t('toast.savedDescription') });
  };

  return (
    <Card className="max-w-lg mx-auto mt-8">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {RATE_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <label className="w-24 capitalize">{t(`labels.${key}`)}</label>
            <Input
              type="number"
              step="0.0001"
              value={rates[key]}
              onChange={(e) => handleChange(key, parseFloat(e.target.value) || 0)}
              className="w-32"
            />
          </div>
        ))}
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
