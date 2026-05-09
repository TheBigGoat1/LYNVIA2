/**
 * PDF Export for Financial Scenarios
 *
 * Uses jsPDF (already installed) to generate clean PDF reports
 * for all scenario types: Individual, Workforce, Revenue Growth, TVA, Compound Interest, Rental Yield.
 */

import type { ScenarioResult } from "./types";

type PDFSection = {
  title: string;
  rows: { label: string; value: string }[];
};

export type PDFReportData = {
  title: string;
  subtitle?: string;
  generatedAt: string;
  comparisonNote?: string; // e.g. "Pro-rata comparison: 6 months (Jan–Jun 2026)"
  sections: PDFSection[];
};

function chf(v: number): string {
  return `CHF ${v.toLocaleString('fr-CH', { maximumFractionDigits: 0 })}`;
}

function pct(v: number): string {
  return `${v.toFixed(2)}%`;
}

export async function generateScenarioPDF(data: PDFReportData): Promise<void> {
  const doc = await buildJsPDFDoc(data);
  const filename = data.title.replace(/[^a-zA-Z0-9àâéèêëïôùûü]/gi, '_').replace(/_+/g, '_');
  doc.save(`${filename}.pdf`);
}

/**
 * Generates the same PDF but returns it as a Blob instead of triggering a download.
 * Used for uploading to Firebase Storage when contacting Lynvia.
 */
export async function generateScenarioPDFBlob(data: PDFReportData): Promise<Blob> {
  const doc = await buildJsPDFDoc(data);
  return doc.output('blob');
}

