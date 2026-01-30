'use client';

import { useState, useEffect } from 'react';

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
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState('nfl');
  const [previewGameId, setPreviewGameId] = useState<string | null>(null);
  const [gamePreview, setGamePreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGames();
  }, [selectedLeague]);

  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/games?league=${selectedLeague}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Failed to fetch games:', error);
      setError(error instanceof Error ? error.message : 'Failed to load games');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGamePreview = async (gameId: string) => {
    setLoadingPreview(true);
    try {
      const response = await fetch(`/api/games/${gameId}/preview`);
      const data = await response.json();
      setGamePreview(data);
    } catch (error) {
      console.error('Failed to fetch preview:', error);
      setGamePreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGameClick = (game: Game) => {
    setPreviewGameId(game.gameId);
    fetchGamePreview(game.gameId);
  };

  const handleGameSelect = () => {
    const selectedGame = games.find(g => g.gameId === previewGameId);
    if (selectedGame) {
      onSelect(selectedGame);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-black">Select a Game</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Game List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
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
                    onClick={fetchGames}
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
                    className={`w-full p-4 border rounded-lg hover:bg-blue-50 transition-all text-left ${
                      previewGameId === game.gameId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
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

            {/* Right: Game Preview */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 max-h-[60vh] overflow-y-auto">
              {previewGameId && gamePreview ? (
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-black">Game Preview</h4>

                  {loadingPreview ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2">Loading preview...</p>
                    </div>
                  ) : (
                    <>
                      {/* Head-to-Head Stats */}
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h5 className="font-semibold mb-3 text-black">Head-to-Head</h5>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last 5 Meetings:</span>
                            <span className="font-medium text-black">{gamePreview.h2h}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Score:</span>
                            <span className="font-medium text-black">{gamePreview.avgScore}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleGameSelect}
                        className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                      >
                        Select This Game
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-16">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">Click a game to see preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
