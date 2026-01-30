'use client';

import { useState } from 'react';
import { useGames } from '@/hooks/useGames';

interface GameTeam {
  name: string;
  abbreviation: string;
  logo: string;
}

interface Game {
  gameId: string;
  title: string;
  date: string;
  status: string;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  scores: {
    home: number;
    away: number;
  };
}

interface GamePickerModalProps {
  onSelect: (game: Game) => void;
  onClose: () => void;
}

export default function GamePickerModal({ onSelect, onClose }: GamePickerModalProps) {
  const [selectedLeague, setSelectedLeague] = useState('nfl');

  // Use SWR for games list
  const { games, isLoading: loading, error: gamesError, refresh } = useGames({
    league: selectedLeague
  });

  const error = gamesError ? (gamesError instanceof Error ? gamesError.message : 'Failed to load games') : null;

  const handleGameClick = (game: Game) => {
    onSelect(game);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-black">Select a Game</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refresh()}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                title="Refresh games list"
              >
                🔄 Refresh
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
          </div>

          {/* League Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">League</label>
            <div className="flex gap-2">
              {[
                { league: 'nfl', label: 'NFL' },
              ].map(({ league, label }) => (
                <button
                  key={league}
                  onClick={() => setSelectedLeague(league)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    selectedLeague === league
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Game List */}
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2">Loading games...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 font-semibold mb-2">Error Loading Games</div>
                <div className="text-sm text-gray-600 mb-4">{error}</div>
                <button
                  onClick={() => refresh()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No upcoming games found</p>
              </div>
            ) : (
              games.map((game) => (
                <button
                  key={game.gameId}
                  onClick={() => handleGameClick(game)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <img src={game.awayTeam.logo} alt={game.awayTeam.name} className="w-10 h-10 object-contain" />
                      <div className="flex-1">
                        <div className="font-semibold text-black">{game.awayTeam.name}</div>
                        <div className="text-xs text-gray-500">Away</div>
                      </div>
                    </div>

                    <div className="text-center px-4">
                      <div className="text-xs text-gray-500 font-medium">@</div>
                    </div>

                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1 text-right">
                        <div className="font-semibold text-black">{game.homeTeam.name}</div>
                        <div className="text-xs text-gray-500">Home</div>
                      </div>
                      <img src={game.homeTeam.logo} alt={game.homeTeam.name} className="w-10 h-10 object-contain" />
                    </div>

                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-700 font-medium">
                        {new Date(game.date).toLocaleDateString('en-US', {
                          timeZone: 'America/New_York',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(game.date).toLocaleTimeString('en-US', {
                          timeZone: 'America/New_York',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} EST
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
