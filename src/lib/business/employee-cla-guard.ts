import { resolveClaForBusiness } from '@/lib/business/cct-resolution';
import { getMonthlySalaryEquivalent, type EmployeeCompensationInput } from '@/lib/business/employee-compensation';
import type { EmployeeFormValues } from '@/lib/business/employee-firestore-schema';

export function assertEmployeeMeetsClaMinimum(
  industry: string | undefined,
  canton: string | undefined,
  values: EmployeeFormValues,
): { ok: true } | { ok: false; message: string } {
  const ind = industry?.trim();
  if (!ind) return { ok: true };

  const { cla } = resolveClaForBusiness(ind, canton ?? null);
  const min = cla.minimumMonthlyWage;
  if (!min || min <= 0) return { ok: true };

  const comp: EmployeeCompensationInput = {
    typeRemu: values.typeRemu,
    salaireHoraire: values.salaireHoraire,
    salaireMensuel: values.salaireMensuel,
    tauxActivite: values.tauxActivite,
    semainesVacances: values.semainesVacances,
  };
  const monthly = getMonthlySalaryEquivalent(comp);
  if (monthly < min) {
    return {
      ok: false,
      message: `Salary is below the CLA minimum (CHF ${min.toLocaleString('fr-CH')}/month) for ${cla.name}.`,
    };
  }
  return { ok: true };
}
