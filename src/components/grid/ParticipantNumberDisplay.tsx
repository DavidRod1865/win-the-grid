'use client';

import { areNumbersGenerated } from '@/lib/utils/number-combinations';

interface ParticipantNumberDisplayProps {
  selectedParticipant: string;
  combinations: Array<{ home: number; away: number; boxIndex: number }>;
  rowNumbers: number[];
  colNumbers: number[];
}

export default function ParticipantNumberDisplay({
  selectedParticipant,
  combinations,
  rowNumbers,
  colNumbers,
}: ParticipantNumberDisplayProps) {
  const numbersGenerated = areNumbersGenerated(rowNumbers, colNumbers);

  if (!selectedParticipant) {
    return null;
  }

  if (!numbersGenerated) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
              Numbers Not Generated Yet
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Generate numbers first to see {selectedParticipant}'s winning combinations!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (combinations.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🎯</span>
        <div className="flex-1">
          <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2 text-lg">
            {selectedParticipant}'s Winning Numbers
          </h3>

          {/* Number Combinations */}
          <div className="flex flex-wrap gap-2 mb-3">
            {combinations.map((combo, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">🏈</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  {combo.home} × {combo.away}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Box #{combo.boxIndex + 1})
                </span>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-md p-3 border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-900 dark:text-blue-200 mb-1">
              <strong>How to win:</strong> You win if the game score ends with these digits!
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Example: If the score is <strong>17-23</strong>, the last digits are{' '}
              <strong>7×3</strong>. If you have 7×3, you win! ✓
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
