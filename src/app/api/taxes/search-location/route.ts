import { NextRequest, NextResponse } from 'next/server';

const AFC_BASE_URL =
  'https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV';

const AFC_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Origin: 'https://swisstaxcalculator.estv.admin.ch',
  Referer: 'https://swisstaxcalculator.estv.admin.ch/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

const SEARCH_LANGUAGES = [1, 4, 2, 3]; // de, en, fr, it

export async function POST(request: NextRequest) {
  const body = await request.json();
  const query = String(body?.query ?? '').trim();
  const taxYear = Number(body?.taxYear ?? new Date().getFullYear());

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    for (const language of SEARCH_LANGUAGES) {
      const response = await fetch(`${AFC_BASE_URL}/API_searchLocation`, {
        method: 'POST',
        headers: AFC_HEADERS,
        cache: 'no-store',
        body: JSON.stringify({
          Search: query,
          Language: language,
          TaxYear: taxYear,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AFC Search API Error:', response.status, errorText);
        return NextResponse.json(
          { error: `Failed to fetch from AFC API: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const results = (data?.response ?? []).map((location: any) => ({
        ...location,
        LongName: `${location.ZipCode} ${location.City} (${location.Canton})`,
      }));

      if (results.length > 0) {
        return NextResponse.json(results);
      }
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
