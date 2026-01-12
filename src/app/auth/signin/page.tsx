'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LocalStorageProvider } from '@/lib/storage/localStorage';
import { supabase } from '@/lib/supabase';

export default function SigninPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasLocalData, setHasLocalData] = useState(false);

  // Check for local data on component mount
  React.useEffect(() => {
    const checkLocalData = () => {
      const hasData = LocalStorageProvider.hasSignificantData();
      setHasLocalData(hasData);
    };
    
    checkLocalData();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Implement actual Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      console.log('Sign in successful:', data.user?.email);
      
      // Check if user has local data that needs migration
      if (hasLocalData) {
        // Show migration option or automatically migrate
        router.push('/auth/migrate');
      } else {
        // Normal signin flow - go to grids page
        router.push('/grids');
      }

    } catch (error) {
      console.error('Signin error:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to sign in. Please check your credentials and try again.' 
      });
    } finally {
      setIsSubmitting(false);
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
              <span className="text-gray-600">New to Win The Grid?</span>
              <Link
                href="/auth/signup"
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your account to access your grids</p>
            </div>

            {/* Local Data Notice */}
            {hasLocalData && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <span className="text-amber-600 text-lg">⚡</span>
                  <div>
                    <h3 className="text-amber-800 font-semibold text-sm">Local Data Found</h3>
                    <p className="text-amber-700 text-sm mt-1">
                      We found grid data on this device. After signing in, you can choose to migrate it to your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to Win The Grid?</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-6">
              <Link
                href="/auth/signup"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Create a Free Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>
          Need help?{' '}
          <Link href="/contact" className="text-blue-600 hover:underline">
            Contact Support
          </Link>
        </p>
      </footer>
    </div>
  );
}