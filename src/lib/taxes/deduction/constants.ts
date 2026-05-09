import { TaxDeductionPersonFieldConfigs, TaxDeductionGeneralFieldConfigs } from '../typesClient';

export const maxSalaryNbuAlv = 148200;

export const taxDeductionsPerson: TaxDeductionPersonFieldConfigs = {
  insurancePremiums: {
    label: {
      de: 'Versicherungsprämien und Zinsen von Sparkapitalien',
      en: 'Insurance premiums and interest on savings capital',
      fr: "Primes d'assurance et interets sur le capital d'epargne",
      it: 'Premi assicurativi e interessi sul capitale di risparmio',
      es: 'Primas de seguro e intereses sobre el capital de ahorro'
    },
    hint: {
      de: "Versicherungsprämien und Zinsen von Sparkapitalien, abzüglich individuelle Prämienverbilligung. Annahme: 4'560 CHF pro Erwachsenen (380 CHF monatlich)",
      en: "Insurance premiums and interest on savings capital, less individual premium reduction. Assumption: 4'560 CHF per adult (380 CHF monthly)",
      fr: "Primes d'assurance et interets sur le capital d'epargne, deduction faite de la reduction individuelle de prime. Hypothese: 4'560 CHF par adulte (380 CHF par mois)",
      it: "Premi assicurativi e interessi sul capitale di risparmio, al netto della riduzione individuale del premio. Ipotesi: 4'560 CHF per adulto (380 CHF al mese)",
      es: "Primas de seguro e intereses sobre el capital de ahorro, menos la reduccion individual de primas. Supuesto: 4'560 CHF por adulto (380 CHF al mes)"
    },
    default: 4560
  },
  pillar3a: {
    label: { de: 'Beiträge an Säule 3a', en: 'Pillar 3a contributions', fr: 'Cotisations au pilier 3a', it: 'Contributi al pilastro 3a', es: 'Aportaciones al pilar 3a' }
  },
  mealCosts: {
    label: { de: 'Verpflegungskosten', en: 'Meal costs', fr: 'Frais de repas', it: 'Costi dei pasti', es: 'Costes de comidas' },
    default: 1600,
    suggestion: 3200,
    dependsOnWorkloadFactor: true
  },
  travelExpenses: {
    label: { de: 'Fahrkosten', en: 'Travel expenses', fr: 'Frais de deplacement', it: 'Spese di viaggio', es: 'Gastos de desplazamiento' },
    default: 1000
  },
  otherProfessionalExpenses: {
    label: { de: 'Berufsauslagen', en: 'Professional expenses', fr: 'Frais professionnels', it: 'Spese professionali', es: 'Gastos profesionales' },
    defaultFlatRate: true
  },
  professionalExpensesSideline: {
    label: {
      de: 'Berufsauslagen Nebenerwerb',
      en: 'Professional expenses sideline',
      fr: 'Frais professionnels activite accessoire',
      it: 'Spese professionali attivita secondaria',
      es: 'Gastos profesionales actividad secundaria'
    }
  },
  otherDeductions: {
    label: { de: 'Übrige Abzüge', en: 'Other deductions', fr: 'Autres deductions', it: 'Altre deduzioni', es: 'Otras deducciones' }
  }
};

export const taxDeductionsGeneral: TaxDeductionGeneralFieldConfigs = {
  insurancePremiumsKids: {
    label: {
      de: 'Versicherungsprämien Kinder',
      en: 'Insurance premiums children',
      fr: "Primes d'assurance enfants",
      it: 'Premi assicurativi figli',
      es: 'Primas de seguro hijos'
    },
    withChildrenOnly: true,
    defaultPerChild: 1200
  },
  childcareCosts: {
    label: {
      de: 'Kinder Drittbetreuungskosten',
      en: 'Third-party childcare costs',
      fr: 'Frais de garde par des tiers',
      it: 'Costi di cura dei figli da parte di terzi',
      es: 'Gastos de cuidado infantil por terceros'
    },
    withChildrenOnly: true
  },
  debtInterest: {
    label: { de: 'Schuldzinsen', en: 'Debt interest', fr: 'Interets de dettes', it: 'Interessi passivi', es: 'Intereses de deuda' }
  },
  maintenanceCostsRealEstate: {
    label: {
      de: 'Unterhaltskosten für Liegenschaften',
      en: 'Maintenance costs for real estate',
      fr: 'Frais dentretien immobilier',
      it: 'Costi di manutenzione immobili',
      es: 'Costes de mantenimiento inmobiliario'
    }
  },
  otherDeductions: {
    label: { de: 'Übrige Abzüge', en: 'Other deductions', fr: 'Autres deductions', it: 'Altre deduzioni', es: 'Otras deducciones' }
  }
};
