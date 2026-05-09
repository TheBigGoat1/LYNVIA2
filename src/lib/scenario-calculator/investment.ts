/**
 * Investment Scenario Calculators
 *
 * Sub-calculator 1: Compound Interest (UBS-style)
 * Sub-calculator 2: Rental Yield (Comptoir Immo-style + original ROI/DSCR ratios)
 */

import { formatCHF } from './calculations';

// ──────────────────────────────────────────────────
// 1. Compound Interest Calculator
// ──────────────────────────────────────────────────

export interface CompoundInterestInput {
  capitalInitial: number;       // Starting capital (CHF)
  versementPeriodique: number;  // Periodic contribution (CHF)
  frequenceVersement: 'monthly' | 'quarterly' | 'annual';
  tauxRendementAnnuel: number;  // Annual return rate (e.g. 5 for 5%)
  dureeAnnees: number;          // Investment horizon (years)
  frequenceCapitalisation: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
}

export interface CompoundInterestYearRow {
  year: number;
  capitalDebut: number;    // Capital at start of year
  versements: number;      // Contributions during year
  interets: number;        // Interest earned during year
  capitalFin: number;      // Capital at end of year
}

export interface CompoundInterestResult {
  capitalFinal: number;           // Total future value
  totalVerse: number;             // Total contributions (capital + PMTs)
  plusValue: number;              // Total gains
  rendementTotal: number;         // Total return %
  rendementAnnualise: number;     // Annualised return %
  yearlyBreakdown: CompoundInterestYearRow[];
}

function getPeriodsPerYear(freq: 'monthly' | 'quarterly' | 'semi-annual' | 'annual'): number {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'semi-annual': return 2;
    case 'annual': return 1;
  }
}

function getContributionsPerYear(freq: 'monthly' | 'quarterly' | 'annual'): number {
  switch (freq) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'annual': return 1;
  }
}

export function calculateCompoundInterest(input: CompoundInterestInput): CompoundInterestResult {
  const {
    capitalInitial,
    versementPeriodique,
    frequenceVersement,
    tauxRendementAnnuel,
    dureeAnnees,
    frequenceCapitalisation,
  } = input;

  const n = getPeriodsPerYear(frequenceCapitalisation); // compounding periods per year
  const r = tauxRendementAnnuel / 100; // annual rate as decimal
  const ratePerPeriod = r / n;
  const contributionsPerYear = getContributionsPerYear(frequenceVersement);
  const annualContribution = versementPeriodique * contributionsPerYear;

  const yearlyBreakdown: CompoundInterestYearRow[] = [];
  let currentCapital = capitalInitial;
  let totalContributions = capitalInitial;

  for (let year = 1; year <= dureeAnnees; year++) {
    const capitalDebut = currentCapital;
    let yearInterest = 0;

    // Simulate each compounding period within the year
    for (let p = 0; p < n; p++) {
      // Interest for this period
      const interest = currentCapital * ratePerPeriod;
      yearInterest += interest;
      currentCapital += interest;

      // Add contributions proportionally within the period
      // If contribution freq aligns with compounding freq, add at each period
      // Otherwise distribute evenly
      const contributionThisPeriod = annualContribution / n;
      currentCapital += contributionThisPeriod;
    }

    totalContributions += annualContribution;

    yearlyBreakdown.push({
      year,
      capitalDebut,
      versements: annualContribution,
      interets: yearInterest,
      capitalFin: currentCapital,
    });
  }

  const capitalFinal = currentCapital;
  const totalVerse = totalContributions;
  const plusValue = capitalFinal - totalVerse;
  const rendementTotal = totalVerse > 0 ? (plusValue / totalVerse) * 100 : 0;
  const rendementAnnualise = dureeAnnees > 0
    ? (Math.pow(capitalFinal / capitalInitial, 1 / dureeAnnees) - 1) * 100
    : 0;

  return {
    capitalFinal,
    totalVerse,
    plusValue,
    rendementTotal,
    rendementAnnualise,
    yearlyBreakdown,
  };
}


// ──────────────────────────────────────────────────
// 2. Rental Yield Calculator (Comptoir Immo-style)
// ──────────────────────────────────────────────────

export interface RentalYieldInput {
  // Property acquisition
  prixAchat: number;             // Purchase price
  fraisNotaire: number;          // Notary fees
  fraisAgence: number;           // Agency fees
  travaux: number;               // Renovation work

  // Revenue
  loyerMensuel: number;          // Monthly rent
  tauxVacance: number;           // Vacancy rate % (e.g. 5 for 5%)

  // Annual charges
  chargesPPE: number;            // Condo/PPE charges
  impotFoncier: number;          // Property tax
  assuranceImmeuble: number;     // Building insurance
  fraisGerance: number;          // Property management
  entretienCourant: number;      // Regular maintenance

