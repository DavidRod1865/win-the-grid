'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { GridState } from '@/types';
import { SupabaseProvider } from '@/lib/storage';
import { useGridRealtime } from '@/hooks/useGridRealtime';
import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { generatePDF } from '@/lib/pdf-export';

interface SharePageProps {
  params: Promise<{
    joinCode: string;
  }>;
}

export default function SharePage({ params }: SharePageProps) {
  const { joinCode } = use(params);
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    const loadSharedGrid = async () => {
      try {
        setLoading(true);
        const supabaseProvider = new SupabaseProvider();

        const grid = await supabaseProvider.getGridByJoinCode(joinCode);

        if (!grid) {
          throw new Error('Grid not found or share code expired');
        }

        // Mark as view-only
        const viewOnlyGrid = {
          ...grid,
          isViewOnly: true,
          accessLevel: 'view-only' as const
        };

        setGridState(viewOnlyGrid);

        // Track grid view
        analytics.gridViewed(grid.id!, false, joinCode);

        // Record view in database for analytics
        if (grid.id) {
          try {
            // Create a simple hash of IP for privacy (using a random identifier for now)
            const viewerHash = crypto.randomUUID();

            await supabase.from('grid_views').insert({
              grid_id: grid.id,
              viewer_ip_hash: viewerHash,
            });
          } catch (viewError) {
            console.error('Failed to track view:', viewError);
            // Don't fail the whole page load if view tracking fails
          }
        }

      } catch (err) {
        console.error('Failed to load shared grid:', err);
        setError(err instanceof Error ? err.message : 'Failed to load grid');
      } finally {
        setLoading(false);
      }
    };

    loadSharedGrid();
  }, [joinCode]);

  // Real-time updates for premium grids
  useGridRealtime(
    gridState?.id,
    (updatedData) => {
      if (gridState) {
        setGridState({
          ...gridState,
          ...updatedData,
        });
      }
    },
    gridState?.ownership?.isPremium || false
  );

  const getWinningBoxes = (): number[] => {
    if (!gridState?.gameWinners || !gridState.numbersGenerated) return [];

    return gridState.gameWinners.map(winner => {
      const rowIndex = gridState.rowNumbers.indexOf(winner.awayLastDigit);
      const colIndex = gridState.colNumbers.indexOf(winner.homeLastDigit);
      return rowIndex * 10 + colIndex;
    });
  };

  const handleExportPDF = async () => {
    if (!gridState) return;

    try {
      setExportingPDF(true);
      await generatePDF(gridState);

      // Track analytics
      if (gridState.id) {
        analytics.gridExportedPDF(gridState.id);
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-black">Loading shared grid...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-black mb-2">Grid Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors inline-block"
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
  const totalPot = gridState.pricePerBox * 100;

  // Calculate side pools
  const enabledSidePools = (gridState.sidePools || []).filter(pool => pool.enabled);
  const totalSidePoolPercentage = enabledSidePools.reduce((sum, pool) => sum + (pool.percentage || 0), 0);
  const totalSidePoolAmount = Math.round((totalPot * totalSidePoolPercentage) / 100);

  // Calculate payouts - all percentages are of the total pot (not remaining pot)
  const calculatedPayouts = gridState.payoutRules.map(rule => ({
    quarter: rule.quarter,
    percentage: rule.percentage,
    amount: Math.round((totalPot * rule.percentage) / 100)
  }));

  const sidePoolPayouts = enabledSidePools.map(pool => ({
    quarter: pool.name,
    percentage: pool.percentage || 0,
    amount: Math.round((totalPot * (pool.percentage || 0)) / 100)
  }));

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1566577739112-5180d4bf9390?q=80&w=3333&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-linear-to-br from-blue-900/75 via-blue-800/65 to-green-900/75"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-gray-900">
                  {gridState.title || 'Super Bowl LX'}
                </h1>
                <p className="text-gray-600 text-sm mt-1">Shared Grid - View Only</p>
              </div>
              <div className="md:hidden min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {gridState.title || 'Super Bowl LX'}
                </h1>
                <p className="text-xs text-gray-600">Shared Grid - View Only</p>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/?join=1"
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Enter Share Code
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Sign Up Free
                </Link>
                <Link
                  href="/"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Create Your Own
                </Link>
              </div>
              <button
                onClick={() => setShowMobileMenu((prev) => !prev)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
            {showMobileMenu && (
              <div className="md:hidden mt-4 pt-4 border-t border-white/30">
                <div className="flex flex-col gap-3">
                <Link
                  href="/?join=1"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors text-center"
                >
                  Enter Share Code
                </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setShowMobileMenu(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-center"
                  >
                    Sign Up Free
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setShowMobileMenu(false)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-center"
                  >
                    Create Your Own
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>
              View Only: this shared grid can’t be edited here.
            </span>
            <Link href="/" className="font-semibold text-blue-700 hover:underline">
              Create your own grid
            </Link>
          </div>
          {/* Stats Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border border-white/20">

          {/* Stats - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Grid Stats */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Grid Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Boxes Filled:</span>
                  <span className="font-bold text-black">{filledBoxesCount}/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Price Per Box:</span>
                  <span className="font-bold text-black">${gridState.pricePerBox}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Numbers:</span>
                  <span className="font-bold text-black">
                    {gridState.numbersGenerated ? '✅ Generated' : '⏳ Pending'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Winners:</span>
                  <span className="font-bold text-black">{gridState.gameWinners?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Pot Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Pot Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total Pot:</span>
                  <span className="font-bold text-green-600 text-xl">${totalPot.toLocaleString()}</span>
                </div>

                {/* Main Payouts */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Main Payouts:</div>
                  {calculatedPayouts.map((payout, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{payout.quarter}:</span>
                      <span className="text-black font-medium">${payout.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Side Pools */}
                {sidePoolPayouts.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Side Pools:</div>
                    {sidePoolPayouts.map((payout, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{payout.quarter}:</span>
                        <span className="text-purple-600 font-medium">${payout.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              {exportingPDF ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
          </div>
          </div>

          {/* Grid - Full Width */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🏈 {gridState.title || 'Super Bowl LX'}
          </h2>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full relative">

              {/* Top Left Corner Spacer */}
              <div className="absolute top-0 left-0 w-32 h-32 border-2 border-gray-400 bg-white z-50"></div>

              {/* Team Name Row */}
              <div className="flex">
                <div className="w-12 h-16"></div>
                <div className="w-12 h-16"></div>
                <div className="flex-1 min-w-160 h-16 flex items-center justify-center font-semibold text-base md:text-lg lg:text-xl text-black border-2 border-gray-400 bg-blue-50">
                  {gridState.homeTeamName || 'Home Team'}
                </div>
              </div>

              {/* Column Headers */}
              <div className="flex">
                <div className="w-16 h-16"></div>
                <div className="w-16 h-16"></div>
                <div className="flex flex-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="flex-1 min-w-20 h-16 border-2 border-gray-400 bg-blue-100 flex items-center justify-center font-bold text-base md:text-lg lg:text-xl text-black">
                      {gridState.numbersGenerated ? gridState.colNumbers[i] : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Rows Container with Away Team */}
              <div className="relative flex">
                {/* Away Team - spans all rows */}
                <div className="w-12 h-200 flex items-center justify-center font-semibold text-base md:text-lg lg:text-xl text-black border-2 border-gray-400 bg-red-50 absolute left-0">
                  <span className="transform -rotate-90 whitespace-nowrap">{gridState.awayTeamName || 'Away Team'}</span>
                </div>

                {/* Grid Rows */}
                <div className="ml-12 flex-1">
                  {Array.from({ length: 10 }, (_, row) => (
                    <div key={row} className="flex">
                      <div className="w-20 h-20 border-2 border-gray-400 bg-red-100 flex items-center justify-center font-bold text-base md:text-lg lg:text-xl text-black shrink-0">
                        {gridState.numbersGenerated ? gridState.rowNumbers[row] : ''}
                      </div>
                      <div className="flex flex-1">
                        {/* Row Boxes */}
                        {Array.from({ length: 10 }, (_, col) => {
                          const boxIndex = row * 10 + col;
                          const box = gridState.boxes[boxIndex];
                          const isWinningBox = getWinningBoxes().includes(boxIndex);
                          const winner = gridState.gameWinners?.find(w => w.boxIndex === boxIndex);

                          return (
                            <div
                              key={col}
                              className={`flex-1 min-w-20 h-20 border border-gray-300 flex items-center justify-center text-sm md:text-base lg:text-lg font-medium text-black relative ${
                                isWinningBox
                                  ? 'bg-yellow-200 border-yellow-500 border-2 shadow-lg'
                                  : box.name
                                    ? 'bg-green-50'
                                    : 'bg-white'
                              }`}
                              title={box.name || 'Empty box'}
                            >
                              {/* Number badge in top right corner */}
                              <div className="absolute top-0 right-0 bg-white text-black text-[10px] md:text-xs lg:text-sm font-semibold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                                {boxIndex + 1}
                              </div>

                              {/* Winner badge in top left corner */}
                              {winner && (
                                <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] md:text-[10px] lg:text-xs font-bold w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-br">
                                  {winner.quarter.split(' ')[0]}
                                </div>
                              )}

                              <span className="truncate px-1">{box.name || ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            <div className="mb-2">
              <span className="font-semibold text-green-600">{gridState.homeTeamName || 'Home Team'}</span> numbers run horizontally (top)
            </div>
            <div>
              <span className="font-semibold text-red-600">{gridState.awayTeamName || 'Away Team'}</span> numbers run vertically (left)
            </div>
          </div>

          {/* Winners List */}
          {gridState.gameWinners && gridState.gameWinners.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Winners</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {gridState.gameWinners.map((winner, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <div className="font-bold text-black">{winner.participantName}</div>
                    <div className="text-sm text-gray-600">{winner.quarter}</div>
                    <div className="text-sm text-gray-600">
                      Numbers: {winner.awayLastDigit}-{winner.homeLastDigit}
                    </div>
                    <div className="font-bold text-green-600 text-lg">${winner.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

          <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-4 mb-6 border border-white/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Want your own grid?</div>
              <div className="text-sm text-gray-600">Create a free grid and share it with your group.</div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Create your own grid
            </Link>
          </div>

          {/* Advertisement - Create Your Own Grid */}
          <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-8 border border-white/20">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">Create Your Own Super Bowl Squares Grid</h2>
              <p className="text-lg mb-6 text-gray-700">
                Free to create • Custom payouts • Side pools • Live scoring • Easy sharing
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors inline-block shadow-lg"
                >
                  Sign Up Free
                </Link>
                <Link
                  href="/"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors inline-block shadow-lg"
                >
                  Create Your Own
                </Link>
              </div>
              <div className="mt-6 text-sm text-gray-600">
                Join thousands of users hosting Super Bowl squares games
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-white text-sm">
            <p>This grid is shared in view-only mode. Contact the grid owner to request changes.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
