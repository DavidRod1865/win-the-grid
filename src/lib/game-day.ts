import { GridState, GameScore, Winner, PayoutRule, SidePool } from '@/types';

export class GameDayManager {
  /**
   * Determines the winner for a given quarter based on scores
   */
  static determineWinner(
    gridState: GridState, 
    homeScore: number, 
    awayScore: number, 
    quarter: string
  ): Winner | null {
    if (!gridState.numbersGenerated) {
      throw new Error('Numbers must be generated before determining winners');
    }

    const homeLastDigit = homeScore % 10;
    const awayLastDigit = awayScore % 10;

    // Find the corresponding box
    const rowIndex = gridState.rowNumbers.indexOf(awayLastDigit);
    const colIndex = gridState.colNumbers.indexOf(homeLastDigit);

    if (rowIndex === -1 || colIndex === -1) {
      throw new Error('Invalid score digits - not found in grid');
    }

    const boxIndex = rowIndex * 10 + colIndex;
    const box = gridState.boxes[boxIndex];

    if (!box.name.trim()) {
      return null; // No participant in this box
    }

    // Find the payout amount for this quarter
    const rule = gridState.payoutRules.find(r => r.quarter === quarter);
    if (!rule) {
      throw new Error(`No payout rule found for quarter: ${quarter}`);
    }

    const amount = Math.round((gridState.pricePerBox * 100 * rule.percentage) / 100);

    return {
      quarter,
      homeLastDigit,
      awayLastDigit,
      boxIndex,
      participantName: box.name,
      amount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handles no-repeat logic for templates that don't allow the same person to win multiple quarters
   */
  static handleNoRepeatWinners(
    gridState: GridState,
    newWinner: Winner,
    existingWinners: Winner[]
  ): Winner[] {
    const template = gridState.selectedTemplate;
    const isNoRepeat = gridState.payoutRules.find(r => r.quarter === newWinner.quarter)?.quarter.includes('No-Repeat') ||
                      template.toLowerCase().includes('no-repeat');

    if (!isNoRepeat) {
      return [...existingWinners, newWinner];
    }

    // Check if this person has already won
    const hasAlreadyWon = existingWinners.some(w => w.participantName === newWinner.participantName);
    
    if (!hasAlreadyWon) {
      return [...existingWinners, newWinner];
    }

    // Person has already won - roll forward the payout to next available quarter
    const allQuarters = gridState.payoutRules.map(r => r.quarter);
    const completedQuarters = existingWinners.map(w => w.quarter);
    const currentQuarter = newWinner.quarter;

    // Find next quarter that hasn't been paid out
    const currentIndex = allQuarters.indexOf(currentQuarter);
    const nextQuarters = allQuarters.slice(currentIndex + 1);
    const nextAvailableQuarter = nextQuarters.find(q => !completedQuarters.includes(q));

    if (nextAvailableQuarter) {
      // Roll forward the payout
      const nextRule = gridState.payoutRules.find(r => r.quarter === nextAvailableQuarter);
      if (nextRule) {
        const combinedAmount = newWinner.amount + Math.round((gridState.pricePerBox * 100 * nextRule.percentage) / 100);
        
        // Add a special winner entry for the rollover
        const rolloverWinner: Winner = {
          ...newWinner,
          quarter: nextAvailableQuarter,
          amount: combinedAmount,
          timestamp: new Date().toISOString()
        };

        return [...existingWinners, rolloverWinner];
      }
    }

    // If no next quarter available, add to final pot or handle as special case
    return [...existingWinners, { ...newWinner, quarter: `${newWinner.quarter} (Rollover)` }];
  }

  /**
   * Gets the current game state based on grid completion and numbers
   */
  static getGameState(gridState: GridState): string {
    const filledBoxes = gridState.boxes.filter(box => box.name.trim() !== '').length;
    
    if (filledBoxes < 100) {
      return 'draft'; // Still filling boxes
    }
    
    if (!gridState.numbersGenerated) {
      return 'draft'; // Boxes filled but no numbers
    }
    
    if (gridState.gameState) {
      return gridState.gameState;
    }
    
    return 'ready'; // Ready to start game
  }

  /**
   * Validates that a score is reasonable for football
   */
  static validateScore(score: number, quarter: string): boolean {
    if (score < 0) return false;
    if (score > 100) return false; // Very high but possible
    
    // Additional validation could be added here
    return true;
  }

  /**
   * Gets available quarters for scoring based on payout rules
   */
  static getAvailableQuarters(gridState: GridState): string[] {
    return gridState.payoutRules.map(rule => rule.quarter);
  }

  /**
   * Formats quarter names for display
   */
  static formatQuarterName(quarter: string): string {
    return quarter
      .replace('1st Quarter', '1st')
      .replace('2nd Quarter', '2nd') 
      .replace('3rd Quarter', '3rd')
      .replace('4th Quarter', '4th')
      .replace('Halftime', 'Half')
      .replace('Final Score', 'Final');
  }

  /**
   * Calculates total payouts including rollovers
   */
  static calculateTotalPayouts(gridState: GridState, winners: Winner[]): number {
    return winners.reduce((total, winner) => total + winner.amount, 0);
  }

  /**
   * Gets the box coordinates for a winner (for highlighting)
   */
  static getWinnerCoordinates(winner: Winner): { row: number; col: number } {
    return {
      row: Math.floor(winner.boxIndex / 10),
      col: winner.boxIndex % 10
    };
  }

  /**
   * Determines side pool winners for reverse final score
   */
  static determineReverseFinalWinner(
    gridState: GridState,
    homeScore: number,
    awayScore: number
  ): Winner | null {
    if (!gridState.numbersGenerated) {
      return null;
    }

    const homeLastDigit = homeScore % 10;
    const awayLastDigit = awayScore % 10;
    
    // Reverse the digits
    const reversedHome = awayLastDigit;
    const reversedAway = homeLastDigit;

    // Find the corresponding box (reversed)
    const rowIndex = gridState.rowNumbers.indexOf(reversedAway);
    const colIndex = gridState.colNumbers.indexOf(reversedHome);

    if (rowIndex === -1 || colIndex === -1) {
      return null;
    }

    const boxIndex = rowIndex * 10 + colIndex;
    const box = gridState.boxes[boxIndex];

    if (!box.name.trim()) {
      return null;
    }

    const pool = gridState.sidePools?.find(p => p.id === 'reverse-final' && p.enabled);
    if (!pool || pool.percentage === 0) {
      return null;
    }

    const amount = Math.round((gridState.pricePerBox * 100 * pool.percentage) / 100);

    return {
      quarter: 'Reverse Final Score',
      homeLastDigit: reversedHome,
      awayLastDigit: reversedAway,
      boxIndex,
      participantName: box.name,
      amount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Determines side pool winners for reverse halftime score
   */
  static determineReverseHalftimeWinner(
    gridState: GridState,
    homeScore: number,
    awayScore: number
  ): Winner | null {
    if (!gridState.numbersGenerated) {
      return null;
    }

    const homeLastDigit = homeScore % 10;
    const awayLastDigit = awayScore % 10;
    
    // Reverse the digits
    const reversedHome = awayLastDigit;
    const reversedAway = homeLastDigit;

    // Find the corresponding box (reversed)
    const rowIndex = gridState.rowNumbers.indexOf(reversedAway);
    const colIndex = gridState.colNumbers.indexOf(reversedHome);

    if (rowIndex === -1 || colIndex === -1) {
      return null;
    }

    const boxIndex = rowIndex * 10 + colIndex;
    const box = gridState.boxes[boxIndex];

    if (!box.name.trim()) {
      return null;
    }

    const pool = gridState.sidePools?.find(p => p.id === 'reverse-halftime' && p.enabled);
    if (!pool || pool.percentage === 0) {
      return null;
    }

    const amount = Math.round((gridState.pricePerBox * 100 * pool.percentage) / 100);

    return {
      quarter: 'Reverse Halftime',
      homeLastDigit: reversedHome,
      awayLastDigit: reversedAway,
      boxIndex,
      participantName: box.name,
      amount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Determines side pool winners for winning team bonus
   * Returns array of winners (can be multiple)
   */
  static determineWinningTeamBonusWinners(
    gridState: GridState,
    homeScore: number,
    awayScore: number
  ): Winner[] {
    if (!gridState.numbersGenerated) {
      return [];
    }

    const pool = gridState.sidePools?.find(p => p.id === 'winning-team-bonus' && p.enabled);
    if (!pool || pool.percentage === 0) {
      return [];
    }

    const winningTeam = homeScore > awayScore ? 'home' : 'away';
    const winningScore = winningTeam === 'home' ? homeScore : awayScore;
    const winningLastDigit = winningScore % 10;

    const winners: Winner[] = [];
    const totalAmount = Math.round((gridState.pricePerBox * 100 * pool.percentage) / 100);

    // Find all boxes that match the winning team's last digit
    // Home team: match column (home digit)
    // Away team: match row (away digit)
    if (winningTeam === 'home') {
      // Home team won - find all boxes in the column matching homeLastDigit
      const colIndex = gridState.colNumbers.indexOf(winningLastDigit);
      if (colIndex !== -1) {
        for (let row = 0; row < 10; row++) {
          const boxIndex = row * 10 + colIndex;
          const box = gridState.boxes[boxIndex];
          if (box.name.trim()) {
            const rowDigit = gridState.rowNumbers[row];
            winners.push({
              quarter: 'Winning Team Bonus',
              homeLastDigit: winningLastDigit,
              awayLastDigit: rowDigit,
              boxIndex,
              participantName: box.name,
              amount: 0, // Will be recalculated
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } else {
      // Away team won - find all boxes in the row matching awayLastDigit
      const rowIndex = gridState.rowNumbers.indexOf(winningLastDigit);
      if (rowIndex !== -1) {
        for (let col = 0; col < 10; col++) {
          const boxIndex = rowIndex * 10 + col;
          const box = gridState.boxes[boxIndex];
          if (box.name.trim()) {
            const colDigit = gridState.colNumbers[col];
            winners.push({
              quarter: 'Winning Team Bonus',
              homeLastDigit: colDigit,
              awayLastDigit: winningLastDigit,
              boxIndex,
              participantName: box.name,
              amount: 0, // Will be recalculated
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    // Split the amount equally among all winners
    if (winners.length > 0) {
      const splitAmount = Math.round(totalAmount / winners.length);
      return winners.map(w => ({ ...w, amount: splitAmount }));
    }

    return [];
  }

  /**
   * Determines overtime jackpot winner
   */
  static determineOvertimeWinner(
    gridState: GridState,
    homeScore: number,
    awayScore: number
  ): Winner | null {
    if (!gridState.numbersGenerated || !gridState.wentToOvertime) {
      return null;
    }

    const pool = gridState.sidePools?.find(p => p.id === 'overtime-jackpot' && p.enabled);
    if (!pool || pool.percentage === 0) {
      return null;
    }

    // Use final score logic but with overtime pool percentage
    const homeLastDigit = homeScore % 10;
    const awayLastDigit = awayScore % 10;

    const rowIndex = gridState.rowNumbers.indexOf(awayLastDigit);
    const colIndex = gridState.colNumbers.indexOf(homeLastDigit);

    if (rowIndex === -1 || colIndex === -1) {
      return null;
    }

    const boxIndex = rowIndex * 10 + colIndex;
    const box = gridState.boxes[boxIndex];

    if (!box.name.trim()) {
      return null;
    }

    const amount = Math.round((gridState.pricePerBox * 100 * pool.percentage) / 100);

    return {
      quarter: 'Overtime Jackpot',
      homeLastDigit,
      awayLastDigit,
      boxIndex,
      participantName: box.name,
      amount,
      timestamp: new Date().toISOString()
    };
  }
}