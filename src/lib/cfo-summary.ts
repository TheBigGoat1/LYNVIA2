// Data model and fetcher for CFO summary (financial accounts)
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/config';

export interface CustomCostCentreValue {
  id: string;
  name: string;
  value: number;
}

export interface CFOSummary {
  period: string; // e.g. 'T1 2025'
  turnover: number;
  purchases: number;
  rawWages: number;
  salaryExpenses: number;
  operatingCosts: number;
  financialCharges: number;
  otherCharges: number;
  profitOrLoss: number;
  customCostCentres?: Record<string, number>; // { costCentreId: value }
}

// Fetch the latest CFO summary for a company
export async function fetchLatestCFOSummary(companyId: string): Promise<CFOSummary | null> {
  // Assume admin writes to: companies/{companyId}/cfo_summaries/latest
  const summaryDoc = doc(firestore, 'companies', companyId, 'cfo_summaries', 'latest');
  const snap = await getDoc(summaryDoc);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, any>;
  return {
    period: String(data.period ?? ''),
    turnover: Number(data.turnover ?? 0),
    purchases: Number(data.purchases ?? 0),
    rawWages: Number(data.rawWages ?? 0),
    salaryExpenses: Number(data.salaryExpenses ?? 0),
    operatingCosts: Number(data.operatingCosts ?? 0),
    financialCharges: Number(data.financialCharges ?? 0),
    otherCharges: Number(data.otherCharges ?? 0),
    profitOrLoss: Number(data.profitOrLoss ?? 0),
    customCostCentres: data.customCostCentres ?? undefined,
  };
}
