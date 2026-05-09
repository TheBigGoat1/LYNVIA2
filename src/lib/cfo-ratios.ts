// Utility for calculating financial ratios and generating alerts for CFO dashboard
import type { CFOSummary } from './cfo-summary';

export interface CFORatios {
  margin: number;
  profitPct: number;
}

export function calculateRatios(summary: CFOSummary): CFORatios {
  const { turnover, purchases, profitOrLoss } = summary;
  return {
    margin: turnover > 0 ? ((turnover - purchases) / turnover) * 100 : 0,
    profitPct: turnover > 0 ? (profitOrLoss / turnover) * 100 : 0,
  };
}

export function generateCFOAlerts(ratios: CFORatios): string[] {
  const alerts: string[] = [];
  if (ratios.margin < 20) alerts.push('Low margin: review purchasing policy.');
  if (ratios.profitPct < 5) alerts.push('Low profitability: consider cost optimization.');
  if (ratios.profitPct < 0) alerts.push('Negative result: critical situation.');
  return alerts;
}
