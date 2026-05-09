import complianceMeta from '@/data/cct-compliance-meta.json';

type VacationMap = Record<string, number>;
type MetaShape = {
  vacationMinWeeksByClaId: VacationMap;
  thirteenthSalaryHintClaIds: string[];
};

const meta = complianceMeta as MetaShape;

/** Swiss Code of Obligations minimum vacation: 4 weeks (20 days); 5 weeks for under-20s. */
export function swissCoMinimumVacationWeeks(dateOfBirth?: string | null): number {
  if (!dateOfBirth?.trim()) return 4;
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return 4;
  const year = new Date().getFullYear();
  const age = year - d.getFullYear();
  return age < 20 ? 5 : 4;
}

/** Effective minimum vacation weeks = max(CO rule, sector CCT floor when configured). */
export function getRequiredVacationWeeks(claId: string | undefined, dateOfBirth?: string | null): number {
  const co = swissCoMinimumVacationWeeks(dateOfBirth);
  if (!claId) return co;
  const sector = meta.vacationMinWeeksByClaId[claId];
  if (sector == null) return co;
  return Math.max(co, sector);
}

export function claSuggestsThirteenthSalary(claId: string | undefined): boolean {
  if (!claId) return false;
  return meta.thirteenthSalaryHintClaIds.includes(claId);
}

export function companyHasLppPlan(employeeInsurances: unknown): boolean {
  return Array.isArray(employeeInsurances) && employeeInsurances.includes('lpp');
}