async function buildJsPDFDoc(data: PDFReportData) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const usable = pageWidth - margin * 2;
  let y = margin;

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LYNVIA', margin, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.generatedAt, pageWidth - margin, y, { align: 'right' });
  y += 10;

  // ── Title ──
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, margin, y);
  y += 6;

  if (data.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(data.subtitle, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  if (data.comparisonNote) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 120, 0);
    doc.text(data.comparisonNote, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    y += 5;
  }

  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Sections ──
  for (const section of data.sections) {
    // Check if we need a new page
    const estimatedHeight = 8 + section.rows.length * 6;
    if (y + estimatedHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    for (const row of section.rows) {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = margin;
      }

      doc.text(row.label, margin + 2, y);
      doc.text(row.value, pageWidth - margin, y, { align: 'right' });
      y += 5;
    }

    y += 4;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  }

  // ── Footer ──
  const pagesTotal = doc.getNumberOfPages();
  for (let i = 1; i <= pagesTotal; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i}/${pagesTotal} — LYNVIA Financial Report — Confidential`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
  }

  return doc;
}

// ══════════════════════════════════════════════════════════════
// Scenario-specific builders
// ══════════════════════════════════════════════════════════════

export function buildWorkforcePDF(results: Record<string, any>, formData: Record<string, any>, comparison?: ComparisonMeta): PDFReportData {
  const scale = comparison ? comparison.scaleFactor : 1;
  return {
    title: 'Workforce Scenario Report',
    subtitle: `${formData.scenarioName || 'N/A'} — ${formData.numberOfHires} hire(s), avg CHF ${Number(formData.averageSalary).toLocaleString('fr-CH')}`,
    generatedAt: new Date().toLocaleDateString('fr-CH', { year: 'numeric', month: 'long', day: 'numeric' }),
    comparisonNote: comparison?.note,
    sections: [
      {
        title: 'Key Metrics',
        rows: [
          { label: 'Annual employer cost', value: chf(results.estimatedAnnualCost * scale) },
          { label: 'Monthly employer cost', value: chf(results.estimatedMonthlyCost) },
          { label: 'Annual gross payroll', value: chf(results.annualGrossPayroll * scale) },
          { label: 'Employer contributions', value: chf(results.annualEmployerContributions * scale) },
          { label: 'Family allowances', value: chf(results.annualFamilyAllowances * scale) },
        ],
      },
      {
        title: 'Per-employee Details',
        rows: [
          { label: 'Net pay before tax', value: chf(results.perHireNetPayBeforeTax) },
          { label: 'Employee deductions', value: chf(results.perHireEmployeeDeductions) },
          { label: 'Family allowance', value: chf(results.perHireFamilyAllowance) },
          { label: 'Maternity coverage', value: chf(results.maternityCoverageReference) },
          { label: 'Birth / adoption allowance', value: `${chf(results.birthAllowanceReference)} / ${chf(results.adoptionAllowanceReference)}` },
        ],
      },
      ...(results.summary ? [{
        title: 'AI Analysis',
        rows: [
          { label: 'Summary', value: String(results.summary).slice(0, 300) },
          { label: 'Recommendations', value: String(results.recommendations).slice(0, 300) },
        ],
      }] : []),
    ],
  };
}

export function buildRevenueGrowthPDF(results: Record<string, any>, comparison?: ComparisonMeta): PDFReportData {
  const scale = comparison ? comparison.scaleFactor : 1;
  return {
    title: 'Revenue Growth Scenario Report',
    subtitle: `CA: ${chf(results.caActuel ?? 0)} → ${chf(results.nouveauCA ?? 0)}`,
    generatedAt: new Date().toLocaleDateString('fr-CH', { year: 'numeric', month: 'long', day: 'numeric' }),
    comparisonNote: comparison?.note,
    sections: [
      {
        title: 'Key Results',
        rows: [
          { label: 'Nouveau résultat', value: chf(results.nouveauResultat * scale) },
          { label: 'Delta vs actuel', value: chf(results.deltaResultat * scale) },
          { label: 'Marge brute', value: pct(results.nouvelleMarge) },
          { label: 'Résultat net %', value: pct(results.nouveauResultatPct) },
        ],
      },
      {
        title: 'Projected Charges',
        rows: [
          { label: 'Achats (COGS)', value: chf(results.nouveauxAchats * scale) },
          { label: 'Salaires bruts', value: chf(results.nouveauxSalaires * scale) },
          { label: 'Charges sociales', value: chf(results.chargesSociales * scale) },
          { label: 'Frais d\'exploitation', value: chf(results.nouveauxFrais * scale) },
          { label: 'Charges financières', value: chf(results.chargesFinancieres * scale) },
          { label: 'Charges fixes annuelles', value: chf(results.chargesFixesAnnuelles * scale) },
          { label: 'Autres charges', value: chf(results.nouveauxAutres * scale) },
          { label: 'Total charges', value: chf(results.totalCharges * scale) },
        ],
      },
    ],
  };
}

export function buildVATPDF(results: Record<string, any>): PDFReportData {
  return {
    title: 'TVA Method Comparison Report',
    subtitle: `Recommended: ${results.methodeRecommandee}`,
    generatedAt: new Date().toLocaleDateString('fr-CH', { year: 'numeric', month: 'long', day: 'numeric' }),
    sections: [
      {
        title: 'Comparison',
        rows: [
          { label: 'TVA effective', value: chf(results.tvaEffective) },
          { label: 'TVA TDFN', value: chf(results.tvaTDFN) },
          { label: 'Économie', value: chf(results.economie) },
          { label: 'Méthode recommandée', value: String(results.methodeRecommandee) },
        ],
      },
      ...(results.detailsEffective ? [{
        title: 'Détail — Méthode Effective',
        rows: [
          { label: 'TVA collectée totale', value: chf(results.detailsEffective.tvaCollectee) },
          { label: 'Impôt préalable (input VAT)', value: chf(results.detailsEffective.impotPrealable) },
          { label: 'TVA nette due', value: chf(results.detailsEffective.tvaNetteDue) },
        ],
      }] : []),
      ...(results.detailsTDFN ? [{
        title: 'Détail — Méthode TDFN',
        rows: results.detailsTDFN.parSecteur?.map((s: any) => ({
          label: `${s.secteur} (${pct(s.taux)})`,
          value: chf(s.tvaDue),
        })) ?? [{ label: 'TVA TDFN totale', value: chf(results.tvaTDFN) }],
      }] : []),
    ],
  };
}

export function buildCompoundInterestPDF(results: Record<string, any>): PDFReportData {
  return {
    title: 'Compound Interest Projection Report',
    subtitle: `${results.yearlyBreakdown?.length ?? '?'} year projection`,
    generatedAt: new Date().toLocaleDateString('fr-CH', { year: 'numeric', month: 'long', day: 'numeric' }),
    sections: [
      {
        title: 'Summary',
        rows: [
          { label: 'Capital final', value: chf(results.capitalFinal) },
          { label: 'Plus-value', value: chf(results.plusValue) },
          { label: 'Total versé', value: chf(results.totalVerse) },
          { label: 'Rendement total', value: pct(results.rendementTotal) },
          { label: 'Rendement annualisé', value: pct(results.rendementAnnualise) },
        ],
      },
      ...(results.yearlyBreakdown ? [{
        title: 'Year-by-year Breakdown',
        rows: results.yearlyBreakdown.map((row: any) => ({
          label: `Year ${row.year}`,
          value: `${chf(row.capitalFin)} (contributions: ${chf(row.versements)}, interest: ${chf(row.interets)})`,
        })),
      }] : []),
    ],
  };
}

export function buildRentalYieldPDF(results: Record<string, any>): PDFReportData {
  return {
    title: 'Rental Yield Analysis Report',
    subtitle: `Verdict: ${results.verdictLabel}`,
    generatedAt: new Date().toLocaleDateString('fr-CH', { year: 'numeric', month: 'long', day: 'numeric' }),
    sections: [
      {
        title: 'Yields',
        rows: [
          { label: 'Rendement brut', value: pct(results.rendementBrut) },
          { label: 'Rendement net', value: pct(results.rendementNet) },
          { label: 'Rendement net-net (après impôt)', value: pct(results.rendementNetNet) },
        ],
      },
      {
        title: 'Cash Flow',
        rows: [
          { label: 'Revenu net avant impôt', value: chf(results.revenuNetAvantImpot) },
          { label: 'Impôt estimé', value: chf(results.impotEstime) },
          { label: 'Cash flow mensuel', value: chf(results.cashFlowMensuel) },
        ],
      },
      {
        title: 'Acquisition',
        rows: [
          { label: 'Prix d\'achat', value: chf(results.prixAchat) },
          { label: 'Frais d\'acquisition', value: chf(results.fraisAcquisition) },
          { label: 'Coût total', value: chf(results.coutTotal) },
        ],
      },
      {
        title: 'Ratios avancés',
        rows: [
          { label: 'ROI (fonds propres)', value: pct(results.roi) },
          { label: 'Rendement effectif', value: pct(results.rendementEffectif) },
          { label: 'Ratio emprunt/fonds propres', value: `${results.ratioEmprunt?.toFixed(2) ?? 'N/A'}x` },
          { label: 'Ratio endettement', value: pct(results.ratioEndettement) },
          { label: 'DSCR', value: results.dscr?.toFixed(2) ?? 'N/A' },
        ],
      },
    ],
  };
}

// ══════════════════════════════════════════════════════════════
// Comparison mode: pro-rata scaling
// ══════════════════════════════════════════════════════════════

export interface ComparisonMeta {
  monthsRecorded: number;  // e.g. 6 (Jan–Jun)
  scaleFactor: number;     // e.g. 6/12 = 0.5
  note: string;            // human-readable note for the PDF
}

export function buildComparisonMeta(monthsRecorded: number): ComparisonMeta {
  const clamped = Math.max(1, Math.min(12, Math.round(monthsRecorded)));
  const factor = clamped / 12;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const rangeLabel = `${monthNames[0]}–${monthNames[clamped - 1]}`;

  return {
    monthsRecorded: clamped,
    scaleFactor: factor,
    note: `Pro-rata comparison: ${clamped} months (${rangeLabel} ${new Date().getFullYear()}) — annual figures × ${factor.toFixed(4)}`,
  };
}

/**
 * Scale all numeric values in a result object by a factor.
 * Non-numeric values, percentages (keys containing 'pct', 'margin', 'rate', 'rendement', 'ratio', 'dscr')
 * are NOT scaled — they are relative metrics.
 */
export function scaleResults<T extends Record<string, any>>(results: T, factor: number): T {
  const percentageKeys = /pct|margin|marge|rate|rendement|ratio|dscr|verdict|alert|eligible|tva.*threshold/i;
  const scaled: any = {};
  for (const [key, val] of Object.entries(results)) {
    if (typeof val === 'number' && !percentageKeys.test(key)) {
      scaled[key] = val * factor;
    } else if (Array.isArray(val)) {
      // Don't scale arrays (yearly breakdowns etc)
      scaled[key] = val;
    } else {
      scaled[key] = val;
    }
  }
  return scaled as T;
}

// ══════════════════════════════════════════════════════════════
// Individual scenario PDF builder
// ══════════════════════════════════════════════════════════════

export function buildIndividualScenarioPDF(result: ScenarioResult, comparison?: ComparisonMeta): PDFReportData {
  const scale = comparison ? comparison.scaleFactor : 1;
  const s = result.currentSituation;
  const f = result.futureSituation;
  const c = result.comparison;
  const periodLabel = comparison ? `/${comparison.monthsRecorded} mo.` : '/year';

  return {
    title: `Scenario Report: ${result.metadata.scenarioType}`,
    subtitle: result.metadata.location,
    generatedAt: new Date().toLocaleDateString('fr-CH', { year: 'numeric', month: 'long', day: 'numeric' }),
    comparisonNote: comparison?.note,
    sections: [
      {
        title: 'Current Situation',
        rows: [
          { label: 'Gross income', value: `${chf(s.grossIncome * scale)}${periodLabel}` },
          { label: 'Total tax', value: `${chf(s.totalTax * scale)}${periodLabel}` },
          { label: 'Effective tax rate', value: pct(s.effectiveTaxRate) },
          { label: 'Net income', value: `${chf(s.netIncome * scale)}${periodLabel}` },
          ...(s.additionalBenefits ? [{ label: 'Additional benefits', value: `+${chf(s.additionalBenefits * scale)}${periodLabel}` }] : []),
        ],
      },
      {
        title: 'Future Situation',
        rows: [
          { label: 'Gross income', value: `${chf(f.grossIncome * scale)}${periodLabel}` },
          { label: 'Total tax', value: `${chf(f.totalTax * scale)}${periodLabel}` },
          { label: 'Effective tax rate', value: pct(f.effectiveTaxRate) },
          { label: 'Net income', value: `${chf(f.netIncome * scale)}${periodLabel}` },
          ...(f.additionalBenefits ? [{ label: 'Additional benefits', value: `+${chf(f.additionalBenefits * scale)}${periodLabel}` }] : []),
        ],
      },
      {
        title: 'Impact Summary',
        rows: [
          { label: 'Tax difference', value: `${c.taxDifference >= 0 ? '+' : ''}${chf(c.taxDifference * scale)}` },
          { label: 'Tax change %', value: `${c.taxDifferencePct >= 0 ? '+' : ''}${pct(c.taxDifferencePct)}` },
          { label: 'Net income change', value: `${c.netIncomeChange >= 0 ? '+' : ''}${chf(c.netIncomeChange * scale)}` },
          { label: 'Net income change %', value: `${c.netIncomeChangePct >= 0 ? '+' : ''}${pct(c.netIncomeChangePct)}` },
        ],
      },
      ...(f.benefitsBreakdown?.length ? [{
        title: 'Benefits Breakdown',
        rows: f.benefitsBreakdown.map(b => ({
          label: `${b.type}: ${b.label}`,
          value: `+${chf(b.amount * scale)}`,
        })),
      }] : []),
      ...(result.analysis.recommendations.length ? [{
        title: 'AI Recommendations',
        rows: result.analysis.recommendations.map((r, i) => ({
          label: `${i + 1}.`,
          value: r.slice(0, 250),
        })),
      }] : []),
    ],
  };
}
