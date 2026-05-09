import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET(request: Request, { params }: { params: { year: string } }) {
  try {
    const year = parseInt(params.year, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: 'Invalid year provided' }, { status: 400 });
    }

    // For now, we only use 2022 data as that's all that has been provided.
    const dataYear = 2022;
    const filePath = path.join(process.cwd(), `src/data/parsed/${dataYear}/locations.json`);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error fetching tax locations:', error);
    if (error.code === 'ENOENT') {
        return NextResponse.json({ error: `Location data for year 2022 not found.` }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tax locations' },
      { status: 500 }
    );
  }
}
