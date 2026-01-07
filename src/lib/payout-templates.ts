import { PayoutTemplate } from '@/types';

export const defaultPayoutTemplates: PayoutTemplate[] = [
  {
    name: "Balanced",
    description: "Simple, balanced, and familiar. No explaining needed.",
    bestFor: "Everyone",
    specialLogic: 'standard',
    rules: [
      { quarter: "1st Quarter", percentage: 25 },
      { quarter: "Halftime", percentage: 25 },
      { quarter: "3rd Quarter", percentage: 25 },
      { quarter: "Final Score", percentage: 25 }
    ]
  },
  {
    name: "Big Finish",
    description: "Keeps early interest but rewards the final most.",
    bestFor: "Competitive pools",
    specialLogic: 'standard',
    rules: [
      { quarter: "1st Quarter", percentage: 15 },
      { quarter: "Halftime", percentage: 20 },
      { quarter: "3rd Quarter", percentage: 15 },
      { quarter: "Final Score", percentage: 50 }
    ]
  },
  {
    name: "Halftime + Final Only",
    description: "Fewer payouts = easier to manage.",
    bestFor: "Office pools",
    specialLogic: 'standard',
    rules: [
      { quarter: "Halftime", percentage: 40 },
      { quarter: "Final Score", percentage: 60 }
    ]
  },
  {
    name: "Progressive Build",
    description: "Payouts grow as the game goes on.",
    bestFor: "Mixed crowds",
    specialLogic: 'standard',
    rules: [
      { quarter: "1st Quarter", percentage: 10 },
      { quarter: "Halftime", percentage: 20 },
      { quarter: "3rd Quarter", percentage: 30 },
      { quarter: "Final Score", percentage: 40 }
    ]
  },
  {
    name: "Early Action",
    description: "Big excitement early in the game.",
    bestFor: "Watch parties",
    specialLogic: 'standard',
    rules: [
      { quarter: "1st Quarter", percentage: 30 },
      { quarter: "Halftime", percentage: 25 },
      { quarter: "3rd Quarter", percentage: 25 },
      { quarter: "Final Score", percentage: 20 }
    ]
  },
  {
    name: "Winner Take All",
    description: "Simple, intense, one winner.",
    bestFor: "High-risk pools",
    specialLogic: 'standard',
    rules: [
      { quarter: "Final Score", percentage: 100 }
    ]
  },
  {
    name: "Three Payout",
    description: "Skips Q3, still keeps balance.",
    bestFor: "Smaller pools",
    specialLogic: 'standard',
    rules: [
      { quarter: "1st Quarter", percentage: 25 },
      { quarter: "Halftime", percentage: 25 },
      { quarter: "Final Score", percentage: 50 }
    ]
  },
  {
    name: "No Repeat Winners",
    description: "Prevents one person from dominating.",
    bestFor: "Fairness-focused groups",
    specialLogic: 'no-repeat',
    rules: [
      { quarter: "1st Quarter", percentage: 25 },
      { quarter: "Halftime", percentage: 25 },
      { quarter: "3rd Quarter", percentage: 25 },
      { quarter: "Final Score", percentage: 25 }
    ]
  }
];

export const calculatePayouts = (pricePerBox: number, rules: any[]) => {
  const totalPot = pricePerBox * 100;
  return rules.map(rule => ({
    ...rule,
    amount: Math.round((totalPot * rule.percentage) / 100 * 100) / 100
  }));
};

export const calculatePayoutsWithNoRepeat = (
  pricePerBox: number, 
  rules: any[], 
  winners: { [quarter: string]: string } = {}
) => {
  const totalPot = pricePerBox * 100;
  const basePayouts = rules.map(rule => ({
    ...rule,
    amount: Math.round((totalPot * rule.percentage) / 100 * 100) / 100
  }));

  // For no-repeat logic, we need to handle rollover when same person wins multiple times
  // This would be implemented during actual game play, not in the calculator setup
  // For now, just show the base amounts with a note about the special rule
  return basePayouts.map(payout => ({
    ...payout,
    note: 'Amount may change if winner has already won a previous quarter'
  }));
};