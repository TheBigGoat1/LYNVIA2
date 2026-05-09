/**
 * Revenue Growth Scenario Calculator
 *
 * Restored from original codebase + enhanced with:
 *   - Annual fixed costs (charges fixes annuelles)
 *   - Social charges pulled from single source of truth
 *   - TVA threshold alert
 */

import {
  AHV_IV_EO_RATE,
  AHV_IV_EO_EMPLOYER_RATE,
  ALV_RATE,
  ALV_EMPLOYER_RATE,
  NBUV_DEFAULT_RATE,
  CAF_DEFAULT_RATE,
} from "@/lib/social-insurance-rates";

// ─── Types ──────────────────────────────────────────────────────

export interface RevenueGrowthInput {
  caActuel: number;            // Current annual revenue
  nouveauCA: number;           // Projected new annual revenue
  achatsActuels: number;       // Current purchases / COGS
  augmentationAchats: number;  // Purchases growth (%)
  salairesActuels: number;     // Current gross salaries (annual)
  augmentationSalaires: number; // Salaries growth (%)
  fraisActuels: number;        // Current operating expenses
  augmentationFrais: number;   // Expenses growth (%)
  autresActuels: number;       // Current other charges
  augmentationAutres: number;  // Other charges growth (%)
  chargesFinancieres: number;  // Financial charges (interest etc)
  chargesFixesAnnuelles: number; // [NEW] Annual fixed costs (non-scaling)
}

export interface RevenueGrowthResult {
  // Current state
  currentResult: number;
  currentMargin: number;

  // Projected (new) state
  nouveauxAchats: number;
  nouveauxSalaires: number;
  chargesSociales: number;      // computed from social insurance rates
  nouveauxFrais: number;
  nouveauxAutres: number;
  chargesFinancieres: number;
  chargesFixesAnnuelles: number;
  totalCharges: number;
  nouveauResultat: number;
  nouvelleMarge: number;        // gross margin %
  nouveauResultatPct: number;   // net result as % of revenue

  // Deltas
  deltaResultat: number;
  deltaMarge: number;
  deltaResultatPct: number;

  // Alerts
  tvaThresholdAlert: boolean;  // new revenue > 100k → mandatory VAT
  revenueGrowthPct: number;
}

// ─── Calculation ────────────────────────────────────────────────

/** Total social charges rate (employer share) applied on gross salaries */
const SOCIAL_CHARGES_RATE =
  AHV_IV_EO_EMPLOYER_RATE + // AHV/IV/EO employer
  ALV_EMPLOYER_RATE +        // ALV employer
  NBUV_DEFAULT_RATE +        // NBUV (accident)
  CAF_DEFAULT_RATE;          // CAF

export function calculateRevenueGrowth(input: RevenueGrowthInput): RevenueGrowthResult {
  const {
    caActuel,
    nouveauCA,
    achatsActuels,
    augmentationAchats,
    salairesActuels,
    augmentationSalaires,
    fraisActuels,
    augmentationFrais,
    autresActuels,
    augmentationAutres,
    chargesFinancieres,
    chargesFixesAnnuelles,
  } = input;

  // ── Current state ──
  const currentChargesSociales = salairesActuels * SOCIAL_CHARGES_RATE;
  const currentTotalCharges =
    achatsActuels +
    salairesActuels +
    currentChargesSociales +
    fraisActuels +
    chargesFinancieres +
    autresActuels +
    chargesFixesAnnuelles;
  const currentResult = caActuel - currentTotalCharges;
  const currentMargin = caActuel > 0 ? ((caActuel - achatsActuels) / caActuel) * 100 : 0;

  // ── Projected state ──
  const nouveauxAchats = achatsActuels * (1 + augmentationAchats / 100);
  const nouveauxSalaires = salairesActuels * (1 + augmentationSalaires / 100);
  const chargesSociales = nouveauxSalaires * SOCIAL_CHARGES_RATE;
  const nouveauxFrais = fraisActuels * (1 + augmentationFrais / 100);
  const nouveauxAutres = autresActuels * (1 + augmentationAutres / 100);

  // Fixed costs do NOT scale with revenue
  const totalCharges =
    nouveauxAchats +
    nouveauxSalaires +
    chargesSociales +
    nouveauxFrais +
    chargesFinancieres +
    nouveauxAutres +
    chargesFixesAnnuelles;

  const nouveauResultat = nouveauCA - totalCharges;
  const nouvelleMarge = nouveauCA > 0 ? ((nouveauCA - nouveauxAchats) / nouveauCA) * 100 : 0;
  const nouveauResultatPct = nouveauCA > 0 ? (nouveauResultat / nouveauCA) * 100 : 0;
  const currentResultPct = caActuel > 0 ? (currentResult / caActuel) * 100 : 0;

  return {
    currentResult,
    currentMargin,
    nouveauxAchats,
    nouveauxSalaires,
    chargesSociales,
    nouveauxFrais,
    nouveauxAutres,
    chargesFinancieres,
    chargesFixesAnnuelles,
    totalCharges,
    nouveauResultat,
    nouvelleMarge,
    nouveauResultatPct,
    deltaResultat: nouveauResultat - currentResult,
    deltaMarge: nouvelleMarge - currentMargin,
    deltaResultatPct: nouveauResultatPct - currentResultPct,
    tvaThresholdAlert: nouveauCA > 100_000,
    revenueGrowthPct: caActuel > 0 ? ((nouveauCA - caActuel) / caActuel) * 100 : 0,
  };
}
