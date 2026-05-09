import { TaxInput } from '../typesClient';
import { DineroChf, dineroChf } from '@/lib/utils/dinero';

export const calculateTaxesPersonnel = (taxInput: TaxInput): DineroChf => {
    // Placeholder logic for calculating personnel tax.
    // In many cantons, this is a fixed amount per person.
    // For simplicity, we'll return a fixed amount.
    return dineroChf(24 * taxInput.persons.length);
};
