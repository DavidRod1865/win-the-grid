'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import UserMenu from '@/components/ui/UserMenu';
import Link from 'next/link';

interface GridSummary {
  id: string;
  title: string;
  participantCount: number;
  numbersGenerated: boolean;
  gameState: string;
  createdAt: string;
  pricePerBox: number;
}

export default function GridsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grids, setGrids] = useState<GridSummary[]>([]);
  const [loadingGrids, setLoadingGrids] = useState(true);
  const [creatingNewGrid, setCreatingNewGrid] = useState(false);
  const hasAutoCreated = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadUserGrids();
    }
  }, [user]);

  useEffect(() => {
    if (!user || loading || hasAutoCreated.current) return;
    if (searchParams.get('new') === '1') {
      hasAutoCreated.current = true;
      createNewGrid().finally(() => {
        router.replace('/grids');
      });
    }
  }, [user, loading, searchParams, router]);

  const createNewGrid = async () => {
    if (!user) return;
    
    try {
      setCreatingNewGrid(true);
      
      const { SupabaseProvider } = await import('@/lib/storage');
      const supabaseProvider = new SupabaseProvider();
      
      // Create a new empty grid
      const defaultGridState = {
        boxes: Array.from({ length: 100 }, (_, i) => ({
          id: `box-${i}`,
          name: '',
          row: Math.floor(i / 10),
          col: i % 10
        })),
        rowNumbers: [],
        colNumbers: [],
        numbersGenerated: false,
        pricePerBox: 10,
        payoutRules: [
          { quarter: '1st Quarter', percentage: 25 },
          { quarter: 'Halftime', percentage: 25 },
          { quarter: '3rd Quarter', percentage: 25 },
          { quarter: 'Final Score', percentage: 25 }
        ],
        selectedTemplate: 'Balanced',
        title: 'Super Bowl LX',
        gameState: 'draft' as const,
        homeTeamName: 'Home Team',
        awayTeamName: 'Away Team',
        winners: {},
        currentScores: [],
        gameWinners: [],
        sidePools: [],
        participantPayments: []
      };
      
      // Save the new grid to database
      const newGridId = await supabaseProvider.saveGrid(defaultGridState);
      console.log('Created new grid:', newGridId);
      
      // Reload the grids list to show the new grid
      await loadUserGrids();
      
    } catch (error) {
      console.error('Failed to create new grid:', error);
      alert('Failed to create new grid. Please try again.');
    } finally {
      setCreatingNewGrid(false);
    }
  };

  const loadUserGrids = async () => {
    try {
      setLoadingGrids(true);
      
      // Load grids from Supabase since user is authenticated
      const { SupabaseProvider } = await import('@/lib/storage');
      const storageProvider = new SupabaseProvider();
      
      const userGrids = await storageProvider.loadUserGrids();
      
      // Transform GridState to GridSummary
      const gridSummaries: GridSummary[] = userGrids.map(grid => {
        const participantCount = grid.boxes?.filter(box => box.name?.trim()).length || 0;
        
        return {
          id: grid.id || 'unknown',
          title: grid.title || 'Super Bowl Grid',
          participantCount,
          numbersGenerated: Boolean(grid.numbersGenerated),
          gameState: grid.gameState || 'draft',
          createdAt: grid.ownership?.createdAt || new Date().toISOString(),
          pricePerBox: grid.pricePerBox || 10
        };
      });
      
      setGrids(gridSummaries);
      
    } catch (error) {
      console.error('Error loading grids:', error);
      // Fallback to empty array instead of showing error to user
      setGrids([]);
    } finally {
      setLoadingGrids(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateText = (state: string) => {
    switch (state) {
      case 'draft': return 'Draft';
      case 'ready': return 'Ready';
      case 'live': return 'Live';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-gray-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
            >
              🏈 Win The Grid
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Grids</h1>
          <p className="text-gray-600">Manage your Super Bowl squares grids</p>
        </div>

        {/* Create New Grid Button */}
        <div className="mb-6">
          <button
            onClick={createNewGrid}
            disabled={creatingNewGrid}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {creatingNewGrid ? 'Creating...' : 'Create New Grid'}
          </button>
        </div>

        {/* Grids List */}
        {loadingGrids ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : grids.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Grids Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first Super Bowl squares grid to get started!
            </p>
            <button
              onClick={createNewGrid}
              disabled={creatingNewGrid}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {creatingNewGrid ? 'Creating...' : 'Create Your First Grid'}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {grids.map((grid) => (
              <div key={grid.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{grid.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(grid.gameState)}`}>
                    {getStateText(grid.gameState)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span className="font-medium">{grid.participantCount}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per box:</span>
                    <span className="font-medium">${grid.pricePerBox}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Numbers:</span>
                    <span className="font-medium">
                      {grid.numbersGenerated ? '✅ Generated' : '⏳ Pending'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/edit-grid/${grid.id}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md font-medium transition-colors"
                  >
                    {grid.gameState === 'live' ? 'View Live' : 'Edit Grid'}
                  </Link>
                  {grid.gameState === 'ready' || grid.gameState === 'live' ? (
                    <Link
                      href={`/edit-grid/${grid.id}?gameDay=true`}
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                    >
                      Game Day
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}