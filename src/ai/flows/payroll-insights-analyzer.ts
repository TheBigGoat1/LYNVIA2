'use server';

/**
 * @fileOverview This file implements a flow for analyzing payroll data using Vercel AI SDK + Groq.
 * It identifies anomalies, cost-saving opportunities, compliance risks, and provides recommendations.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, DEFAULT_MODEL } from '@/ai/groq';

const PayrollRecordSchema = z.object({
  employeeId: z.string().describe('The ID of the employee.'),
  grossSalary: z.number().describe('The employee\'s gross salary for the period.'),
  netSalary: z.number().describe('The employee\'s net salary for the period.'),
  federalTax: z.number().describe('Federal tax deduction.'),
  cantonalTax: z.number().describe('Cantonal tax deduction.'),
  ahv: z.number().describe('Old-age and survivors\' insurance contribution.'),
  alv: z.number().describe('Unemployment insurance contribution.'),
  bvg: z.number().describe('Occupational pension scheme contribution.'),
  nbuv: z.number().describe('Non-occupational accident insurance contribution.'),
});

const HistoricalPayrollSummarySchema = z.object({
  month: z.string().describe('The month and year of the historical payroll (YYYY-MM).'),
  totalGrossSalary: z.number().describe('Total gross salary for all employees in the period.'),
  totalNetSalary: z.number().describe('Total net salary for all employees in the period.'),
  totalDeductions: z.number().describe('Total deductions for all employees in the period.'),
  employeeCount: z.number().describe('Total number of employees in the period.'),
});

const PayrollInsightsAnalyzerInputSchema = z.object({
  companyId: z.string().describe('The ID of the company whose payroll is being analyzed.'),
  month: z.string().describe('The month and year for which the payroll data is being analyzed (YYYY-MM).'),
  currentPayrollRecords: z.array(PayrollRecordSchema).describe('An array of detailed payroll records for the current period.'),
  historicalPayrollSummary: z.array(HistoricalPayrollSummarySchema).optional().describe('An optional array of summarized historical payroll data for trend analysis.'),
});
export type PayrollInsightsAnalyzerInput = z.infer<typeof PayrollInsightsAnalyzerInputSchema>;

const PayrollInsightsAnalyzerOutputSchema = z.object({
  summary: z.string().describe('A concise overall summary of the payroll analysis.'),
  anomalies: z.array(z.string()).describe('An array of detected anomalies in the payroll data.'),
  costSavingOpportunities: z.array(z.string()).describe('An array of potential cost-saving measures identified.'),
  complianceRisks: z.array(z.string()).describe('An array of potential compliance risks or inconsistencies.'),
  recommendations: z.array(z.string()).describe('An array of actionable recommendations based on the analysis.'),
});
export type PayrollInsightsAnalyzerOutput = z.infer<typeof PayrollInsightsAnalyzerOutputSchema>;

export async function payrollInsightsAnalyzer(input: PayrollInsightsAnalyzerInput): Promise<PayrollInsightsAnalyzerOutput> {
  const historicalText = input.historicalPayrollSummary && input.historicalPayrollSummary.length > 0
    ? `\nHistorical Payroll Summary for previous periods (use this to identify trends or significant deviations):\n${JSON.stringify(input.historicalPayrollSummary, null, 2)}`
    : '';

  const result = await generateObject({
    model: groq(DEFAULT_MODEL),
    schema: PayrollInsightsAnalyzerOutputSchema,
    system: `You are a highly experienced Swiss financial payroll analyst. Your task is to analyze the provided payroll data for a company and identify any anomalies, potential cost-saving opportunities, and compliance risks. Also, provide actionable recommendations based on your analysis.

Ensure your analysis is thorough, professional, and tailored to Swiss financial regulations where applicable. If no specific anomalies, opportunities, or risks are found, return an empty array for those fields.`,
    prompt: `You are analyzing payroll data for the company '${input.companyId}' for the month of '${input.month}'.

Current Payroll Data for ${input.month}:
${JSON.stringify(input.currentPayrollRecords, null, 2)}${historicalText}

Your response MUST be a JSON object with the following fields:
- summary: A concise overall summary of your payroll analysis.
- anomalies: An array of strings, each describing a detected anomaly (e.g., "Unusually high overtime for employee X").
- costSavingOpportunities: An array of strings, each suggesting a potential cost-saving measure (e.g., "Review pension fund options for employees earning above Y CHF").
- complianceRisks: An array of strings, each highlighting a potential compliance risk (e.g., "Federal tax calculation for employee Z seems incorrect").
- recommendations: An array of strings, each providing an actionable recommendation.`,
  });

  if (!result.object) {
    throw new Error('AI did not return a valid analysis.');
  }

  return result.object;
}
