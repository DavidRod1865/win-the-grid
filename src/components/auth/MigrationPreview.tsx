'use client';

import { useState, useEffect } from 'react';
import { LocalStorageProvider } from '@/lib/storage/localStorage';
import { MigrationTransformer } from '@/lib/storage/migration';
import { GridState } from '@/types';

interface MigrationPreviewProps {
  onContinue: () => void;
  onSkip: () => void;
  className?: string;
}

export default function MigrationPreview({ onContinue, onSkip, className = '' }: MigrationPreviewProps) {
  const [migrationData, setMigrationData] = useState<{
    hasData: boolean;
    gridState: GridState | null;
    metadata: any;
  } | null>(null);
  
  const [migrationSummary, setMigrationSummary] = useState<{
    title: string;
    summary: string;
    details: string[];
    preservedData: string[];
  } | null>(null);

  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMigrationData = async () => {
      try {
        const data = await LocalStorageProvider.getMigrationData();
        setMigrationData(data);

        if (data.hasData && data.gridState) {
          const summary = MigrationTransformer.createMigrationSummary(data.gridState);
          const estimate = MigrationTransformer.estimateMigration(data.gridState);
          
          setMigrationSummary(summary);
          setEstimatedTime(estimate.estimatedTime);
        }
      } catch (error) {
        console.error('Failed to check migration data:', error);
        setMigrationData({ hasData: false, gridState: null, metadata: null });
      } finally {
        setIsLoading(false);
      }
    };

    checkMigrationData();
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-blue-800">Checking your saved data...</span>
        </div>
      </div>
    );
  }

  if (!migrationData?.hasData || !migrationSummary) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Ready to Create Your Account
            </h3>
            <p className="text-green-700">
              No existing grid data found. You'll start fresh with a new account and can create your first grid with enhanced features.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onContinue}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  const { metadata } = migrationData;

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start space-x-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <span className="text-amber-600 text-lg">⚡</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-800 mb-2">
            Preserve Your Grid Data
          </h3>
          <p className="text-amber-700 mb-4">
            {migrationSummary.summary}
          </p>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="text-2xl font-bold text-amber-600">
            {metadata.participantCount}
          </div>
          <div className="text-sm text-amber-600">Participants</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="text-2xl font-bold text-amber-600">
            {metadata.numbersGenerated ? '✓' : '○'}
          </div>
          <div className="text-sm text-amber-600">Numbers</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="text-2xl font-bold text-amber-600">
            {migrationData.gridState?.gameWinners?.length || 0}
          </div>
          <div className="text-sm text-amber-600">Winners</div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="text-2xl font-bold text-amber-600">
            ${migrationData.gridState?.pricePerBox || 0}
          </div>
          <div className="text-sm text-amber-600">Per Box</div>
        </div>
      </div>

      {/* What Will Be Preserved */}
      <div className="mb-4">
        <h4 className="font-semibold text-amber-800 mb-2">What will be preserved:</h4>
        <ul className="space-y-1">
          {migrationSummary.preservedData.map((item, index) => (
            <li key={index} className="flex items-center text-amber-700">
              <span className="text-green-500 mr-2">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Migration Time */}
      <div className="bg-white rounded-lg p-3 border border-amber-200 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-amber-700">Estimated migration time:</span>
          <span className="font-semibold text-amber-800">{estimatedTime}</span>
        </div>
      </div>

      {/* New Features Preview */}
      <div className="mb-6">
        <h4 className="font-semibold text-amber-800 mb-2">Plus, unlock new features:</h4>
        <ul className="space-y-1">
          <li className="flex items-center text-amber-700">
            <span className="text-blue-500 mr-2">✨</span>
            Cloud backup - never lose your data
          </li>
          <li className="flex items-center text-amber-700">
            <span className="text-blue-500 mr-2">✨</span>
            Grid sharing with join codes
          </li>
          <li className="flex items-center text-amber-700">
            <span className="text-blue-500 mr-2">✨</span>
            Excel export functionality
          </li>
          <li className="flex items-center text-amber-700">
            <span className="text-blue-500 mr-2">✨</span>
            Access to premium game day features
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onContinue}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
        >
          Preserve My Data & Sign Up
        </button>
        <button
          onClick={onSkip}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium transition-colors"
        >
          Start Fresh Instead
        </button>
      </div>

      {/* Fine Print */}
      <div className="mt-3 text-xs text-amber-600">
        <p>
          * Your local data will be safely migrated to your new account. Original data remains until migration is confirmed successful.
        </p>
      </div>
    </div>
  );
}