// American Football (NFL) API - NOT the soccer API!
const API_FOOTBALL_BASE = 'https://v1.american-football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  console.warn('API_FOOTBALL_KEY is not set. Sports API features will be unavailable.');
}

// Cache TTL configuration (in seconds)
const CACHE_CONFIG = {
  games_list: 3600,        // 1 hour (games don't change often)
  game_detail: 300,        // 5 minutes (scores can change)
  game_preview: 86400,     // 24 hours (historical data)
  leagues: 604800,         // 1 week (rarely changes)
} as const;

// Helper to generate cache tags for invalidation
function getCacheTag(endpoint: string): string {
  if (endpoint.includes('/games?')) return 'games-list';
  if (endpoint.includes('/games/h2h')) return 'game-preview';
  if (endpoint.startsWith('/games/') && endpoint.includes('/')) return 'game-detail';
  if (endpoint.includes('/leagues')) return 'leagues';
  return 'api-football';
}

export async function fetchFromAPIFootball(
  endpoint: string,
  cacheOverride?: number
) {
  if (!API_KEY) {
    throw new Error('API_FOOTBALL_KEY is not set. Please add it to .env.local');
  }

  const url = `${API_FOOTBALL_BASE}${endpoint}`;

  // Determine cache TTL based on endpoint
  let revalidate = 300; // default 5 minutes
  if (endpoint.includes('/games?')) revalidate = CACHE_CONFIG.games_list;
  else if (endpoint.includes('/games/h2h')) revalidate = CACHE_CONFIG.game_preview;
  else if (endpoint.includes('/leagues')) revalidate = CACHE_CONFIG.leagues;
  else if (endpoint.startsWith('/games/') && endpoint.includes('/')) revalidate = CACHE_CONFIG.game_detail;

  if (cacheOverride !== undefined) revalidate = cacheOverride;

  console.log(`Fetching: ${url} (cache: ${revalidate}s)`);

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v1.american-football.api-sports.io',
    },
    next: { revalidate, tags: [getCacheTag(endpoint)] },
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
