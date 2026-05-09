'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/firebase/config';

const UNLIMITED_SCENARIO_IDS = new Set(['pillar_3a', 'pillar-3a', 'vat_comparison', 'vat-comparison']);

/** Mirrors ScenarioCalculator monthly non–pillar-3a usage for display on Profile. */
export function useScenarioUsageSummary(userId: string | undefined) {
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUsed(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const scenarioSnap = await getDocs(
        query(
          collection(firestore, 'users', userId, 'scenarios'),
          where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
        ),
      );
      const count = scenarioSnap.docs.reduce((acc, doc) => {
        const data = doc.data();
        const scenarioId = data.metadata?.scenarioId as string | undefined;
        const scenarioType = String(data.metadata?.scenarioType || '').toLowerCase();
        const isUnlimited =
          (scenarioId && UNLIMITED_SCENARIO_IDS.has(scenarioId)) ||
          scenarioType.includes('pillar 3a') ||
          scenarioType.includes('3rd pillar') ||
          scenarioType.includes('vat');
        return isUnlimited ? acc : acc + 1;
      }, 0);
      setUsed(count);
    } catch {
      setUsed(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { used, includedFree: 2, loading, refresh };
}
