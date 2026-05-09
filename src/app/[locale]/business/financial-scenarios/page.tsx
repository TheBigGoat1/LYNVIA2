'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function FinancialScenariosPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  useEffect(() => {
    router.replace(`/${locale}/business/virtual-cfo`);
  }, [router, locale]);
  return null;
}
