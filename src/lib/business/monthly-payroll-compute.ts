/** Shared payroll estimation (client + API) — keep in sync with Payslips Communications UI. */

export const VEHICLE_RATE_CHF_PER_KM = 0.7;

export type PayrollEmployeeSnapshot = {
  typeRemu: 'horaire' | 'mensuel';
  salaireMensuel: number;
  salaireHoraire: number;
};

export type MonthlyPayrollFields = {
  hours: number;
  feesToReimburse: number;
  feesToDeduct: number;
  privateVehicleKm: number;
  mealsToReimburse: number;
  mealsToDeduct: number;
  bonus: number;
  prime: number;
};

export function computeEstimatedGross(employee: PayrollEmployeeSnapshot, fields: MonthlyPayrollFields): number {
  const baseSalary =
    employee.typeRemu === 'horaire'
      ? fields.hours * employee.salaireHoraire
      : employee.salaireMensuel;
  return (
    baseSalary +
    fields.feesToReimburse -
    fields.feesToDeduct +
    fields.privateVehicleKm * VEHICLE_RATE_CHF_PER_KM +
    fields.mealsToReimburse -
    fields.mealsToDeduct +
    fields.bonus +
    fields.prime
  );
}
