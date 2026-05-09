/** Shared salary ↔ monthly equivalent logic (client + API). */

export type EmployeeCompensationInput = {
  typeRemu: 'horaire' | 'mensuel';
  salaireHoraire: number;
  salaireMensuel: number;
  tauxActivite: number;
  semainesVacances: number;
};

function pctVacancesFromWeeks(weeks: number) {
  if (weeks === 5) return 0.1064;
  if (weeks === 6) return 0.1304;
  return 0.0833;
}

function calcBrutToutCompris(salaireHoraire: number, semainesVacances: number) {
  const pctVac = pctVacancesFromWeeks(semainesVacances);
  const pctFeries = 0.0227;
  const pct13e = 0.0833;
  const vVac = salaireHoraire * pctVac;
  const vFer = salaireHoraire * pctFeries;
  const base = salaireHoraire + vVac + vFer;
  const v13 = base * pct13e;
  const brut = base + v13;
  return { brutToutCompris: brut };
}

/** Full-time monthly equivalent for CLA / LPP checks (matches Employee Management UI). */
export function getMonthlySalaryEquivalent(values: EmployeeCompensationInput): number {
  const activityRate = Math.max(values.tauxActivite, 0) / 100;
  if (values.typeRemu === 'mensuel') {
    return values.salaireMensuel * activityRate;
  }
  const hourlyBreakdown = calcBrutToutCompris(values.salaireHoraire, values.semainesVacances);
  return hourlyBreakdown.brutToutCompris * 173.33 * activityRate;
}
