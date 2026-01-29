'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HowToPlay() {
  const [isSetupSectionOpen, setIsSetupSectionOpen] = useState(false);
  const [isGridCodeSectionOpen, setIsGridCodeSectionOpen] = useState(false);
  const [isPricingSectionOpen, setIsPricingSectionOpen] = useState(false);
  const [isSquaresSectionOpen, setIsSquaresSectionOpen] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen relative flex flex-col">
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
      <div className="relative z-10 flex flex-col flex-grow">
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <h1 className="hidden md:flex text-2xl font-bold text-gray-900 items-center gap-2">
              🏈 Win The Grid - How to Play Football Squares
            </h1>
            <h1 className="md:hidden text-lg font-bold text-gray-900 truncate">
              🏈 How to Play
            </h1>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/?join=1"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                Enter Share Code
              </Link>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                Back to Home
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
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  Enter Share Code
                </Link>
                <Link
                  href="/"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex-grow">
        <div className="space-y-8">
          
          {/* How to Set Up Your Grid Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20 overflow-hidden">
            <button
              onClick={() => setIsSetupSectionOpen(!isSetupSectionOpen)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/50 transition-colors"
            >
              <h2 className="text-2xl font-bold text-gray-900">How to Set Up Your Grid</h2>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${isSetupSectionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${isSetupSectionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-6 pb-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Configure Game Settings</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Enter the price per box (e.g., $10, $25, $50)</li>
                  <li>Choose a payout template from the dropdown (Balanced, Big Finish, etc.) or select "Custom" to create your own</li>
                  <li>If using Custom, set percentages for each quarter (must total 100%)</li>
                  <li>Optionally add side pools like Reverse Final Score, Overtime Jackpot, or create custom side pools</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Add Participants</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Click on any empty square in the grid to add a participant's name</li>
                  <li>Press Enter to save or Escape to cancel</li>
                  <li>Continue until all 100 squares are filled</li>
                  <li>Track payment status using the Participants section - mark who has paid and when</li>
                  <li>Use the search and filter options to find specific participants</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Generate Numbers</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Once all 100 squares are filled, click the "Generate Numbers" button</li>
                  <li>Random numbers (0-9) will be assigned to rows and columns</li>
                  <li>The grid will display which participant has which square combination</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">4. During the Game</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Click the "Game Day" button to enter live scoring mode</li>
                  <li>Enter scores for each quarter as the game progresses</li>
                  <li>The app will automatically calculate winners for each quarter and side pools</li>
                  <li>View payout amounts and winner information in real-time</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Export & Share</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Export your grid to Excel for easy sharing and record-keeping</li>
                  <li>Print or save as PDF to share with participants</li>
                  <li>Use share codes to share your pool with others (requires a free account)</li>
                </ul>
              </div>
              </div>
            </div>
          </div>

          {/* Got a Share Code? Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20 overflow-hidden">
            <button
              onClick={() => setIsGridCodeSectionOpen(!isGridCodeSectionOpen)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/50 transition-colors"
            >
              <h2 className="text-2xl font-bold text-gray-900">Got a Share Code?</h2>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${isGridCodeSectionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${isGridCodeSectionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-6 pb-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">What is a Share Code?</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  A Share Code is a unique 6-character identifier that allows you to view and join an existing Football Squares pool. 
                  If someone has shared a share code with you, you can use it to access their pool and see the current state of the game.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">How to Use a Share Code</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>From the home page, enter the share code in the join field</li>
                  <li>Enter the 6-character share code provided by the grid creator</li>
                  <li>Click "View Grid" to access the pool</li>
                  <li>You'll be able to see the grid, participants, and current game state</li>
                  <li>Note: You may have view-only access depending on the pool settings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Getting a Share Code</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  If you're the grid creator and want to share your pool:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Share codes are automatically generated when you create a new grid</li>
                  <li>You can find your share code in the grid settings or share options</li>
                  <li>Share the code with participants so they can view or join your pool</li>
                  <li>Share codes are case-insensitive and easy to share via text, email, or social media</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-800 text-sm">
                  <strong>Tip:</strong> Keep your share code safe and only share it with people you want to have access to your pool. 
                  Anyone with the code can view your grid.
                </p>
              </div>
              </div>
            </div>
          </div>

          {/* Pricing & Plans Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20 overflow-hidden">
            <button
              onClick={() => setIsPricingSectionOpen(!isPricingSectionOpen)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/50 transition-colors"
            >
              <h2 className="text-2xl font-bold text-gray-900">Pricing & Plans</h2>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${isPricingSectionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${isPricingSectionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-6 pb-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Free Tier</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Our free tier allows you to create and manage Football Squares grids with full functionality:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Create unlimited grids</li>
                  <li>Custom payout structures and side pools</li>
                  <li>Participant management and payment tracking</li>
                  <li>Export to Excel and PDF</li>
                  <li>Game day scoring and winner calculation</li>
                  <li><strong>Grid code sharing</strong> - Share your grid with others using a unique code (requires a free account)</li>
                </ul>
                <div className="bg-green-50 p-4 rounded-lg mt-3">
                  <p className="text-gray-800 text-sm">
                    <strong>Perfect for:</strong> Casual users, one-time pools, small groups, and anyone who wants to try the platform.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Sign In (Free Account)</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Creating a free account gives you additional benefits:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>All free tier features</li>
                  <li>Save and access your grids from any device</li>
                  <li>Grid history and easy grid management</li>
                  <li>Faster grid creation with saved preferences</li>
                  <li>Email notifications for grid updates</li>
                  <li>Priority customer support</li>
                </ul>
                <div className="bg-blue-50 p-4 rounded-lg mt-3">
                  <p className="text-gray-800 text-sm">
                    <strong>Perfect for:</strong> Regular users, pool organizers, and anyone who wants to manage multiple grids over time.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-800 text-sm">
                  <strong>Note:</strong> All features are free! Grid code sharing and game day mode are available to everyone at no cost.
                </p>
              </div>
              </div>
            </div>
          </div>

          {/* How to Play Squares Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20 overflow-hidden">
            <button
              onClick={() => setIsSquaresSectionOpen(!isSquaresSectionOpen)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-white/50 transition-colors"
            >
              <h2 className="text-2xl font-bold text-gray-900">How to Play Football Squares</h2>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${isSquaresSectionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${isSquaresSectionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-6 pb-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">What are Football Squares?</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Football Squares is a popular betting pool game played during football games. 
                  Players buy squares on a 10x10 grid (100 squares total), and winners are determined 
                  by the last digit of each team's score at the end of each quarter.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">How Winners are Determined</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Winners are based on the <strong>last digit</strong> of each team's score:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                  <li>If the Home Team has 14 points and the Away Team has 7 points, the winning square is at the intersection of row "4" and column "7"</li>
                  <li>Winners are typically determined at the end of each quarter (1st Quarter, Halftime, 3rd Quarter, and Final Score)</li>
                  <li>Some pools also include side pools like reverse scores, overtime jackpots, or winning team bonuses</li>
                </ul>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-800 text-sm">
                    <strong>Example:</strong> At the end of the 1st quarter, Home Team has 7 points and Away Team has 3 points.
                    <br />
                    <strong>Winner:</strong> The person in the square where row "7" meets column "3" wins the 1st quarter prize.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Common Payout Structures</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Balanced (25/25/25/25)</h4>
                    <p className="text-sm text-gray-700">Equal payouts for each quarter - keeps everyone engaged throughout the game</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Big Finish (15/20/15/50)</h4>
                    <p className="text-sm text-gray-700">Smaller early payouts with a big final prize - great for competitive pools</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Halftime + Final Only (40/60)</h4>
                    <p className="text-sm text-gray-700">Only two payouts to track - perfect for simpler pools</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Winner Take All (100% Final)</h4>
                    <p className="text-sm text-gray-700">Everything rides on the final score - maximum tension</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Side Pools</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Many pools include additional side pools for extra excitement:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Reverse Final Score:</strong> Uses reversed digits of the final score (e.g., if 4-0 wins, then 0-4 also wins)</li>
                  <li><strong>Overtime Jackpot:</strong> Pays only if the game goes to overtime</li>
                  <li><strong>Winning Team Bonus:</strong> Anyone matching the winning team's last digit qualifies (split if multiple winners)</li>
                  <li><strong>Reverse Halftime Score:</strong> Reverse digits applied only at halftime</li>
                  <li><strong>Custom Side Pools:</strong> Create your own side pool with custom rules and percentages</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Tips for Success</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Some numbers are statistically more common (0, 3, 4, 7 tend to appear more often in football scores)</li>
                  <li>However, since numbers are drawn randomly, every square has an equal chance before the draw</li>
                  <li>Make sure everyone understands the payout structure and side pool rules before the game starts</li>
                  <li>Keep the completed grid visible to all participants during the game</li>
                  <li>Track payments to ensure everyone has paid before generating numbers</li>
                </ul>
              </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20 p-8 text-center">
            <p className="text-gray-800 font-semibold text-lg mb-4">
              Ready to create your Football Squares grid?
            </p>
            <Link
              href="/grid"
              className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 hover:shadow-xl transform hover:scale-105"
            >
              Create Your Grid
            </Link>
          </div>
          
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900/95 backdrop-blur-sm text-gray-300 py-8 mt-auto border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4">© 2024 Win The Grid. Made for football fans, by football fans.</p>
          <div className="flex justify-center items-center gap-6 mb-4">
            <Link href="/how-to-play" className="hover:text-white transition-colors text-sm">
              How to Play
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
    </div>
  );
}
