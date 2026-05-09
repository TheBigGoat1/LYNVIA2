export type AccountingSubscriptionPlan = 'basic' | 'pro';

export type AccountingFeature =
  | 'ai_chat'
  | 'vat_scenarios'
  | 'taxation_tools'
  | 'salary_tools'
  | 'client_access_portal'
  | 'document_exchange'
  | 'client_notifications';

export type AccountingPlanDefinition = {
  id: AccountingSubscriptionPlan;
  title: string;
  monthlyPriceChf: number;
  trialDays: number;
  description: string;
  features: AccountingFeature[];
  featureLabels: string[];
};

export const ACCOUNTING_PLAN_ORDER: AccountingSubscriptionPlan[] = ['basic', 'pro'];

export const ACCOUNTING_PLANS: AccountingPlanDefinition[] = [
  {
    id: 'basic',
    title: 'Basic',
    monthlyPriceChf: 20,
    trialDays: 30,
    description: 'AI chat access only.',
    features: ['ai_chat'],
    featureLabels: ['AI chat access only'],
  },
  {
    id: 'pro',
    title: 'Pro',
    monthlyPriceChf: 99,
    trialDays: 30,
    description: 'Full accounting access with analytics and client collaboration workflows.',
    features: [
      'ai_chat',
      'vat_scenarios',
      'taxation_tools',
      'salary_tools',
      'client_access_portal',
      'document_exchange',
      'client_notifications',
    ],
    featureLabels: [
      'AI chat access',
      'VAT calculation scenarios',
      'Taxation tools',
      'Salary calculation and tax optimization tools',
      'Client access to accounts and analyses',
      'Document exchange with clients',
      'Send notifications to clients',
    ],
  },
];

export const DEFAULT_ACCOUNTING_PLAN: AccountingSubscriptionPlan = 'basic';

export function getAccountingPlan(plan?: string | null): AccountingPlanDefinition {
  return ACCOUNTING_PLANS.find((entry) => entry.id === plan) ?? ACCOUNTING_PLANS[0];
}

export function isPlanAtLeast(current: AccountingSubscriptionPlan, required: AccountingSubscriptionPlan): boolean {
  return ACCOUNTING_PLAN_ORDER.indexOf(current) >= ACCOUNTING_PLAN_ORDER.indexOf(required);
}
