import { taxServices } from '@/data/tax-services';
import type { TaxDeclarationServiceId } from '@/lib/tax-service-pricing';

export type TaxMasterProfileLite = {
  maritalStatus?: 'single' | 'married';
  dependents?: number;
};

export type PricingSelectionsLite = {
  children?: string;
  properties?: string;
  bankAssets?: string;
  dependents?: string;
};

export type MandatoryTaxDoc = { id: string; labelKey: string };

export const TAX_SERVICE_IDS = new Set(taxServices.map((s) => s.id));

export function isYearlyTaxReturnOrder(order: {
  serviceId?: string;
  orderType?: string;
}): boolean {
  if (order.orderType === 'tax') return true;
  if (order.serviceId && TAX_SERVICE_IDS.has(order.serviceId as TaxDeclarationServiceId)) return true;
  return false;
}

/** Same rules as the Yearly Tax Return follow-up page (mandatory uploads). */
export function getMandatoryTaxDocuments(
  serviceId: string | undefined,
  profile: TaxMasterProfileLite | null,
  intake: PricingSelectionsLite | undefined,
): MandatoryTaxDoc[] {
  const docs: MandatoryTaxDoc[] = [
    { id: 'salary_certificate', labelKey: 'docs.salaryCertificate' },
    { id: 'bank_statement', labelKey: 'docs.bankStatement' },
    { id: 'pillar3a_certificate', labelKey: 'docs.pillar3aCertificate' },
  ];
  const isCouple = serviceId?.startsWith('couple') || profile?.maritalStatus === 'married';
  if (isCouple) {
    docs.push({ id: 'spouse_salary', labelKey: 'docs.spouseSalary' });
  }
  const hasChildren =
    (intake?.children && intake.children !== '0') ||
    (intake?.dependents && intake.dependents !== '0') ||
    (profile?.dependents && profile.dependents > 0);
  if (hasChildren) {
    docs.push({ id: 'childcare_certificate', labelKey: 'docs.childcareCertificate' });
  }
  if (intake?.properties && intake.properties !== '0') {
    docs.push({ id: 'property_statement', labelKey: 'docs.propertyStatement' });
  }
  return docs;
}
