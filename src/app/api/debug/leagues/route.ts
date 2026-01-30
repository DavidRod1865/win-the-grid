import { NextResponse } from 'next/server';
import { fetchFromAPIFootball } from '@/lib/api-football';

export async function GET() {
  try {
    const data = await fetchFromAPIFootball('/leagues');
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leagues';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
