'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GridState, LiveScoreData, Winner } from '@/types';
import { StorageFactory } from '@/lib/storage';
import { GameDayManager } from '@/lib/game-day';

interface SharePageProps {
  params: {
    joinCode: string;
  };
}

export default function SharePage({ params }: SharePageProps) {
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveScores, setLiveScores] = useState<LiveScoreData | null>(null);
  const [isGameDay, setIsGameDay] = useState(false);

  useEffect(() => {
    const loadSharedGrid = async () => {
      try {
        setLoading(true);
        const provider = StorageFactory.getProvider();
        
        if (!provider.getGridByJoinCode) {
          throw new Error('Grid sharing not available');
        }

        const grid = await provider.getGridByJoinCode(params.joinCode);
        
        if (!grid) {
          throw new Error('Grid not found or join code expired');
        }

        // Mark as view-only
        const viewOnlyGrid = {
          ...grid,
          isViewOnly: true,
          accessLevel: 'view-only' as const
        };

        setGridState(viewOnlyGrid);
        
        // Check if this is a premium grid with live scoring enabled
        if (grid.liveScoringEnabled && grid.ownership?.isPremium) {
          setIsGameDay(true);
          // TODO: Start live score polling
          startLiveScoreUpdates(grid.id || '');
        }
        
      } catch (err) {
        console.error('Failed to load shared grid:', err);
        setError(err instanceof Error ? err.message : 'Failed to load grid');
      } finally {
        setLoading(false);
      }
    };

    loadSharedGrid();
  }, [params.joinCode]);

  const startLiveScoreUpdates = async (gridId: string) => {
    // TODO: Implement live score API integration
    // For now, simulate live updates
    console.log('Starting live score updates for grid:', gridId);
    
    // Mock live score data
    const mockScores: LiveScoreData = {
      gameId: 'superbowl-2025',
      homeTeam: {
        name: 'Team Home',
        score: 14,
        abbreviation: 'HOME'
      },
      awayTeam: {
        name: 'Team Away', 
        score: 7,
        abbreviation: 'AWAY'
      },
      quarter: '2nd Quarter',
      timeRemaining: '5:23',
      gameStatus: 'live',
      lastUpdated: new Date().toISOString()
    };
    
    setLiveScores(mockScores);
    
    // TODO: Set up real-time score polling
    // const interval = setInterval(async () => {
    //   try {
    //     const scores = await fetchLiveScores(gridId);
    //     setLiveScores(scores);
    //     
    //     // Update grid state with new winners if scores changed
    //     if (gridState && scores.gameStatus === 'live') {
    //       const newWinners = calculateCurrentWinners(gridState, scores);
    //       setGridState(prev => prev ? { ...prev, gameWinners: newWinners } : null);
    //     }
    //   } catch (error) {
    //     console.error('Failed to fetch live scores:', error);
    //   }
    // }, 30000); // Update every 30 seconds
    //
    // return () => clearInterval(interval);
  };

  const calculateCurrentWinners = (grid: GridState, scores: LiveScoreData): Winner[] => {
    if (!grid.numbersGenerated) return [];
    
    const winners: Winner[] = [];
    
    // Determine winners for each completed quarter
    const quarters = ['1st Quarter', '2nd Quarter', '3rd Quarter', 'Final Score'];
    
    // For demo, assume we have scores for each quarter
    // TODO: Get actual quarter scores from live data
    quarters.forEach(quarter => {
      try {
        const winner = GameDayManager.determineWinner(
          grid,
          scores.homeTeam.score,
          scores.awayTeam.score,
          quarter
        );
        
        if (winner) {
          winners.push(winner);
        }
      } catch (error) {
        console.error(`Failed to determine winner for ${quarter}:`, error);
      }
    });
    
    return winners;
  };

  const getBoxClassName = (box: { name: string }, row: number, col: number) => {
    const isWinningBox = gridState?.gameWinners?.some(winner => {
      const winnerCoords = GameDayManager.getWinnerCoordinates(winner);
      return winnerCoords.row === row && winnerCoords.col === col;
    });

    return `h-8 border border-gray-300 flex items-center justify-center text-xs font-medium cursor-default ${
      box.name.trim() 
        ? isWinningBox
          ? 'bg-green-200 text-green-800 font-bold'
          : 'bg-blue-50 text-blue-900'
        : 'bg-gray-50 text-gray-400'
    }`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shared grid...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Grid Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create Your Own Grid
          </Link>
        </div>
      </div>
    );
  }

  if (!gridState) {
    return null;
  }

  const filledBoxesCount = gridState.boxes.filter(box => box.name.trim() !== '').length;
  const currentPot = gridState.pricePerBox * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {gridState.title || 'Super Bowl Squares'}
              </h1>
              <p className="text-gray-600">Shared Grid - View Only</p>
            </div>
            
            {isGameDay && liveScores && (
              <div className="text-center">
                <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
                  <div className="font-bold">🏈 LIVE GAME</div>
                  <div className="text-sm">
                    {liveScores.homeTeam.name} {liveScores.homeTeam.score} - {liveScores.awayTeam.score} {liveScores.awayTeam.name}
                  </div>
                  <div className="text-xs">
                    {liveScores.quarter} - {liveScores.timeRemaining}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{filledBoxesCount}/100</div>
              <div className="text-sm text-gray-600">Boxes Filled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">${gridState.pricePerBox}</div>
              <div className="text-sm text-gray-600">Per Box</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">${currentPot}</div>
              <div className="text-sm text-gray-600">Total Pot</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {gridState.gameWinners?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Winners</div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                🏈 Super Bowl Squares Grid
                {isGameDay && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm animate-pulse">
                    LIVE
                  </span>
                )}
              </h2>
              
              <div className="grid grid-cols-11 gap-0 border-2 border-gray-900 inline-block">
                {/* Header row with away team numbers */}
                <div className="h-8 bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {gridState.awayTeamName || 'Away'}
                </div>
                {gridState.numbersGenerated ? (
                  gridState.rowNumbers.map((num, i) => (
                    <div key={i} className="h-8 bg-blue-600 text-white flex items-center justify-center text-sm font-bold border-l border-white">
                      {num}
                    </div>
                  ))
                ) : (
                  Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="h-8 bg-blue-400 text-white flex items-center justify-center text-sm">
                      ?
                    </div>
                  ))
                )}

                {/* Grid rows */}
                {Array.from({ length: 10 }, (_, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="contents">
                    {/* Home team number column */}
                    <div className="h-8 bg-green-600 text-white flex items-center justify-center text-sm font-bold border-t border-white">
                      {gridState.numbersGenerated ? gridState.colNumbers[rowIndex] : '?'}
                    </div>
                    
                    {/* Grid boxes */}
                    {Array.from({ length: 10 }, (_, colIndex) => {
                      const boxIndex = rowIndex * 10 + colIndex;
                      const box = gridState.boxes[boxIndex];
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={getBoxClassName(box, rowIndex, colIndex)}
                          title={box.name || 'Empty box'}
                        >
                          {box.name || ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-600 text-center">
                <div className="mb-2">
                  <span className="font-semibold text-green-600">{gridState.homeTeamName || 'Home Team'}</span> numbers run vertically
                </div>
                <div>
                  <span className="font-semibold text-blue-600">{gridState.awayTeamName || 'Away Team'}</span> numbers run horizontally
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar with payouts and winners */}
          <div className="space-y-6">
            {/* Winners */}
            {gridState.gameWinners && gridState.gameWinners.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  🏆 Winners
                  {isGameDay && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      LIVE
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  {gridState.gameWinners.map((winner, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg">
                      <div className="font-semibold text-green-800">{winner.participantName}</div>
                      <div className="text-sm text-green-600">{winner.quarter}</div>
                      <div className="text-sm text-gray-600">
                        Score: {winner.awayLastDigit}-{winner.homeLastDigit}
                      </div>
                      <div className="font-bold text-green-700">${winner.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payout Structure */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">💰 Payout Structure</h3>
              <div className="space-y-2">
                {gridState.payoutRules.map((rule, index) => {
                  const amount = Math.round((currentPot * rule.percentage) / 100);
                  return (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-gray-700">{rule.quarter}</span>
                      <div className="text-right">
                        <div className="font-semibold">${amount}</div>
                        <div className="text-xs text-gray-500">{rule.percentage}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create Your Own */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white text-center">
              <h3 className="text-lg font-semibold mb-2">Create Your Own Grid</h3>
              <p className="text-sm mb-4 opacity-90">
                Set up your own Super Bowl squares game with custom payouts and live scoring.
              </p>
              <Link 
                href="/"
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-block"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>This grid is shared read-only. To edit or manage this grid, you need the owner's permission.</p>
        </div>
      </div>
    </div>
  );
}