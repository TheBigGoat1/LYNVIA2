import claRulesData from '@/data/cla-rules.generated.json';

export type ClaNoticePeriod = {
  trialPeriodDays: number;
  year1Months: number;
  year2to9Months: number;
  year10PlusMonths: number;
};

export type ClaWageByRole = {
  role: string;
  minimumMonthlyWage: number;
  minimumHourlyWage: number;
};

export type ClaRule = {
  id: string;
  name: string;
  nameFr: string;
  industries: string[];
  minimumMonthlyWage: number;
  minimumHourlyWage: number;
  noticePeriods: ClaNoticePeriod;
  wagesByRole: ClaWageByRole[];
  cctUrl: string;
  legalBasis: string;
};

export type ClaMatchType = 'exact' | 'contains' | 'fallback';

export type ClaResolution = {
  cla: ClaRule;
  matchType: ClaMatchType;
  matchedAlias: string | null;
};



const normalize = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_()]/g, ' ')
    .replace(/[^a-z0-9\s'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const CLA_RULES: ClaRule[] = (claRulesData as { rules: ClaRule[] }).rules;

export function resolveClaForIndustry(industry: string): ClaResolution {
  const normalizedIndustry = normalize(industry);

  const exactMatch = CLA_RULES.find((rule) =>
    rule.industries.some((alias) => normalize(alias) === normalizedIndustry),
  );
  if (exactMatch) {
    const matchedAlias =
      exactMatch.industries.find((alias) => normalize(alias) === normalizedIndustry) ?? null;
    return { cla: exactMatch, matchType: 'exact', matchedAlias };
  }

  const containsMatch = CLA_RULES.find((rule) =>
    rule.industries.some((alias) => {
      const nAlias = normalize(alias);
      return normalizedIndustry.includes(nAlias) || nAlias.includes(normalizedIndustry);
    }),
  );
  if (containsMatch) {
    const matchedAlias =
      containsMatch.industries.find((alias) => {
        const nAlias = normalize(alias);
        return normalizedIndustry.includes(nAlias) || nAlias.includes(normalizedIndustry);
      }) ?? null;
    return { cla: containsMatch, matchType: 'contains', matchedAlias };
  }

  return {
    cla: CLA_RULES.find((rule) => rule.id === 'default-co') ?? CLA_RULES[CLA_RULES.length - 1],
    matchType: 'fallback',
    matchedAlias: null,
  };
}

export function resolveClaSafe(industry?: string | null): ClaResolution {
  const input = (industry ?? '').trim();
  if (!input) {
    return {
      cla: CLA_RULES.find((rule) => rule.id === 'default-co') ?? CLA_RULES[CLA_RULES.length - 1],
      matchType: 'fallback',
      matchedAlias: null,
    };
  }
  return resolveClaForIndustry(input);
}

export function getClaForIndustry(industry: string): ClaRule {
  return resolveClaForIndustry(industry).cla;
}

export type SalaryValidationResult = {
  isBelowMinimum: boolean;
  claMinimum: number;
  proposedSalary: number;
  claName: string;
  matchingRole: string | null;
  severity: 'blocking' | 'warning' | 'ok';
  message: string;
};

export function validateSalaryAgainstCla(
  cla: ClaRule,
  proposedMonthlySalary: number,
  role?: string,
): SalaryValidationResult {
  if (cla.minimumMonthlyWage === 0) {
    return {
      isBelowMinimum: false,
      claMinimum: 0,
      proposedSalary: proposedMonthlySalary,
      claName: cla.name,
      matchingRole: null,
      severity: 'ok',
      message:
        'No minimum wage has been codified in-app for this CLA yet. Check source CCT documents before approving salary.',
    };
  }

  let matchingRole: ClaWageByRole | undefined;
  if (role && cla.wagesByRole?.length > 0) {
    const normalizedRole = normalize(role);
    matchingRole = cla.wagesByRole.find(
      (w) =>
        normalize(w.role) === normalizedRole ||
        normalizedRole.includes(normalize(w.role)) ||
        normalize(w.role).includes(normalizedRole),
    );
  }

  const applicableMinimum = matchingRole?.minimumMonthlyWage ?? cla.minimumMonthlyWage;
  const isBelowMinimum = proposedMonthlySalary < applicableMinimum;

  if (!isBelowMinimum) {
    return {
      isBelowMinimum: false,
      claMinimum: applicableMinimum,
      proposedSalary: proposedMonthlySalary,
      claName: cla.name,
      matchingRole: matchingRole?.role ?? null,
      severity: 'ok',
      message: `Salary is compliant with ${cla.name}.`,
    };
  }

  const deficit = applicableMinimum - proposedMonthlySalary;
  return {
    isBelowMinimum: true,
    claMinimum: applicableMinimum,
    proposedSalary: proposedMonthlySalary,
    claName: cla.name,
    matchingRole: matchingRole?.role ?? null,
    severity: 'blocking',
    message: `The proposed salary of CHF ${proposedMonthlySalary.toLocaleString('fr-CH')} is CHF ${deficit.toLocaleString('fr-CH')} below the CLA minimum of CHF ${applicableMinimum.toLocaleString('fr-CH')} (${cla.name}${matchingRole ? ` - ${matchingRole.role}` : ''}).`,
  };
}

export type NoticePeriodValidationResult = {
  isCompliant: boolean;
  requiredMonths: number;
  proposedText: string;
  claName: string;
  severity: 'warning' | 'ok';
  message: string;
};

export function validateNoticePeriodAgainstCla(
  cla: ClaRule,
  proposedNoticePeriod: string,
  yearsOfService: number,
): NoticePeriodValidationResult {
  const np = cla.noticePeriods;
  let requiredMonths: number;
  if (yearsOfService < 1) {
    requiredMonths = np.year1Months;
  } else if (yearsOfService < 10) {
    requiredMonths = np.year2to9Months;
  } else {
    requiredMonths = np.year10PlusMonths;
  }

  const proposedMonths = parseNoticePeriodToMonths(proposedNoticePeriod);

  if (proposedMonths === null) {
    return {
      isCompliant: false,
      requiredMonths,
      proposedText: proposedNoticePeriod,
      claName: cla.name,
      severity: 'warning',
      message: `Could not parse the proposed notice period. The ${cla.name} requires at least ${requiredMonths} month(s) for ${yearsOfService} year(s) of service.`,
    };
  }

  if (proposedMonths >= requiredMonths) {
    return {
      isCompliant: true,
      requiredMonths,
      proposedText: proposedNoticePeriod,
      claName: cla.name,
      severity: 'ok',
      message: `Notice period is compliant with ${cla.name}.`,
    };
  }

  return {
    isCompliant: false,
    requiredMonths,
    proposedText: proposedNoticePeriod,
    claName: cla.name,
    severity: 'warning',
    message: `The proposed notice period of "${proposedNoticePeriod}" is shorter than the ${requiredMonths} month(s) required by ${cla.name} for ${yearsOfService} year(s) of service.`,
  };
}

/** @deprecated use validateNoticePeriodAgainstCla */
export const validateNoticePeriod = validateNoticePeriodAgainstCla;

function parseNoticePeriodToMonths(text: string): number | null {
  const normalizedText = text.trim().toLowerCase();
  const monthMatch = normalizedText.match(/(\d+)\s*(mois|month|months|monat|monate|mese|mesi)/);
  if (monthMatch) return parseInt(monthMatch[1], 10);

  const weekMatch = normalizedText.match(/(\d+)\s*(semaine|semaines|week|weeks|woche|wochen)/);
  if (weekMatch) return Math.ceil(parseInt(weekMatch[1], 10) / 4);

  const dayMatch = normalizedText.match(/(\d+)\s*(jour|jours|day|days|tag|tage)/);
  if (dayMatch) return Math.ceil(parseInt(dayMatch[1], 10) / 30);

  return null;
}

export function buildClaContextForAI(cla: ClaRule): string {
  const lines: string[] = [
    '=== APPLICABLE COLLECTIVE LABOUR AGREEMENT (CCT / CLA) ===',
    `Name: ${cla.name}`,
    `French name: ${cla.nameFr}`,
    `Legal basis: ${cla.legalBasis}`,
    `Reference URL: ${cla.cctUrl}`,
    '',
    '--- Minimum Wages ---',
  ];

  if (cla.minimumMonthlyWage > 0) {
    lines.push(`General minimum monthly wage: CHF ${cla.minimumMonthlyWage.toLocaleString('fr-CH')}`);
    lines.push(`General minimum hourly wage: CHF ${cla.minimumHourlyWage.toFixed(2)}`);
  } else {
    lines.push('No CLA-mandated minimum wage has been codified in-app for this industry yet.');
    lines.push('Use source CCT PDFs under Conventions_Collectives for exact wage values.');
  }

  if (cla.wagesByRole.length > 0) {
    lines.push('', 'Wages by role:');
    for (const w of cla.wagesByRole) {
      lines.push(
        `  - ${w.role}: CHF ${w.minimumMonthlyWage.toLocaleString('fr-CH')}/month (CHF ${w.minimumHourlyWage.toFixed(2)}/hr)`,
      );
    }
  }

  const np = cla.noticePeriods;
  lines.push(
    '',
    '--- Notice Periods (Delai de conge) ---',
    `During trial period: ${np.trialPeriodDays} days`,
    `1st year of service: ${np.year1Months} month(s)`,
    `2-9 years of service: ${np.year2to9Months} month(s)`,
    `10+ years of service: ${np.year10PlusMonths} month(s)`,
    '',
    'IMPORTANT: If wage values are not codified, fetch exact amounts from source CCT PDFs.',
    '=== END CLA CONTEXT ===',
  );

  return lines.join('\n');
}
