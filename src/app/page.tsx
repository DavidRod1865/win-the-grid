'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserMenu from '@/components/ui/UserMenu';
import { useAuth } from '@/contexts/AuthContext';

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [showGridCodeModal, setShowGridCodeModal] = useState(false);
  const [gridCode, setGridCode] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const shouldShowModal = searchParams.get('join') === '1';
    setShowGridCodeModal(shouldShowModal);
  }, [searchParams]);

  const handleStartGrid = () => {
    if (user) {
      router.push('/grids?new=1');
    } else {
      router.push('/grid');
    }
  };

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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/75 via-blue-800/65 to-green-900/75"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🏈 Win The Grid
            </h1>
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setShowGridCodeModal(true)}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                Enter Share Code
              </button>
              <UserMenu />
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
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowGridCodeModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 text-left"
                >
                  Enter Share Code
                </button>
                <UserMenu />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
            The easiest way to run
            <br />
            <span className="text-yellow-300">Football Squares</span>
          </h2>
          <p className="text-xl text-white/95 mb-8 max-w-2xl mx-auto drop-shadow-md">
            Create, manage, and share your football squares pool in minutes. No spreadsheets. No headaches. Just fun.
          </p>
          
          <div className="flex flex-col gap-6 items-center mb-12">
            <button
              onClick={handleStartGrid}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105 rainbow-shadow"
            >
              Start a Grid
            </button>
            <div className="w-full max-w-md">
              <div className="text-sm font-semibold text-white mb-2">Join a grid with a share code</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={gridCode}
                  onChange={(e) => setGridCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character share code"
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-md border border-white/40 bg-white/90 text-black font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Enter share code"
                />
                <button
                  onClick={() => {
                    if (gridCode.length === 6) {
                      window.location.href = `/grid?code=${gridCode}`;
                    }
                  }}
                  disabled={gridCode.length !== 6}
                  className="px-5 py-3 bg-white text-blue-700 rounded-md font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors"
                >
                  View Grid
                </button>
              </div>
              <div className="text-xs text-white/80 mt-2">
                Enter the 6-character share code provided by the grid creator.
              </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
              .rainbow-shadow {
                position: relative;
              }
              .rainbow-shadow:hover {
                animation: rainbow-shadow 2s linear infinite;
              }
              @keyframes rainbow-shadow {
                0% {
                  box-shadow: 0 4px 20px rgba(255, 0, 0, 0.5), 0 0 30px rgba(255, 0, 0, 0.3);
                }
                14% {
                  box-shadow: 0 4px 20px rgba(255, 127, 0, 0.5), 0 0 30px rgba(255, 127, 0, 0.3);
                }
                28% {
                  box-shadow: 0 4px 20px rgba(255, 255, 0, 0.5), 0 0 30px rgba(255, 255, 0, 0.3);
                }
                42% {
                  box-shadow: 0 4px 20px rgba(0, 255, 0, 0.5), 0 0 30px rgba(0, 255, 0, 0.3);
                }
                57% {
                  box-shadow: 0 4px 20px rgba(0, 0, 255, 0.5), 0 0 30px rgba(0, 0, 255, 0.3);
                }
                71% {
                  box-shadow: 0 4px 20px rgba(75, 0, 130, 0.5), 0 0 30px rgba(75, 0, 130, 0.3);
                }
                85% {
                  box-shadow: 0 4px 20px rgba(148, 0, 211, 0.5), 0 0 30px rgba(148, 0, 211, 0.3);
                }
                100% {
                  box-shadow: 0 4px 20px rgba(255, 0, 0, 0.5), 0 0 30px rgba(255, 0, 0, 0.3);
                }
              }
            `}} />
          </div>

          <p className="text-sm text-white/90 drop-shadow-md">
            No sign-up required to get started • Free forever for basic features
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-white/20">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast Setup</h3>
            <p className="text-gray-600">
              Create your grid in seconds. Set prices, choose payouts, add participants, and generate numbers instantly.
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-white/20">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Flexible Payouts</h3>
            <p className="text-gray-600">
              Choose from multiple payout templates, create custom structures, or add side pools. Automatic calculations included.
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-white/20">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Payment Tracking</h3>
            <p className="text-gray-600">
              Track who's paid and who hasn't. See total money collected with real-time progress bars and participant management.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-white/20 mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Set Up Your Grid</h4>
              <p className="text-sm text-gray-600">Choose your price per box, select a payout template or create custom payouts, and add optional side pools</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Add Participants</h4>
              <p className="text-sm text-gray-600">Fill in participant names across the 100 squares and track payment status</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-yellow-600">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Generate Numbers</h4>
              <p className="text-sm text-gray-600">Once all squares are filled, generate random 0-9 numbers for rows and columns</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Play & Track Winners</h4>
              <p className="text-sm text-gray-600">Watch the game, enter scores, and automatically calculate winners for each quarter and side pools</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600/95 to-green-600/95 backdrop-blur-sm rounded-2xl p-12 text-white shadow-2xl border border-white/20">
          <h3 className="text-3xl font-bold mb-4">Ready to win the grid?</h3>
          <p className="text-xl mb-8 opacity-90">
            Start your free grid now. No credit card. No commitment. Just squares.
          </p>
          <button
            onClick={handleStartGrid}
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg transition-all duration-200 hover:shadow-2xl transform hover:scale-105"
          >
            Start a Grid →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/95 backdrop-blur-sm text-gray-300 py-8 mt-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4">© 2024 Win The Grid. Made for football fans, by football fans.</p>
          <div className="flex justify-center items-center gap-6 mb-4">
            <Link href="/how-to-play" className="hover:text-white transition-colors text-sm">
              How to Play
            </Link>
            <Link href="/?join=1" className="hover:text-white transition-colors text-sm">
              Have a share code? Join a grid
            </Link>
            <Link href="/grid" className="hover:text-white transition-colors text-sm">
              Privacy
            </Link>
            <Link href="/grid" className="hover:text-white transition-colors text-sm">
              Terms
            </Link>
          </div>
        </div>
      </footer>
      </div>

      {/* Share Code Modal */}
      {showGridCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowGridCodeModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black">Enter Share Code</h3>
              <button
                onClick={() => setShowGridCodeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close share code modal"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Code
                </label>
                <input
                  type="text"
                  value={gridCode}
                  onChange={(e) => setGridCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character share code"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-lg font-mono tracking-widest text-center"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the 6-character share code provided by the grid creator
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowGridCodeModal(false);
                    setGridCode('');
                  }}
                  className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (gridCode.length === 6) {
                      // TODO: Implement share code lookup and navigation
                      console.log('Grid code entered:', gridCode);
                      // Navigate to grid view with code
                      window.location.href = `/grid?code=${gridCode}`;
                    }
                  }}
                  disabled={gridCode.length !== 6}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
                >
                  View Grid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LandingPageContent />
    </Suspense>
  );
}
