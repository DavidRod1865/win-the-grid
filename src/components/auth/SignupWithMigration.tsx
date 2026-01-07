'use client';

import { useState, useEffect } from 'react';
import { LocalStorageProvider } from '@/lib/storage/localStorage';
import { supabase } from '@/lib/supabase';
import MigrationPreview from './MigrationPreview';
import MigrationFlow from './MigrationFlow';

interface SignupWithMigrationProps {
  onComplete: (success: boolean, gridId?: string) => void;
}

type SignupStep = 'check-data' | 'show-preview' | 'signup-form' | 'migration' | 'complete';

export default function SignupWithMigration({ onComplete }: SignupWithMigrationProps) {
  const [currentStep, setCurrentStep] = useState<SignupStep>('check-data');
  const [hasLocalData, setHasLocalData] = useState(false);
  const [skipMigration, setSkipMigration] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkForLocalData();
  }, []);

  const checkForLocalData = async () => {
    try {
      const hasSignificantData = LocalStorageProvider.hasSignificantData();
      setHasLocalData(hasSignificantData);
      
      if (hasSignificantData) {
        setCurrentStep('show-preview');
      } else {
        setCurrentStep('signup-form');
      }
    } catch (error) {
      console.error('Failed to check local data:', error);
      setCurrentStep('signup-form');
    }
  };

  const handlePreviewContinue = () => {
    setSkipMigration(false);
    setCurrentStep('signup-form');
  };

  const handlePreviewSkip = () => {
    setSkipMigration(true);
    setCurrentStep('signup-form');
  };

  const handleSignupSubmit = async (formData: { email: string; password: string; name: string }) => {
    try {
      setUserInfo(formData);

      console.log('Attempting signup for:', formData.email);

      // Implement actual Supabase authentication
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            full_name: formData.name, // Add full_name for profile creation
          }
        }
      });

      if (error) {
        console.error('Supabase signup error:', {
          message: error.message,
          status: error.status,
          details: error
        });
        
        // Provide user-friendly error messages
        let userMessage = error.message;
        if (error.message.includes('Database error')) {
          userMessage = 'Database setup issue. Please check the setup instructions.';
        } else if (error.message.includes('User already registered')) {
          userMessage = 'An account with this email already exists. Try signing in instead.';
        } else if (error.message.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address.';
        }
        
        throw new Error(userMessage);
      }

      console.log('Signup successful:', data);
      
      // Use real user ID from Supabase
      setUserId(data.user?.id || null);

      if (hasLocalData && !skipMigration) {
        setCurrentStep('migration');
      } else {
        if (skipMigration) {
          // Clear localStorage if user chose to skip migration
          await LocalStorageProvider.clearAfterMigration();
        }
        setCurrentStep('complete');
      }

    } catch (error) {
      console.error('Signup failed:', error);
      // Handle signup error - show error message to user
      throw error; // Let the form handle the error
    }
  };

  const handleMigrationComplete = (success: boolean, gridId?: string) => {
    if (success) {
      setCurrentStep('complete');
      setTimeout(() => onComplete(true, gridId), 2000);
    } else {
      console.error('Migration failed');
      // Could show error state or continue without migration
      setCurrentStep('complete');
    }
  };

  const handleMigrationSkip = () => {
    setCurrentStep('complete');
    setTimeout(() => onComplete(true), 2000);
  };

  if (currentStep === 'check-data') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center space-x-3 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Checking your data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'show-preview') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
          <p className="text-gray-600">We found some saved grid data on this device</p>
        </div>
        <MigrationPreview
          onContinue={handlePreviewContinue}
          onSkip={handlePreviewSkip}
        />
      </div>
    );
  }

  if (currentStep === 'signup-form') {
    return (
      <div className="max-w-md mx-auto">
        <SignupForm
          onSubmit={handleSignupSubmit}
          showMigrationInfo={hasLocalData && !skipMigration}
        />
      </div>
    );
  }

  if (currentStep === 'migration') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {userInfo?.name}!</h2>
          <p className="text-gray-600">Let's set up your account and preserve your data</p>
        </div>
        <MigrationFlow
          userId={userId || undefined}
          onComplete={handleMigrationComplete}
          onSkip={handleMigrationSkip}
        />
      </div>
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Account Created!</h2>
          <p className="text-green-700 mb-4">
            Welcome to your new account. You're all set!
          </p>
          <div className="animate-pulse text-green-600 text-sm">
            Redirecting to your dashboard...
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Simple signup form component
function SignupForm({ 
  onSubmit, 
  showMigrationInfo 
}: { 
  onSubmit: (data: { email: string; password: string; name: string }) => void;
  showMigrationInfo: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await onSubmit({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
        <p className="text-gray-600">Join to unlock premium features</p>
      </div>

      {showMigrationInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">ℹ️</span>
            <span className="text-blue-800 text-sm font-medium">Your grid data will be preserved</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Choose a password"
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-gray-500">
        By creating an account, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  );
}