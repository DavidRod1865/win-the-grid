'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignupWithMigration from '@/components/auth/SignupWithMigration';

export default function SignupPage() {
  const router = useRouter();

  const handleSignupComplete = (success: boolean, gridId?: string) => {
    if (success) {
      // Redirect based on whether they had migrated data or not
      if (gridId && gridId !== 'local-grid') {
        // They had data that was migrated - go to their grid
        router.push(`/grid?migrated=true`);
      } else {
        // Fresh start - go to main grid creation
        router.push('/grid?newUser=true');
      }
    } else {
      // Handle signup failure
      console.error('Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link 
              href="/"
              className="text-2xl font-bold text-gray-900 flex items-center gap-2 hover:text-blue-600 transition-colors"
            >
              🏈 Win The Grid
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-gray-600">Already have an account?</span>
              <Link
                href="/auth/signin"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 px-4">
        <SignupWithMigration onComplete={handleSignupComplete} />
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  );
}