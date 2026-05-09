import { taxDeductionsGeneral, taxDeductionsPerson } from './deduction/constants';
import {
  TaxCalculationTypeList,
  TaxConfessionList,
  TaxIncomeTypeList,
  TaxInputData,
  TaxRelationshipList
} from './typesClient';

export const dataParsedRelativePath = 'data/parsed/';
export const dataParsedBasePath = `./${dataParsedRelativePath}`;
export const dataRawBasePath = './data/raw/';

const taxCalculationTypes: TaxCalculationTypeList = [
  {
    value: 'incomeAndWealth',
    label: {
      de: 'Einkommens- und Vermögensstauer',
      en: 'Income and Wealth Tax',
      fr: 'Impot sur le revenu et la fortune',
      it: 'Imposta su reddito e patrimonio',
      es: 'Impuesto sobre la renta y el patrimonio'
    }
  },
  {
    value: 'capital',
    label: {
      de: 'Vorsorge Kapitalsteuer',
      en: 'Pension Capital Tax',
      fr: 'Impot sur le capital de prevoyance',
      it: 'Imposta sul capitale previdenziale',
      es: 'Impuesto sobre el capital de pension'
    }
  }
] as const;

const taxRelationships: TaxRelationshipList = [
  { value: 's', label: { de: 'Alleinstehend', en: 'Single', fr: 'Celibataire', it: 'Single', es: 'Soltero/a' } },
  { value: 'm', label: { de: 'Verheiratet', en: 'Married', fr: 'Marie(e)', it: 'Sposato/a', es: 'Casado/a' } },
  {
    value: 'rp',
    label: {
      de: 'Eingetragene Partnerschaft',
      en: 'Registered Partnership',
      fr: 'Partenariat enregistre',
      it: 'Unione registrata',
      es: 'Pareja registrada'
    }
  },
  { value: 'c', label: { de: 'Konkubinat', en: 'Cohabitation', fr: 'Concubinage', it: 'Convivenza', es: 'Convivencia' } }
] as const;

const taxConfessions: TaxConfessionList = [
  {
    value: 'christ',
    label: {
      de: 'Christkatholisch',
      en: 'Christian Catholic',
      fr: 'Catholique-chretien',
      it: 'Cattolico cristiano',
      es: 'Catolico cristiano'
    }
  },
  {
    value: 'roman',
    label: {
      de: 'Römisch-katholisch',
      en: 'Roman Catholic',
      fr: 'Catholique romain',
      it: 'Cattolico romano',
      es: 'Catolico romano'
    }
  },
  { value: 'protestant', label: { de: 'Reformiert', en: 'Protestant', fr: 'Protestant', it: 'Protestante', es: 'Protestante' } },
  { value: 'other', label: { de: 'Andere / Keine', en: 'Other / None', fr: 'Autre / Aucune', it: 'Altro / Nessuna', es: 'Otro / Ninguna' } }
] as const;

const taxIncomeTypes: TaxIncomeTypeList = [
  { value: 'gross', label: { de: 'Brutto', en: 'Gross', fr: 'Brut', it: 'Lordo', es: 'Bruto' } },
  { value: 'net', label: { de: 'Netto', en: 'Net', fr: 'Net', it: 'Netto', es: 'Neto' } },
  { value: 'taxable', label: { de: 'Steuerpflichtig', en: 'Taxable', fr: 'Imposable', it: 'Imponibile', es: 'Imponible' } }
] as const;

export const taxInputData: TaxInputData = {
  calculationTypes: taxCalculationTypes,
  years: [2022, 2023, 2024, 2025, 2026],
  relationships: taxRelationships,
  confessions: taxConfessions,
  incomeTypes: taxIncomeTypes,
  deductionsGeneral: taxDeductionsGeneral,
  deductionsPerson: taxDeductionsPerson
};
