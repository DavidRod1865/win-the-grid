import { NextRequest, NextResponse } from 'next/server';
import { fetchFromAPIFootball } from '@/lib/api-football';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  try {
    const data = await fetchFromAPIFootball(`/fixtures?id=${gameId}`);

    if (!data.response || data.response.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const fixture = data.response[0];

    return NextResponse.json({
      gameId: fixture.fixture.id.toString(),
      status: fixture.fixture.status.short,
      scores: {
        home: fixture.goals.home || 0,
        away: fixture.goals.away || 0,
      },
      quarter: fixture.fixture.status.elapsed
        ? `Q${Math.ceil(fixture.fixture.status.elapsed / 15)}`
        : 'Pre-Game',
    });
  } catch (error) {
    console.error('Error fetching game details:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
