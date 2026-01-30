// American Football (NFL) API - NOT the soccer API!
const API_FOOTBALL_BASE = 'https://v1.american-football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.warn('API_FOOTBALL_KEY is not set. Sports API features will be unavailable.');
}

export async function fetchFromAPIFootball(endpoint: string) {
  if (!API_KEY) {
    throw new Error('API_FOOTBALL_KEY is not set. Please add it to .env.local');
  }

  const url = `${API_FOOTBALL_BASE}${endpoint}`;
  console.log('Fetching from API-Football:', url);

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v1.american-football.api-sports.io',
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API-Football error:', response.status, errorText);
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('API-Football response:', data);

  return data;
}

// League ID mappings for API-Football (NFL API)
export const LEAGUE_IDS = {
  nfl: 1, // NFL league ID (verify with API documentation)
  // Add more as needed from API-Football docs
} as const;

export type SupportedLeague = keyof typeof LEAGUE_IDS;
