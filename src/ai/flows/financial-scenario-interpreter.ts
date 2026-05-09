'use server';

/**
 * @fileOverview A flow for interpreting financial scenario results using Vercel AI SDK + Groq.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { groq, DEFAULT_MODEL } from '@/ai/groq';

// Input Schema
const FinancialScenarioInterpreterInputSchema = z.object({
  scenarioType: z.string().describe('The type of financial scenario, e.g., "Salary Comparison", "Tax Optimization", "Allowance Analysis", "Pension Planning".'),
  scenarioInputs: z.object({
    grossSalary: z.number().optional().describe('Gross annual salary in CHF.'),
    canton: z.string().optional().describe('The Swiss canton relevant to the scenario.'),
    maritalStatus: z.enum(['single', 'married']).optional().describe('Marital status of the individual.'),
    dependents: z.number().optional().describe('Number of dependents.'),
    employmentRate: z.number().optional().describe('Employment rate in percentage.'),
    allowances: z.array(z.string()).optional().describe('List of allowances.'),
  }).describe('The original inputs provided for the financial scenario calculation.'),
  scenarioResults: z.object({
    netSalary: z.number().optional().describe('Calculated net annual salary in CHF.'),
    federalTax: z.number().optional().describe('Calculated federal tax in CHF.'),
    cantonalTax: z.number().optional().describe('Calculated cantonal tax in CHF.'),
    ahv: z.number().optional().describe('Calculated AHV/IV/EO contributions in CHF.'),
    alv: z.number().optional().describe('Calculated ALV contributions in CHF.'),
    bvg: z.number().optional().describe('Calculated BVG contributions in CHF.'),
    nbuv: z.number().optional().describe('Calculated NBUV contributions in CHF.'),
    totalDeductions: z.number().optional().describe('Total calculated deductions in CHF.'),
    effectiveTaxRate: z.number().optional().describe('Effective tax rate in percentage.'),
  }).describe('The calculated financial results of the scenario.')
});
export type FinancialScenarioInterpreterInput = z.infer<typeof FinancialScenarioInterpreterInputSchema>;

// Output Schema
const FinancialScenarioInterpreterOutputSchema = z.object({
  interpretation: z.string().describe('A clear, plain-language summary and interpretation of the financial scenario results.'),
  recommendations: z.string().describe('Actionable recommendations based on the interpretation, to help make informed financial decisions.'),
  potentialImpacts: z.string().describe('Description of potential financial impacts or changes resulting from the scenario analysis.'),
});
export type FinancialScenarioInterpreterOutput = z.infer<typeof FinancialScenarioInterpreterOutputSchema>;

export async function financialScenarioInterpreter(input: FinancialScenarioInterpreterInput): Promise<FinancialScenarioInterpreterOutput> {
  const result = await generateObject({
    model: groq(DEFAULT_MODEL),
    schema: FinancialScenarioInterpreterOutputSchema,
    system: `You are a highly skilled financial advisor specializing in Swiss finance. Your task is to provide a clear, plain-language interpretation of financial scenario results, offer actionable recommendations, and outline potential impacts.`,
    prompt: `You are interpreting financial scenario results for a Swiss individual.

Scenario Type: ${input.scenarioType}

Original Scenario Inputs:
${JSON.stringify(input.scenarioInputs, null, 2)}

Calculated Scenario Results:
${JSON.stringify(input.scenarioResults, null, 2)}

Please structure your response with the following sections:

Interpretation:
Provide a comprehensive and easy-to-understand summary of the results. Highlight key figures and what they mean for the user. Explain any significant changes or outcomes.

Recommendations:
Based on the interpretation, offer specific, actionable advice. These recommendations should help the user make informed financial decisions, potentially including ways to optimize taxes, manage expenses, or improve their financial standing.

Potential Impacts:
Describe the potential short-term and long-term financial impacts or changes that could result from the scenario analysis. This could include changes to disposable income, savings, tax burden, or overall financial health.`,
  });

  if (!result.object) {
    throw new Error('AI did not return a valid interpretation.');
  }

  return result.object;
}
