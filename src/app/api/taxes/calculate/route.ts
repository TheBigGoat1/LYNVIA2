import { NextRequest, NextResponse } from 'next/server';

const AFC_BASE_URL = 'https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV';

const AFC_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': 'https://swisstaxcalculator.estv.admin.ch',
  'Referer': 'https://swisstaxcalculator.estv.admin.ch/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    grossSalary,
    maritalStatus,
    dependents,
    age,
    confession,
    fortune,
    locationId,
    // Optional: partner fields for married couples
    partnerAge,
    partnerRevenue,
    partnerConfession,
    partnerRevenueType,
  } = body;

  if (!grossSalary || !locationId) {
    return NextResponse.json(
      { error: 'grossSalary and locationId are required' },
      { status: 400 }
    );
  }

  // Map marital status to AFC Relationship enum (1=Single, 2=Married, 4=Divorced)
  const relationshipMap: Record<string, number> = {
    single: 1, married: 2, widowed: 3, divorced: 4, separated: 5,
  };

  // Map confession to AFC enum (1=Protestant, 2=Catholic, 5=None)
  const confessionValue = typeof confession === 'number' ? confession : 5;

  // Build children array (AFC expects [{Age: n}, ...])
  const childrenArr = [];
  if (dependents && dependents > 0) {
    for (let i = 0; i < dependents; i++) {
      childrenArr.push({ Age: 5 }); // Default child age
    }
  }

  const budgetPayload: Record<string, unknown> = {
    TaxYear: new Date().getFullYear(),
    TaxLocationID: locationId,
    Relationship: relationshipMap[maritalStatus] ?? 1,
    Language: 4, // EN
    Age1: age || 35,
    Confession1: confessionValue,
    RevenueType1: 1, // Employee
    Revenue1: grossSalary,
    Children: childrenArr,
    Fortune: fortune || 0,
  };

  // Add partner info for married couples
  if (maritalStatus === 'married') {
    budgetPayload.Age2 = partnerAge || age || 33;
    budgetPayload.Confession2 = partnerConfession || confessionValue;
    budgetPayload.RevenueType2 = partnerRevenueType || 1;
    budgetPayload.Revenue2 = partnerRevenue || 0;
  }

  try {
    // Step 1: Calculate budget (AFC requires this before tax calculation)
    const budgetResponse = await fetch(`${AFC_BASE_URL}/API_calculateTaxBudget`, {
      method: 'POST',
      headers: AFC_HEADERS,
      body: JSON.stringify(budgetPayload),
    });

    if (!budgetResponse.ok) {
      const errorText = await budgetResponse.text();
      console.error('AFC Budget API Error:', errorText);
      return NextResponse.json(
        { error: `AFC budget API error: ${budgetResponse.statusText}` },
        { status: budgetResponse.status }
      );
    }

    const budgetData = await budgetResponse.json();
    const budget = budgetData.response || [];

    // Step 2: Calculate taxes with budget
    const taxPayload = { ...budgetPayload, Budget: budget };
    const taxResponse = await fetch(`${AFC_BASE_URL}/API_calculateDetailedTaxes`, {
      method: 'POST',
      headers: AFC_HEADERS,
      body: JSON.stringify(taxPayload),
    });

    if (!taxResponse.ok) {
      const errorText = await taxResponse.text();
      console.error('AFC Tax API Error:', errorText);
      return NextResponse.json(
        { error: `AFC tax API error: ${taxResponse.statusText}` },
        { status: taxResponse.status }
      );
    }

    const taxData = await taxResponse.json();
    const result = taxData.response;

    // Transform to TaxCalculationResult shape
    const totalIncomeTax =
      (result.IncomeTaxFed || 0) +
      (result.IncomeTaxCanton || 0) +
      (result.IncomeTaxCity || 0) +
      (result.IncomeTaxChurch || 0);
    const totalFortuneTax =
      (result.FortuneTaxCanton || 0) +
      (result.FortuneTaxCity || 0) +
      (result.FortuneTaxChurch || 0);

    const transformedResult = {
      totalTax: result.TotalTax || 0,
      federalTax: result.IncomeTaxFed || 0,
      cantonalTax: result.IncomeTaxCanton || 0,
      municipalTax: result.IncomeTaxCity || 0,
      churchTax: result.IncomeTaxChurch || 0,
      wealthTax: totalFortuneTax,
      netIncome: grossSalary - (result.TotalTax || 0),
      effectiveTaxRate: grossSalary > 0 ? (result.TotalTax || 0) / grossSalary : 0,
      marginalTaxRate: (result.MarginalTaxRate || 0) / 100,
      socialDeductions: {
        ahv: 0, alv: 0, bvg: 0, nbuv: 0, total: 0, // AFC handles deductions in budget
      },
      taxableIncomeFed: result.TaxableIncomeFed || 0,
      taxableIncomeCanton: result.TaxableIncomeCanton || 0,
      taxFreedomDay: result.TaxFreedomDay || 0,
      locationId: result.Location?.TaxLocationID,
      locationName: result.Location?.City,
      canton: result.Location?.Canton,
    };

    return NextResponse.json(transformedResult);
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
