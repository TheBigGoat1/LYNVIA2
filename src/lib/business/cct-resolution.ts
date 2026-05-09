import cantonOverrides from '@/data/cct-canton-overrides.json';
import {
  CLA_RULES,
  resolveClaForIndustry,
  type ClaMatchType,
  type ClaRule,
} from '@/lib/cla-rules';

export type BusinessClaResolution = {
  cla: ClaRule;
  matchType: ClaMatchType;
  matchedAlias: string | null;
  canton: string | null;
  cantonOverrideApplied: boolean;
};

type CantonOverrideRow = {
  cantons: string[];
  industryIncludes: string[];
  claId: string;
};

function normalizeCanton(canton: string | null | undefined): string | null {
  if (!canton || typeof canton !== 'string') return null;
  const t = canton.trim().toLowerCase();
  if (!t) return null;
  return t.length === 2 ? t : t.slice(0, 2);
}

/**
 * Resolves the applicable CCT/CLA using **industry (field of work)** as primary input,
 * with optional **canton** refinements from `cct-canton-overrides.json`.
 * Falls back to `resolveClaForIndustry` when no canton-specific row matches.
 */
export function resolveClaForBusiness(
  industry: string,
  canton?: string | null,
): BusinessClaResolution {
  const c = normalizeCanton(canton ?? null);
  const normIndustry = industry.trim().toLowerCase();

  const rows = (cantonOverrides as { overrides: CantonOverrideRow[] }).overrides;
  if (c && normIndustry) {
    for (const row of rows) {
      const cantonHit = row.cantons.some((x) => x.toLowerCase() === c);
      if (!cantonHit) continue;
      for (const inc of row.industryIncludes) {
        if (normIndustry.includes(inc.toLowerCase())) {
          const cla = CLA_RULES.find((r) => r.id === row.claId);
          if (cla) {
            return {
              cla,
              matchType: 'exact',
              matchedAlias: industry.trim(),
              canton: c,
              cantonOverrideApplied: true,
            };
          }
        }
      }
    }
  }

  const base = resolveClaForIndustry(industry);
  return {
    ...base,
    canton: c,
    cantonOverrideApplied: false,
  };
}
