/**
 * Utilities for calculating winning number combinations for participants
 */

/**
 * Calculate winning number combinations for a participant's boxes
 * @param boxIndices - Array of box indices (0-99)
 * @param rowNumbers - Generated row numbers (home team)
 * @param colNumbers - Generated column numbers (away team)
 * @returns Array of number combinations with box indices
 */
export function getParticipantNumbers(
  boxIndices: number[],
  rowNumbers: number[],
  colNumbers: number[]
): Array<{ home: number; away: number; boxIndex: number }> {
  if (rowNumbers.length === 0 || colNumbers.length === 0) {
    return [];
  }

  return boxIndices.map((boxIndex) => {
    const row = Math.floor(boxIndex / 10); // 0-9 (home team)
    const col = boxIndex % 10; // 0-9 (away team)
    return {
      home: rowNumbers[row],
      away: colNumbers[col],
      boxIndex,
    };
  });
}

/**
 * Format number combinations for display
 * @param combinations - Array of number combinations
 * @returns Formatted string (e.g., "7×3, 2×8, 5×5")
 */
export function formatNumberCombinations(
  combinations: Array<{ home: number; away: number; boxIndex: number }>
): string {
  return combinations
    .map((combo) => `${combo.home}×${combo.away}`)
    .join(', ');
}

/**
 * Check if numbers are generated
 */
export function areNumbersGenerated(rowNumbers: number[], colNumbers: number[]): boolean {
  return rowNumbers.length === 10 && colNumbers.length === 10;
}
