'use server';

/**
 * @fileOverview Flow for analyzing a company's financial accounts (P&L figures) using Vercel AI SDK + Groq.
 * The admin uploads processed accounts to Firestore; this flow analyzes those figures
 * and returns financial insights, risks, and recommendations.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, DEFAULT_MODEL } from '@/ai/groq';

const CFOFinancialAnalyzerInputSchema = z.object({
  companyId: z.string().describe('The ID of the company.'),
  companyName: z.string().describe('The name of the company.'),
  period: z.string().describe('The accounting period (e.g. "T1 2025", "2024").'),
  turnover: z.number().describe('Total turnover / revenue in CHF.'),
  purchases: z.number().describe('Total purchases / cost of goods in CHF.'),
  rawWages: z.number().describe('Raw wages (direct labour) in CHF.'),
  salaryExpenses: z.number().describe('Total salary expenses including social charges in CHF.'),
  operatingCosts: z.number().describe('Other operating costs in CHF.'),
  financialCharges: z.number().describe('Financial charges (interest, bank fees) in CHF.'),
  otherCharges: z.number().describe('Other charges in CHF.'),
  profitOrLoss: z.number().describe('Net profit or loss for the period in CHF.'),
});
export type CFOFinancialAnalyzerInput = z.infer<typeof CFOFinancialAnalyzerInputSchema>;

const CFOFinancialAnalyzerOutputSchema = z.object({
  summary: z.string().describe('A concise executive summary of the financial situation.'),
  keyRatios: z.array(z.string()).describe('Key financial ratios and what they indicate (e.g. gross margin, wage-to-turnover ratio).'),
  risks: z.array(z.string()).describe('Financial risks or warning signs identified.'),
  opportunities: z.array(z.string()).describe('Cost optimisation or revenue growth opportunities.'),
  recommendations: z.array(z.string()).describe('Actionable recommendations for the business owner.'),
});
export type CFOFinancialAnalyzerOutput = z.infer<typeof CFOFinancialAnalyzerOutputSchema>;

export async function cfoFinancialAnalyzer(input: CFOFinancialAnalyzerInput): Promise<CFOFinancialAnalyzerOutput> {
  const result = await generateObject({
    model: groq(DEFAULT_MODEL),
    schema: CFOFinancialAnalyzerOutputSchema,
    system: `You are a senior Swiss CFO and financial advisor. You are reviewing the processed accounts for a company and providing analysis based on Swiss accounting norms (Plan comptable romand / Swiss GAAP).`,
    prompt: `You are reviewing the processed accounts for the company "${input.companyName}" (ID: ${input.companyId}) for the period "${input.period}".

All figures are in CHF.

INCOME STATEMENT SUMMARY:
- Turnover / Revenue: ${input.turnover}
- Purchases / Cost of goods: ${input.purchases}
- Raw wages (direct labour): ${input.rawWages}
- Total salary expenses (incl. social charges): ${input.salaryExpenses}
- Operating costs: ${input.operatingCosts}
- Financial charges: ${input.financialCharges}
- Other charges: ${input.otherCharges}
- NET PROFIT / (LOSS): ${input.profitOrLoss}

Derived ratios to compute and comment on:
- Gross margin = (Turnover - Purchases) / Turnover
- Wage-to-turnover ratio = Salary expenses / Turnover
- Operating cost ratio = Operating costs / Turnover
- Net margin = Profit or Loss / Turnover

Provide your analysis in the following JSON structure:
- summary: A 2–3 sentence executive summary of the financial health of this company.
- keyRatios: An array of strings, each stating one ratio and a brief interpretation (e.g. "Gross margin: 42% — healthy for retail but below sector average of 50%").
- risks: An array of strings identifying specific financial risks or warning signs (e.g. "Wage-to-turnover ratio of 55% is elevated; salary costs are consuming over half of revenue").
- opportunities: An array of strings for realistic cost or revenue improvement opportunities.
- recommendations: An array of concrete, actionable recommendations tailored to Swiss SME context.

Be specific, use the actual numbers, and calibrate your language to Swiss accounting norms. If the business is profitable, acknowledge it but still identify areas to monitor.`,
  });

  if (!result.object) {
    throw new Error('AI did not return a valid analysis.');
  }

  return result.object;
}
