const SIGNIFICANT_KEYS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'position',
  'typeRemu',
  'salaireHoraire',
  'salaireMensuel',
  'tauxActivite',
  'semainesVacances',
  'numeroAVS',
  'iban',
  'rue',
  'ville',
  'codePostal',
  'residencePermit',
  'maritalStatus',
  'hasChildren',
  'taxAtSource',
  'children',
] as const;

function stableStringifyChildren(children: unknown): string {
  if (!Array.isArray(children)) return '[]';
  return JSON.stringify(
    children.map((c: Record<string, unknown>) => ({
      firstName: c.firstName,
      lastName: c.lastName,
      dateOfBirth: c.dateOfBirth,
      sharedCustody: c.sharedCustody,
      otherParentFirstName: c.otherParentFirstName,
      otherParentLastName: c.otherParentLastName,
      otherParentAddress: c.otherParentAddress,
      otherParentAVS: c.otherParentAVS,
    })),
  );
}

/** Human-readable list of materially changed employee fields (HR / payroll relevance). */
export function describeEmployeeMaterialChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): string[] {
  if (!before) return [];
  const changes: string[] = [];
  for (const key of SIGNIFICANT_KEYS) {
    if (key === 'children') {
      const prev = stableStringifyChildren(before.children);
      const next = stableStringifyChildren(after.children);
      if (prev !== next) changes.push('children / custody');
      continue;
    }
    if (before[key] !== after[key]) changes.push(key);
  }
  return changes;
}
