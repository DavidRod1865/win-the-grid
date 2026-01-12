'use client';

import { useState, useEffect } from 'react';
import { LocalStorageProvider } from '@/lib/storage/localStorage';
import { SupabaseProvider } from '@/lib/storage/supabase';
import { StorageFactory } from '@/lib/storage';
import { MigrationTransformer } from '@/lib/storage/migration';
import { GridState } from '@/types';

interface MigrationFlowProps {
  onComplete: (success: boolean, gridId?: string) => void;
  onSkip: () => void;
  userId?: string;
}

type MigrationStep = 'checking' | 'validating' | 'migrating' | 'cleaning' | 'complete' | 'error';

export default function MigrationFlow({ onComplete, onSkip, userId }: MigrationFlowProps) {
  const [currentStep, setCurrentStep] = useState<MigrationStep>('checking');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Checking your saved data...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [migratedGridId, setMigratedGridId] = useState<string | null>(null);
  const [migrationData, setMigrationData] = useState<GridState | null>(null);

  useEffect(() => {
    if (userId) {
      startMigration();
    }
  }, [userId]);

  const updateProgress = (step: MigrationStep, progress: number, message: string) => {
    setCurrentStep(step);
    setProgress(progress);
    setStatusMessage(message);
  };

  const startMigration = async () => {
    try {
      // Step 1: Check for migration data
      updateProgress('checking', 10, 'Checking your saved data...');
      await new Promise(resolve => setTimeout(resolve, 500)); // UX delay

      const migrationInfo = await LocalStorageProvider.getMigrationData();
      
      if (!migrationInfo.hasData || !migrationInfo.gridState) {
        // No data to migrate, complete immediately
        updateProgress('complete', 100, 'No data to migrate - ready to go!');
        setTimeout(() => onComplete(true), 1000);
        return;
      }

      setMigrationData(migrationInfo.gridState);

      // Step 2: Validate data
      updateProgress('validating', 25, 'Validating your grid data...');
      await new Promise(resolve => setTimeout(resolve, 800));

      const supabaseData = MigrationTransformer.transformGridForSupabase(migrationInfo.gridState);
      const validation = MigrationTransformer.validateMigrationData(supabaseData);

      if (!validation.isValid) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('Migration warnings:', validation.warnings);
      }

      // Step 3: Migrate to Supabase
      updateProgress('migrating', 50, 'Saving your grid to the cloud...');

      console.log('Starting real Supabase migration...');
      const supabaseProvider = new SupabaseProvider();
      const gridId = await supabaseProvider.migrateLocalStorageGrid(migrationInfo.gridState);
      
      console.log('Migration successful, grid ID:', gridId);
      setMigratedGridId(gridId);

      updateProgress('migrating', 75, 'Finalizing cloud setup...');
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 4: Clean up localStorage
      updateProgress('cleaning', 90, 'Cleaning up local storage...');
      await new Promise(resolve => setTimeout(resolve, 400));

      await LocalStorageProvider.clearAfterMigration();

      // Step 5: Complete
      updateProgress('complete', 100, 'Migration completed successfully!');
      
      // Update storage factory to use Supabase
      StorageFactory.resetInstance();

      setTimeout(() => onComplete(true, migratedGridId || undefined), 1500);

    } catch (error) {
      console.error('Migration failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Migration failed unexpectedly');
      setCurrentStep('error');
    }
  };

  const handleRetry = () => {
    setCurrentStep('checking');
    setProgress(0);
    setErrorMessage(null);
    startMigration();
  };

  const handleSkipMigration = async () => {
    try {
      // Clear localStorage and continue without migration
      await LocalStorageProvider.clearAfterMigration();
      StorageFactory.resetInstance();
      onSkip();
    } catch (error) {
      console.error('Failed to skip migration:', error);
      onSkip(); // Continue anyway
    }
  };

  const getStepIcon = (step: MigrationStep) => {
    switch (step) {
      case 'checking':
        return '🔍';
      case 'validating':
        return '✅';
      case 'migrating':
        return '☁️';
      case 'cleaning':
        return '🧹';
      case 'complete':
        return '🎉';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  if (currentStep === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3 mb-4">
          <span className="text-2xl">❌</span>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Migration Failed
            </h3>
            <p className="text-red-700 mb-4">
              {errorMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRetry}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleSkipMigration}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
          >
            Skip Migration & Start Fresh
          </button>
        </div>

        <p className="mt-3 text-xs text-red-600">
          Your local data is still safe. You can try migrating again later or start with a fresh account.
        </p>
      </div>
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            Welcome to Your New Account!
          </h3>
          <p className="text-green-700 mb-4">
            Your grid data has been successfully migrated to the cloud.
          </p>
          
          {migrationData && (
            <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
              <h4 className="font-semibold text-green-800 mb-2">Migrated Data:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-600">Grid:</span> {migrationData.title}
                </div>
                <div>
                  <span className="text-green-600">Participants:</span> {migrationData.boxes?.filter(b => b.name?.trim()).length || 0}
                </div>
                {migrationData.numbersGenerated && (
                  <div className="col-span-2">
                    <span className="text-green-600">✓ Numbers generated and preserved</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-2 text-sm text-green-600">
            <p>✨ Cloud backup is now active</p>
            <p>✨ Grid sharing is available</p>
            <p>✨ Premium features unlocked</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">{getStepIcon(currentStep)}</div>
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          Setting Up Your Account
        </h3>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-blue-600 mb-2">
          <span>{statusMessage}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { step: 'checking', label: 'Check' },
          { step: 'validating', label: 'Validate' },
          { step: 'migrating', label: 'Migrate' },
          { step: 'cleaning', label: 'Clean up' }
        ].map(({ step, label }) => (
          <div 
            key={step}
            className={`text-center p-2 rounded-lg text-xs ${
              currentStep === step 
                ? 'bg-blue-200 text-blue-800 font-semibold' 
                : progress > (step === 'checking' ? 20 : step === 'validating' ? 40 : step === 'migrating' ? 80 : 90)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Migration Details */}
      {migrationData && (
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Migrating:</h4>
          <div className="text-sm text-blue-600">
            <p>📊 {migrationData.title}</p>
            <p>👥 {migrationData.boxes?.filter(b => b.name?.trim()).length || 0} participants</p>
            {migrationData.numbersGenerated && <p>🎲 Generated numbers</p>}
            {migrationData.gameWinners && migrationData.gameWinners.length > 0 && (
              <p>🏆 {migrationData.gameWinners.length} winners recorded</p>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-blue-600 text-center">
        This may take a few moments. Please don't close this window.
      </p>
    </div>
  );
}