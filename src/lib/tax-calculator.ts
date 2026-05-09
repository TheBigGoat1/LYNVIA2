
import * as AG from './tax-rates/AG.json';
import * as AI from './tax-rates/AI.json';
import * as AR from './tax-rates/AR.json';
import * as BE from './tax-rates/BE.json';
import * as BL from './tax-rates/BL.json';
import * as BS from './tax-rates/BS.json';
import * as FR from './tax-rates/FR.json';
import * as GE from './tax-rates/GE.json';
import * as GL from './tax-rates/GL.json';
import * as GR from './tax-rates/GR.json';
import * as JU from './tax-rates/JU.json';
import * as LU from './tax-rates/LU.json';
import * as NE from './tax-rates/NE.json';
import * as NW from './tax-rates/NW.json';
import * as OW from './tax-rates/OW.json';
import * as SG from './tax-rates/SG.json';
import * as SH from './tax-rates/SH.json';
import * as SO from './tax-rates/SO.json';
import * as SZ from './tax-rates/SZ.json';
import * as TG from './tax-rates/TG.json';
import * as TI from './tax-rates/TI.json';
import * as UR from './tax-rates/UR.json';
import * as VD from './tax-rates/VD.json';
import * as VS from './tax-rates/VS.json';
import * as ZG from './tax-rates/ZG.json';
import * as ZH from './tax-rates/ZH.json';

const CANTONS: Record<string, any> = {
    AG, AI, AR, BE, BL, BS, FR, GE, GL, GR, JU, LU, NE, NW, OW, SG, SH, SO, SZ, TG, TI, UR, VD, VS, ZG, ZH
};

export interface TaxInput {
    canton: string;
    city: string;
    year: number;
    grossIncome: number;
    civilStatus: 'single' | 'married';
    confession: 'protestant' | 'catholic' | 'other';
    children: number;
}

export interface TaxOutput {
    grossIncome: number;
    netIncome: number;
    taxableIncome: number;
    totalTax: number;
    socialContributions: {
        ahv: number;
        alv: number;
        bvg: number;
        nbuv: number;
        total: number;
    };
    taxes: {
        federal: number;
        cantonal: number;
        municipal: number;
        church: number;
    };
}

function calculateSocialSecurity(gross: number) {
    const ahv = gross * 0.053;
    const alv = Math.min(gross, 148200) * 0.011;
    const nbuv = gross * 0.01;
    const bvg = gross > 22050 ? Math.max(0, gross - 25725) * 0.07 : 0;
    return { ahv, alv, bvg, nbuv, total: ahv + alv + bvg + nbuv };
}

function calculateTaxableIncome(gross: number, social: number, deductions: number, children: number, children_deduction: number) {
    return Math.max(0, gross - social - deductions - (children * children_deduction));
}

function calculateFederalTax(taxable: number, status: 'single' | 'married') {
    const rates = status === 'single' ? [
        {from: 0, to: 14500, rate: 0, base: 0},
        {from: 14501, to: 31600, rate: 0.0077, base: 0},
        {from: 31601, to: 41400, rate: 0.0088, base: 131.65},
        {from: 41401, to: 55200, rate: 0.0264, base: 217.90},
        {from: 55201, to: 72500, rate: 0.0297, base: 582.45},
        {from: 72501, to: 78100, rate: 0.0594, base: 1095.45},
        {from: 78101, to: 103600, rate: 0.066, base: 1427.70},
        {from: 103601, to: 134600, rate: 0.088, base: 3110.70},
        {from: 134601, to: 176000, rate: 0.11, base: 5838.70},
        {from: 176001, to: 755200, rate: 0.132, base: 10392.70},
        {from: 755201, to: Infinity, rate: 0.115, base: 86646.70}
    ] : [
        {from: 0, to: 28300, rate: 0, base: 0},
        {from: 28301, to: 50900, rate: 0.01, base: 0},
        {from: 50901, to: 58800, rate: 0.02, base: 226},
        {from: 58801, to: 75900, rate: 0.03, base: 384},
        {from: 75901, to: 91300, rate: 0.04, base: 900},
        {from: 91301, to: 105200, rate: 0.05, base: 1512},
        {from: 105201, to: 117500, rate: 0.06, base: 2207},
        {from: 117501, to: 128200, rate: 0.07, base: 2945},
        {from: 128201, to: 137300, rate: 0.08, base: 3694},
        {from: 137301, to: 144900, rate: 0.09, base: 4417},
        {from: 144901, to: 151000, rate: 0.1, base: 5101},
        {from: 151001, to: 155600, rate: 0.11, base: 5711},
        {from: 155601, to: 158600, rate: 0.12, base: 6217},
        {from: 158601, to: 895800, rate: 0.13, base: 6577},
        {from: 895801, to: Infinity, rate: 0.115, base: 102413}
    ];

    for (const tier of rates) {
        if (taxable >= tier.from && (tier.to === null || taxable <= tier.to)) {
            return (taxable - tier.from + 1) * tier.rate + tier.base;
        }
    }
    return 0;
}

function calculateCantonTax(taxable: number, canton: string, status: 'single' | 'married', city: string) {
    const cantonData = CANTONS[canton.toUpperCase()];
    if (!cantonData) {
        throw new Error(`Canton data for ${canton} not found.`);
    }

    const rates = status === 'married' ? cantonData.married_rates : cantonData.general_rates;
    let baseTax = 0;
    for (const tier of rates) {
        if (taxable > tier.from) {
            baseTax = tier.amount + (taxable - tier.from) * tier.rate;
        }
    }
    
    // In a real scenario, you'd fetch city-specific multipliers. We'll use a placeholder.
    const municipalMultiplier = 1.0; 
    const cantonalTax = baseTax * 1; // Cantonal multiplier is often 1
    const municipalTax = baseTax * municipalMultiplier;

    return { cantonalTax, municipalTax };
}


export function calculateSwissTax(input: TaxInput): TaxOutput {
    const socialContributions = calculateSocialSecurity(input.grossIncome);
    const cantonData = CANTONS[input.canton.toUpperCase()];

    const taxableIncome = calculateTaxableIncome(
        input.grossIncome,
        socialContributions.total,
        cantonData.deductions.general_deduction,
        input.children,
        cantonData.deductions.children_deduction
    );

    const federalTax = calculateFederalTax(taxableIncome, input.civilStatus);
    const { cantonalTax, municipalTax } = calculateCantonTax(taxableIncome, input.canton, input.civilStatus, input.city);
    
    // Placeholder for church tax
    const churchTax = (input.confession !== 'other') ? (cantonalTax + municipalTax) * 0.1 : 0;
    
    const totalTax = federalTax + cantonalTax + municipalTax + churchTax;

    return {
        grossIncome: input.grossIncome,
        netIncome: input.grossIncome - socialContributions.total - totalTax,
        taxableIncome: taxableIncome,
        totalTax: totalTax,
        socialContributions: socialContributions,
        taxes: {
            federal: federalTax,
            cantonal: cantonalTax,
            municipal: municipalTax,
            church: churchTax
        }
    };
}