  // Tax
  tauxImposition: number;        // Income tax rate % on rental income

  // Financing (original ROI/DSCR ratios)
  fondsPropres: number;          // Own equity
  chargesHypothecaires: number;  // Annual mortgage payments
}

export interface RentalYieldResult {
  // Acquisition
  coutTotalAcquisition: number;

  // Revenue
  loyerAnnuelBrut: number;       // Annual gross rent (after vacancy)
  totalChargesAnnuelles: number;

  // 3-tier yields
  rendementBrut: number;         // Gross yield %
  rendementNet: number;          // Net yield %
  rendementNetNet: number;       // Net-net yield % (after tax)

  // Cash flow
  revenuNetAvantImpot: number;
  impotEstime: number;
  revenuNetApresImpot: number;
  cashFlowMensuel: number;

  // Original ROI/DSCR ratios
  dette: number;
  roi: number;                    // ROI on equity
  rendementEffectif: number;      // Effective return on total cost
  ratioEmpruntFondsPropres: number;
  ratioEndettement: number;       // Debt-to-value %
  dscr: number;                   // Debt service coverage ratio

  // Verdict
  verdict: 'excellent' | 'bon' | 'moyen' | 'faible';
  verdictLabel: string;
}

export function calculateRentalYield(input: RentalYieldInput): RentalYieldResult {
  const {
    prixAchat,
    fraisNotaire,
    fraisAgence,
    travaux,
    loyerMensuel,
    tauxVacance,
    chargesPPE,
    impotFoncier,
    assuranceImmeuble,
    fraisGerance,
    entretienCourant,
    tauxImposition,
    fondsPropres,
    chargesHypothecaires,
  } = input;

  // Acquisition
  const coutTotalAcquisition = prixAchat + fraisNotaire + fraisAgence + travaux;

  // Revenue
  const loyerAnnuelBrut = loyerMensuel * 12 * (1 - tauxVacance / 100);

  // Annual charges
  const totalChargesAnnuelles = chargesPPE + impotFoncier + assuranceImmeuble + fraisGerance + entretienCourant;

  // 3-tier yields (Comptoir Immo-style)
  const rendementBrut = prixAchat > 0
    ? (loyerMensuel * 12 / prixAchat) * 100
    : 0;

  const revenuNetAvantImpot = loyerAnnuelBrut - totalChargesAnnuelles - chargesHypothecaires;
  const rendementNet = coutTotalAcquisition > 0
    ? (revenuNetAvantImpot / coutTotalAcquisition) * 100
    : 0;

  const impotEstime = revenuNetAvantImpot > 0 ? revenuNetAvantImpot * (tauxImposition / 100) : 0;
  const revenuNetApresImpot = revenuNetAvantImpot - impotEstime;
  const rendementNetNet = coutTotalAcquisition > 0
    ? (revenuNetApresImpot / coutTotalAcquisition) * 100
    : 0;

  const cashFlowMensuel = revenuNetApresImpot / 12;

  // Original ROI/DSCR ratios
  const dette = prixAchat - fondsPropres;
  const revenuNetPourRoi = loyerAnnuelBrut - chargesHypothecaires - entretienCourant - chargesPPE;
  const roi = fondsPropres > 0 ? (revenuNetPourRoi / fondsPropres) * 100 : 0;
  const rendementEffectif = prixAchat > 0 ? (revenuNetPourRoi / prixAchat) * 100 : 0;
  const ratioEmpruntFondsPropres = fondsPropres > 0 ? dette / fondsPropres : 0;
  const ratioEndettement = prixAchat > 0 ? (dette / prixAchat) * 100 : 0;
  const dscr = chargesHypothecaires > 0 ? revenuNetPourRoi / chargesHypothecaires : 0;

  // Verdict
  let verdict: RentalYieldResult['verdict'];
  let verdictLabel: string;
  if (rendementNet >= 6) {
    verdict = 'excellent';
    verdictLabel = 'Excellent';
  } else if (rendementNet >= 4) {
    verdict = 'bon';
    verdictLabel = 'Bon';
  } else if (rendementNet >= 2) {
    verdict = 'moyen';
    verdictLabel = 'Moyen';
  } else {
    verdict = 'faible';
    verdictLabel = 'Faible';
  }

  return {
    coutTotalAcquisition,
    loyerAnnuelBrut,
    totalChargesAnnuelles,
    rendementBrut,
    rendementNet,
    rendementNetNet,
    revenuNetAvantImpot,
    impotEstime,
    revenuNetApresImpot,
    cashFlowMensuel,
    dette,
    roi,
    rendementEffectif,
    ratioEmpruntFondsPropres,
    ratioEndettement,
    dscr,
    verdict,
    verdictLabel,
  };
}
