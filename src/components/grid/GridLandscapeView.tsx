'use client';

import { GridState, SquareBox } from '@/types';

interface GridLandscapeViewProps {
  gridState: GridState;
  onBoxClick?: (index: number) => void;
  highlightedBoxes?: number[];
  isViewOnly?: boolean;
  compact?: boolean;
}

export default function GridLandscapeView({
  gridState,
  onBoxClick,
  highlightedBoxes = [],
  isViewOnly = false,
  compact = false,
}: GridLandscapeViewProps) {
  const { boxes, rowNumbers, colNumbers, gameWinners, homeTeamName, awayTeamName } = gridState;

  // Check if a box is a winner
  const isWinner = (boxIndex: number): { isWinner: boolean; quarter?: string } => {
    if (!gameWinners || gameWinners.length === 0) return { isWinner: false };

    const winner = gameWinners.find((w) => w.boxIndex === boxIndex);
    if (winner) {
      return { isWinner: true, quarter: winner.quarter };
    }
    return { isWinner: false };
  };

  // Get box at specific row and column
  const getBox = (row: number, col: number): SquareBox => {
    return boxes[row * 10 + col];
  };

  const boxSize = compact ? 'w-10 h-10 text-[10px]' : 'w-12 h-12 text-xs';
  const numberSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div className="w-full overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
      <div className="inline-block min-w-full">
        {/* Title and Info */}
        <div className="mb-4 text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {gridState.title}
          </h3>
          {gridState.pricePerBox && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ${gridState.pricePerBox} per box
            </p>
          )}
        </div>

        {/* Grid Container */}
        <div className="flex flex-col items-center">
          {/* Away Team Header (Horizontal) */}
          <div className="mb-2">
            <div className="text-center font-bold text-gray-700 dark:text-gray-300 text-sm mb-1">
              {awayTeamName}
            </div>
            <div className="flex gap-0">
              <div className={`${boxSize} mr-1`}></div>
              {colNumbers.map((num, index) => (
                <div
                  key={index}
                  className={`${boxSize} flex items-center justify-center font-bold bg-blue-500 text-white border border-blue-600`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Grid Rows */}
          <div className="flex">
            {/* Home Team Header (Vertical) */}
            <div className="mr-2">
              <div
                className={`text-center font-bold text-gray-700 dark:text-gray-300 ${numberSize} mb-1`}
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {homeTeamName}
              </div>
              <div className="flex flex-col gap-0">
                {rowNumbers.map((num, index) => (
                  <div
                    key={index}
                    className={`${boxSize} flex items-center justify-center font-bold bg-green-500 text-white border border-green-600`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Boxes */}
            <div className="grid grid-cols-10 gap-0">
              {Array.from({ length: 10 }).map((_, row) =>
                Array.from({ length: 10 }).map((_, col) => {
                  const box = getBox(row, col);
                  const boxIndex = row * 10 + col;
                  const { isWinner: boxIsWinner, quarter } = isWinner(boxIndex);
                  const isHighlighted = highlightedBoxes.includes(boxIndex);

                  return (
                    <button
                      key={boxIndex}
                      onClick={() => !isViewOnly && onBoxClick?.(boxIndex)}
                      disabled={isViewOnly}
                      className={`
                        ${boxSize}
                        relative border border-gray-300 dark:border-gray-600
                        flex items-center justify-center p-0.5
                        transition-all duration-200
                        ${
                          boxIsWinner
                            ? 'bg-yellow-300 dark:bg-yellow-600 ring-2 ring-yellow-500 dark:ring-yellow-400'
                            : 'bg-white dark:bg-gray-800'
                        }
                        ${isHighlighted ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
                        ${
                          !isViewOnly
                            ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                            : 'cursor-default'
                        }
                      `}
                      title={
                        box.name
                          ? `${box.name} - Box ${boxIndex + 1}`
                          : `Empty box ${boxIndex + 1}`
                      }
                    >
                      <span
                        className={`
                          font-medium text-gray-900 dark:text-white
                          truncate block w-full text-center
                          ${compact ? 'text-[9px]' : 'text-[10px]'}
                        `}
                      >
                        {box.name}
                      </span>

                      {/* Winner Badge */}
                      {boxIsWinner && quarter && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full shadow-lg">
                          {quarter}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Payout Preview (Compact) */}
          {gridState.payoutRules && gridState.payoutRules.length > 0 && (
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-300 dark:border-gray-600 shadow-sm">
              <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-2">
                Payouts
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {gridState.payoutRules.map((rule, index) => (
                  <div key={index} className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{rule.quarter}:</span> {rule.percentage}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
