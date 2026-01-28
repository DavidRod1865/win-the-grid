'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GridState, GameState, GameScore, Winner, ParticipantPayment, UserSubscription } from '@/types';
import { defaultPayoutTemplates, calculatePayouts, calculatePayoutsWithNoRepeat } from '@/lib/payout-templates';
import { StorageFactory, getFeatures, SupabaseProvider } from '@/lib/storage';
import { LocalStorageProvider } from '@/lib/storage';
import { exportToExcel } from '@/lib/excel-export';
import { generatePDF } from '@/lib/pdf-export';
import { GameDayManager } from '@/lib/game-day';
import { useAuth } from '@/contexts/AuthContext';

export default function GridPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect authenticated users to their grids page
  useEffect(() => {
    if (!loading && user) {
      router.push('/grids');
    }
  }, [user, loading, router]);
  const [gridState, setGridState] = useState<GridState>({
    boxes: Array.from({ length: 100 }, (_, i) => ({
      id: `box-${i}`,
      name: '',
      row: Math.floor(i / 10),
      col: i % 10
    })),
    rowNumbers: [],
    colNumbers: [],
    numbersGenerated: false,
    pricePerBox: 10,
    payoutRules: defaultPayoutTemplates[0].rules,
    selectedTemplate: defaultPayoutTemplates[0].name,
    winners: {},
    title: 'Super Bowl LX',
    gameState: 'draft',
    currentScores: [],
    gameWinners: [],
    homeTeamName: 'Home Team',
    awayTeamName: 'Away Team',
    sidePools: [
      {
        id: 'reverse-final',
        name: 'Reverse Final Score',
        enabled: false,
        percentage: 0,
        description: 'Use the last digit of each team\'s final score and reverse them. If 14-10 and 4-0 wins then 0-4 also wins.'
      },
      {
        id: 'overtime-jackpot',
        name: 'Overtime Jackpot',
        enabled: false,
        percentage: 0,
        description: 'Pays only if the game goes to overtime. If not overtime, then final score keeps overtime percentage.'
      },
      {
        id: 'winning-team-bonus',
        name: 'Winning Team Bonus',
        enabled: false,
        percentage: 0,
        description: 'Anyone who has a square matching the winning team\'s last digit qualifies. Two winners split percentage.'
      },
      {
        id: 'reverse-halftime',
        name: 'Reverse Halftime Score',
        enabled: false,
        percentage: 0,
        description: 'Reverse digits applied only at halftime. Adds variety without confusing the whole game.'
      }
    ],
    wentToOvertime: false,
    sidePoolsEnabled: false
  });

  const [editingBox, setEditingBox] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClearNamesConfirm, setShowClearNamesConfirm] = useState(false);
  const [showClearNumbersConfirm, setShowClearNumbersConfirm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showGuestUpgradeBanner, setShowGuestUpgradeBanner] = useState(false);
  const [showSidePoolsModal, setShowSidePoolsModal] = useState(false);
  const [showAddCustomPool, setShowAddCustomPool] = useState(false);
  const [customPoolName, setCustomPoolName] = useState('');
  const [customPoolDescription, setCustomPoolDescription] = useState('');
  const [customPoolPercentage, setCustomPoolPercentage] = useState(0);
  
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [tempPaidStatus, setTempPaidStatus] = useState(false);
  const [tempPaidDate, setTempPaidDate] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'not-paid'>('all');
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Custom payout percentages
  const [customPercentages, setCustomPercentages] = useState({
    '1st Quarter': 25,
    'Halftime': 25,
    '3rd Quarter': 25,
    'Final Score': 25
  });
  
  // Game Day Mode state
  const [showGameDayModal, setShowGameDayModal] = useState(false);
  const [currentHomeScore, setCurrentHomeScore] = useState('');
  const [currentAwayScore, setCurrentAwayScore] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  
  // User subscription state (TODO: Get from auth provider)
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  
  // Multiple grids support
  const [userGrids, setUserGrids] = useState<GridState[]>([]);
  const [showGridsDropdown, setShowGridsDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Grid page is for anonymous users only - always use localStorage

  // Get available features based on subscription and grid
  const [features, setFeatures] = useState<import('@/lib/storage').FeatureFlags>({
    canCreateGrid: true,
    canEditGrid: true,
    canExportPDF: true,
    canExportExcel: true,
    canSaveToCloud: false,
    canShare: false,
    hasRealTimeUpdates: false,
    hasGameDayMode: false,
    canSendNotifications: false,
    hasAnalytics: false,
    canCustomizeBranding: false,
    maxGridsPerMonth: Infinity,
    showUpgradePrompts: false,
    currentPlan: 'free',
  });

  // Helper function to handle premium feature access
  const handlePremiumFeature = (action: () => void, featureName: string) => {
    try {
      action();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('requires')) {
        promptGuestUpgrade();
      } else {
        console.error(`Failed to use ${featureName}:`, error);
      }
    }
  };

  const promptGuestUpgrade = () => {
    setShowGuestUpgradeBanner(true);
    setShowUpgradeModal(true);
  };

  useEffect(() => {
    // TODO: Load user subscription from auth provider
    // For now, simulate free tier (no account)
    setUserSubscription({
      tier: 'free',
      paymentStatus: 'free'
    });
    
    // Helper function to load a grid state
    const loadGridState = (savedState: GridState) => {
      setGridState(prev => ({ 
        ...prev, 
        ...savedState,
        title: savedState.title || 'Super Bowl LX',
        selectedTemplate: savedState.selectedTemplate || defaultPayoutTemplates[0].name,
        payoutRules: savedState.payoutRules || defaultPayoutTemplates[0].rules
      }));
      
      // Initialize custom percentages if Custom template is selected
      if (savedState.selectedTemplate === 'Custom' && savedState.payoutRules) {
        const customPercs: { [key: string]: number } = {};
        savedState.payoutRules.forEach((rule: { quarter: string; percentage: number }) => {
          customPercs[rule.quarter] = rule.percentage;
        });
        setCustomPercentages({
          '1st Quarter': customPercs['1st Quarter'] || 25,
          'Halftime': customPercs['Halftime'] || 25,
          '3rd Quarter': customPercs['3rd Quarter'] || 25,
          'Final Score': customPercs['Final Score'] || 25
        });
      }
    };

    // Load grid state using storage provider
    const loadInitialState = async () => {
      try {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const gridIdFromUrl = urlParams.get('gridId');
        
        // If no gridId in URL, this is "Create New Grid" - keep empty state
        if (!gridIdFromUrl) {
          console.log('No gridId in URL - creating new grid');
          return;
        }
        
        // Grid page is for anonymous users only - use localStorage
        const provider = StorageFactory.getInstance();
        
        // Try to load the specific grid by ID
        const savedState = await provider.loadGrid(gridIdFromUrl);
        
        if (savedState) {
          console.log('Loaded grid:', savedState.id, savedState.title);
          loadGridState(savedState);
        } else {
          console.warn('Grid not found:', gridIdFromUrl);
          // Grid not found, but keep the empty state for new grid creation
        }
        
        // Load user grids list for dropdown (if provider supports it)
        if (provider.loadUserGrids) {
          try {
            const allGrids = await provider.loadUserGrids();
            setUserGrids(allGrids);
          } catch (error) {
            console.error('Failed to load user grids list:', error);
          }
        }
        
      } catch (error) {
        console.error('Failed to load grid state:', error);
        // Keep empty state on error for new grid creation
      }
    };

    // Load grid state for anonymous users
    loadInitialState();
  }, []);

  // Load features based on subscription and grid
  useEffect(() => {
    const loadFeatures = async () => {
      const result = getFeatures(userSubscription || undefined, gridState.id);
      // Handle both sync and async returns
      if (result instanceof Promise) {
        const resolvedFeatures = await result;
        setFeatures(resolvedFeatures);
      } else {
        setFeatures(result);
      }
    };
    loadFeatures();
  }, [userSubscription, gridState.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showGridsDropdown && !target.closest('.grids-dropdown-container')) {
        setShowGridsDropdown(false);
      }
    };

    if (showGridsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showGridsDropdown]);

  // Function to switch between grids
  const handleSwitchGrid = async (gridId: string) => {
    try {
      const provider = StorageFactory.getInstance();
      // Save current grid before switching
      await provider.saveGrid(gridState);
      
      const grid = await provider.loadGrid(gridId);
      if (grid) {
        // Load the new grid
        setGridState(prev => ({ 
          ...prev, 
          ...grid,
          title: grid.title || 'Super Bowl LX',
          selectedTemplate: grid.selectedTemplate || defaultPayoutTemplates[0].name,
          payoutRules: grid.payoutRules || defaultPayoutTemplates[0].rules
        }));
        
        // Initialize custom percentages if Custom template is selected
        if (grid.selectedTemplate === 'Custom' && grid.payoutRules) {
          const customPercs: { [key: string]: number } = {};
          grid.payoutRules.forEach((rule: { quarter: string; percentage: number }) => {
            customPercs[rule.quarter] = rule.percentage;
          });
          setCustomPercentages({
            '1st Quarter': customPercs['1st Quarter'] || 25,
            'Halftime': customPercs['Halftime'] || 25,
            '3rd Quarter': customPercs['3rd Quarter'] || 25,
            'Final Score': customPercs['Final Score'] || 25
          });
        }
        
        // Update URL without reload
        const url = new URL(window.location.href);
        url.searchParams.set('gridId', gridId);
        window.history.pushState({}, '', url.toString());
        
        setShowGridsDropdown(false);
      }
    } catch (error) {
      console.error('Failed to switch grid:', error);
    }
  };

  const filledBoxesCount = gridState.boxes.filter(box => box.name.trim() !== '').length;
  const canGenerateNumbers = filledBoxesCount === 100;
  const selectedTemplate = defaultPayoutTemplates.find(t => t.name === gridState.selectedTemplate);
  const isNoRepeatTemplate = selectedTemplate?.specialLogic === 'no-repeat';
  const calculatedPayouts = isNoRepeatTemplate 
    ? calculatePayoutsWithNoRepeat(gridState.pricePerBox, gridState.payoutRules, gridState.winners)
    : calculatePayouts(gridState.pricePerBox, gridState.payoutRules);
  const totalPot = gridState.pricePerBox * 100;
  
  // Calculate side pool totals
  const enabledSidePools = (gridState.sidePools || []).filter(p => p.enabled && p.percentage > 0);
  const totalSidePoolPercentage = enabledSidePools.reduce((sum, pool) => sum + pool.percentage, 0);
  const totalSidePoolAmount = (totalPot * totalSidePoolPercentage) / 100;
  const remainingPotForMainPayouts = totalPot - totalSidePoolAmount;
  
  // Recalculate payouts based on remaining pot after side pools
  // Also calculate adjusted percentages (as percentage of total pot)
  const calculatedPayoutsWithSidePools = calculatedPayouts.map(payout => {
    const rule = gridState.payoutRules.find(r => r.quarter === payout.quarter);
    if (rule) {
      const percentage = rule.percentage;
      const amount = (remainingPotForMainPayouts * percentage) / 100;
      // Calculate adjusted percentage as percentage of total pot
      const adjustedPercentage = totalPot > 0 ? (amount / totalPot) * 100 : percentage;
      return { ...payout, amount, adjustedPercentage };
    }
    return payout;
  });

  const handleBoxClick = (boxId: string) => {
    const box = gridState.boxes.find(b => b.id === boxId);
    if (box) {
      setEditingBox(boxId);
      setTempName(box.name);
    }
  };

  const handleNameSubmit = async () => {
    if (editingBox) {
      const oldBox = gridState.boxes.find(b => b.id === editingBox);
      const oldName = oldBox?.name.trim();
      const newName = tempName.trim();
      
      const newBoxes = gridState.boxes.map(box => 
        box.id === editingBox ? { ...box, name: newName } : box
      );
      const newState = { ...gridState, boxes: newBoxes };
      
      // Update participant payments when name changes
      const existingPayments = gridState.participantPayments || [];
      let updatedPayments = [...existingPayments];
      
      // Remove old name from payments if they no longer have any boxes
      if (oldName && oldName !== newName) {
        const hasOtherBoxes = newBoxes.some(box => box.name.trim() === oldName && box.id !== editingBox);
        if (!hasOtherBoxes) {
          updatedPayments = updatedPayments.filter(p => p.name !== oldName);
        }
      }
      
      // Add new name to payments if it doesn't exist
      if (newName) {
        const paymentExists = updatedPayments.some(p => p.name === newName);
        if (!paymentExists) {
          updatedPayments = [
            ...updatedPayments,
            { name: newName, paid: false }
          ];
        }
      }
      
      newState.participantPayments = updatedPayments;
      setGridState(newState);
      
      try {
        await StorageFactory.getInstance().saveGrid(newState);
      } catch (error) {
        console.error('Failed to save grid state:', error);
      }
      
      setEditingBox(null);
      setTempName('');
    }
  };

  // Get participants with their boxes and totals
  const getParticipants = () => {
    const participantMap: { [name: string]: { boxes: number[], total: number } } = {};
    
    gridState.boxes.forEach((box, index) => {
      if (box.name.trim()) {
        const name = box.name.trim();
        if (!participantMap[name]) {
          participantMap[name] = { boxes: [], total: 0 };
        }
        participantMap[name].boxes.push(index + 1);
        participantMap[name].total += gridState.pricePerBox;
      }
    });

    const participants = Object.keys(participantMap).map(name => ({
      name,
      boxes: participantMap[name].boxes.sort((a, b) => a - b),
      total: participantMap[name].total,
      payment: gridState.participantPayments?.find(p => p.name === name) || { name, paid: false }
    }));

    return participants.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Calculate total money collected
  const totalMoneyCollected = getParticipants()
    .filter(p => p.payment.paid)
    .reduce((sum, p) => sum + p.total, 0);
  const moneyCollectedPercentage = totalPot > 0 ? (totalMoneyCollected / totalPot) * 100 : 0;

  const handleParticipantPaymentUpdate = async (participantName: string, paid: boolean, paidDate?: string) => {
    const existingPayments = gridState.participantPayments || [];
    const paymentIndex = existingPayments.findIndex(p => p.name === participantName);
    
    let updatedPayments: ParticipantPayment[];
    if (paymentIndex >= 0) {
      updatedPayments = existingPayments.map((p, idx) => 
        idx === paymentIndex 
          ? { ...p, paid, paidDate: paid ? (paidDate || new Date().toISOString().split('T')[0]) : undefined }
          : p
      );
    } else {
      updatedPayments = [
        ...existingPayments,
        { name: participantName, paid, paidDate: paid ? (paidDate || new Date().toISOString().split('T')[0]) : undefined }
      ];
    }

    const newState = { ...gridState, participantPayments: updatedPayments };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
    
    setEditingParticipant(null);
    setTempPaidStatus(false);
    setTempPaidDate('');
  };

  const handleStartEditParticipant = (participant: { name: string; payment: ParticipantPayment }) => {
    setEditingParticipant(participant.name);
    setTempPaidStatus(participant.payment.paid);
    setTempPaidDate(participant.payment.paidDate || '');
  };

  const handleGenerateNumbers = async () => {
    const newState = {
      ...gridState,
      rowNumbers: LocalStorageProvider.generateRandomNumbers(),
      colNumbers: LocalStorageProvider.generateRandomNumbers(),
      numbersGenerated: true
    };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
  };


  const handleTemplateChange = async (templateName: string) => {
    if (templateName === 'Custom') {
      // For Custom, use the custom percentages
      const customRules = [
        { quarter: '1st Quarter', percentage: customPercentages['1st Quarter'] },
        { quarter: 'Halftime', percentage: customPercentages['Halftime'] },
        { quarter: '3rd Quarter', percentage: customPercentages['3rd Quarter'] },
        { quarter: 'Final Score', percentage: customPercentages['Final Score'] }
      ];
      const newState = {
        ...gridState,
        selectedTemplate: templateName,
        payoutRules: customRules
      };
      setGridState(newState);
      
      try {
        await StorageFactory.getInstance().saveGrid(newState);
      } catch (error) {
        console.error('Failed to save grid state:', error);
      }
    } else {
    const template = defaultPayoutTemplates.find(t => t.name === templateName);
    if (template) {
      const newState = {
        ...gridState,
        selectedTemplate: templateName,
        payoutRules: template.rules
        };
        setGridState(newState);
        
        try {
          await StorageFactory.getInstance().saveGrid(newState);
        } catch (error) {
          console.error('Failed to save grid state:', error);
        }
      }
    }
  };

  const handleCustomPercentageChange = async (quarter: string, value: number) => {
    const newPercentages = {
      ...customPercentages,
      [quarter]: Math.max(0, Math.min(100, value))
    };
    setCustomPercentages(newPercentages);
    
    // Update grid state if Custom is selected
    if (gridState.selectedTemplate === 'Custom') {
      const customRules = [
        { quarter: '1st Quarter', percentage: newPercentages['1st Quarter'] },
        { quarter: 'Halftime', percentage: newPercentages['Halftime'] },
        { quarter: '3rd Quarter', percentage: newPercentages['3rd Quarter'] },
        { quarter: 'Final Score', percentage: newPercentages['Final Score'] }
      ];
      const newState = {
        ...gridState,
        payoutRules: customRules
      };
      setGridState(newState);
      
      try {
        await StorageFactory.getInstance().saveGrid(newState);
      } catch (error) {
        console.error('Failed to save grid state:', error);
      }
    }
  };

  const handlePriceChange = async (price: number) => {
    const newState = { ...gridState, pricePerBox: price > 0 ? price : 1 };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
  };

  const handleSidePoolToggle = async (poolId: string, enabled: boolean) => {
    const updatedSidePools = gridState.sidePools?.map(pool =>
      pool.id === poolId ? { ...pool, enabled } : pool
    ) || [];
    const newState = { ...gridState, sidePools: updatedSidePools };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
  };

  const handleSidePoolPercentageChange = async (poolId: string, percentage: number) => {
    const updatedSidePools = gridState.sidePools?.map(pool =>
      pool.id === poolId ? { ...pool, percentage: Math.max(0, Math.min(100, percentage)) } : pool
    ) || [];
    const newState = { ...gridState, sidePools: updatedSidePools };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
  };

  const handleAddCustomPool = async () => {
    if (!customPoolName.trim() || !customPoolDescription.trim()) {
      return;
    }

    const newPool = {
      id: `custom-${Date.now()}`,
      name: customPoolName.trim(),
      description: customPoolDescription.trim(),
      enabled: true,
      percentage: customPoolPercentage
    };

    const updatedSidePools = [...(gridState.sidePools || []), newPool];
    const newState = { ...gridState, sidePools: updatedSidePools };
    setGridState(newState);

    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }

    // Reset form
    setCustomPoolName('');
    setCustomPoolDescription('');
    setCustomPoolPercentage(0);
    setShowAddCustomPool(false);
  };

  const handleDeleteCustomPool = async (poolId: string) => {
    // Only allow deletion of custom pools (those starting with 'custom-')
    if (!poolId.startsWith('custom-')) {
      return;
    }

    const updatedSidePools = (gridState.sidePools || []).filter(pool => pool.id !== poolId);
    const newState = { ...gridState, sidePools: updatedSidePools };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
  };

  const clearAllNames = async () => {
    const newState = {
      ...gridState,
      boxes: gridState.boxes.map(box => ({ ...box, name: '' }))
    };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
    
    setShowClearNamesConfirm(false);
  };

  const clearNumbers = async () => {
    const newState = {
      ...gridState,
      rowNumbers: [],
      colNumbers: [],
      numbersGenerated: false
    };
    setGridState(newState);
    
    try {
      await StorageFactory.getInstance().saveGrid(newState);
    } catch (error) {
      console.error('Failed to save grid state:', error);
    }
    
    setShowClearNumbersConfirm(false);
  };

  // Game Day Mode handlers
  const handleGameStateChange = async (newState: GameState) => {
    const updatedState = { ...gridState, gameState: newState };
    setGridState(updatedState);
    
    try {
      await StorageFactory.getInstance().saveGrid(updatedState);
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  };

  const handleScoreSubmit = async () => {
    const homeScore = parseInt(currentHomeScore);
    const awayScore = parseInt(currentAwayScore);

    if (isNaN(homeScore) || isNaN(awayScore) || !selectedQuarter) {
      alert('Please enter valid scores and select a quarter');
      return;
    }

    if (!GameDayManager.validateScore(homeScore, selectedQuarter) || 
        !GameDayManager.validateScore(awayScore, selectedQuarter)) {
      alert('Please enter reasonable scores (0-100)');
      return;
    }

    // Check if this quarter has already been scored
    const existingScore = gridState.currentScores?.find(s => s.quarter === selectedQuarter);
    if (existingScore) {
      const confirmed = confirm(`${selectedQuarter} has already been scored. Do you want to update it?`);
      if (!confirmed) return;
    }

    try {
      // Determine winner
      const winner = GameDayManager.determineWinner(gridState, homeScore, awayScore, selectedQuarter);
      
      // Create score record
      const newScore: GameScore = {
        homeTeam: homeScore,
        awayTeam: awayScore,
        quarter: selectedQuarter,
        timestamp: new Date().toISOString()
      };

      // Update scores (remove existing score for this quarter if any)
      const updatedScores = [
        ...(gridState.currentScores?.filter(s => s.quarter !== selectedQuarter) || []),
        newScore
      ];

      // Handle winners with no-repeat logic if applicable
      let updatedWinners = gridState.gameWinners || [];
      if (winner) {
        // Remove existing winner for this quarter if any
        updatedWinners = updatedWinners.filter(w => w.quarter !== selectedQuarter);
        
        // Add new winner with potential no-repeat handling
        const template = defaultPayoutTemplates.find(t => t.name === gridState.selectedTemplate);
        if (template?.specialLogic === 'no-repeat') {
          updatedWinners = GameDayManager.handleNoRepeatWinners(gridState, winner, updatedWinners);
        } else {
          updatedWinners = [...updatedWinners, winner];
        }
      }

      // Check for side pool winners
      let sidePoolWinners: Winner[] = [];
      
      // Reverse Halftime Score
      if (selectedQuarter === 'Halftime') {
        const reverseHalftimeWinner = GameDayManager.determineReverseHalftimeWinner(gridState, homeScore, awayScore);
        if (reverseHalftimeWinner) {
          updatedWinners = updatedWinners.filter(w => w.quarter !== 'Reverse Halftime');
          updatedWinners.push(reverseHalftimeWinner);
          sidePoolWinners.push(reverseHalftimeWinner);
        }
      }

      // Reverse Final Score
      if (selectedQuarter === 'Final Score') {
        const reverseFinalWinner = GameDayManager.determineReverseFinalWinner(gridState, homeScore, awayScore);
        if (reverseFinalWinner) {
          updatedWinners = updatedWinners.filter(w => w.quarter !== 'Reverse Final Score');
          updatedWinners.push(reverseFinalWinner);
          sidePoolWinners.push(reverseFinalWinner);
        }

        // Winning Team Bonus
        const winningTeamBonusWinners = GameDayManager.determineWinningTeamBonusWinners(gridState, homeScore, awayScore);
        if (winningTeamBonusWinners.length > 0) {
          updatedWinners = updatedWinners.filter(w => w.quarter !== 'Winning Team Bonus');
          updatedWinners.push(...winningTeamBonusWinners);
          sidePoolWinners.push(...winningTeamBonusWinners);
        }

        // Overtime Jackpot (if game went to overtime)
        if (gridState.wentToOvertime) {
          const overtimeWinner = GameDayManager.determineOvertimeWinner(gridState, homeScore, awayScore);
          if (overtimeWinner) {
            updatedWinners = updatedWinners.filter(w => w.quarter !== 'Overtime Jackpot');
            updatedWinners.push({ ...overtimeWinner, quarter: 'Overtime Jackpot' });
            sidePoolWinners.push({ ...overtimeWinner, quarter: 'Overtime Jackpot' });
          }
        }
      }

      // Update grid state
      const newState = {
        ...gridState,
        currentScores: updatedScores,
        gameWinners: updatedWinners,
        gameState: 'live' as GameState
      };

      setGridState(newState);
      await StorageFactory.getInstance().saveGrid(newState);

      // Show winner announcement
      let winnerMessage = '';
      if (winner) {
        winnerMessage = `🎉 Winner for ${selectedQuarter}!\n\n` +
          `Score: ${gridState.homeTeamName} ${homeScore} - ${gridState.awayTeamName} ${awayScore}\n` +
          `Winning Numbers: ${winner.homeLastDigit} - ${winner.awayLastDigit}\n` +
          `Winner: ${winner.participantName}\n` +
          `Payout: $${winner.amount}`;
      } else {
        winnerMessage = `Score recorded for ${selectedQuarter}\n\n` +
          `Score: ${gridState.homeTeamName} ${homeScore} - ${gridState.awayTeamName} ${awayScore}\n` +
          `Winning Numbers: ${homeScore % 10} - ${awayScore % 10}\n` +
          `No participant in this box`;
      }

      // Add side pool winners to message
      if (sidePoolWinners.length > 0) {
        winnerMessage += '\n\n🎯 Side Pool Winners:\n';
        const uniquePools = new Set(sidePoolWinners.map(w => w.quarter));
        uniquePools.forEach(poolQuarter => {
          const poolWinners = sidePoolWinners.filter(w => w.quarter === poolQuarter);
          if (poolQuarter === 'Winning Team Bonus' && poolWinners.length > 1) {
            const totalAmount = poolWinners.reduce((sum, w) => sum + w.amount, 0);
            winnerMessage += `${poolQuarter}: ${poolWinners.map(w => w.participantName).join(', ')} (${poolWinners.length} winners split $${totalAmount})\n`;
          } else {
            poolWinners.forEach(w => {
              winnerMessage += `${w.quarter}: ${w.participantName} - $${w.amount}\n`;
            });
          }
        });
      }

      alert(winnerMessage);

      // Reset form
      setCurrentHomeScore('');
      setCurrentAwayScore('');
      setSelectedQuarter('');
      setShowGameDayModal(false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      alert(`Error: ${errorMessage}`);
    }
  };

  const getGameStateColor = () => {
    switch (gridState.gameState) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentGameState = (): GameState => {
    return GameDayManager.getGameState(gridState) as GameState;
  };

  const getWinningBoxes = (): number[] => {
    return gridState.gameWinners?.map(winner => winner.boxIndex) || [];
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1566577739112-5180d4bf9390?q=80&w=3333&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/75 via-blue-800/65 to-green-900/75"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex justify-between items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center gap-2"
              >
                Back to Home
              </Link>
              {userGrids.length > 1 && (
                <div className="relative grids-dropdown-container">
                  <button
                    onClick={() => setShowGridsDropdown(!showGridsDropdown)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-sm text-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {gridState.title || 'Super Bowl LX'}
                    <svg className={`w-4 h-4 transition-transform ${showGridsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showGridsDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 mb-1">
                          Your Grids ({userGrids.length})
                        </div>
                        {userGrids.map((grid) => (
                          <button
                            key={grid.id}
                            onClick={() => handleSwitchGrid(grid.id || '')}
                            className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                              grid.id === gridState.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            <div className="font-medium">{grid.title || 'Untitled Grid'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {grid.boxes.filter(b => b.name.trim()).length} participants
                              {grid.numbersGenerated && ' • Numbers generated'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {userGrids.length <= 1 && (
                <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Create &amp; Manage Grid (Guest)
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-800">
                      Guest Mode
                    </span>
                    <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                      Sign in to save and share
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 md:hidden min-w-0">
              <span className="text-lg font-semibold text-gray-900 truncate">
                Create &amp; Manage Grid (Guest)
              </span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/?join=1"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 hover:underline"
              >
                Enter Share Code
              </Link>
              <Link
                href="/how-to-play"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 hover:underline"
              >
                How to Play
              </Link>
              <a
                href="https://buymeacoffee.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium text-sm transition-all duration-200 hover:shadow-lg"
              >
                <span className="text-base">☕</span>
                Coffee
              </a>
              <button 
                onClick={() => {
                  if (features.canShare) {
                    // TODO: Implement sharing functionality
                    console.log('Share grid clicked');
                  } else {
                    promptGuestUpgrade();
                  }
                }}
                className={`py-2 px-4 rounded-md font-medium transition-all duration-200 hover:shadow-lg text-sm ${
                  features.canShare 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-gray-400 hover:bg-gray-500 text-white'
                }`}
                aria-label={features.canShare ? "Share grid with others" : "Sign up to share grid"}
              >
                {features.canShare ? 'Share Grid' : 'Share (Premium)'}
              </button>
              <button 
                onClick={() => {
                  if (features.canExportExcel) {
                    exportToExcel(gridState);
                  } else {
                    promptGuestUpgrade();
                  }
                }}
                className={`py-2 px-4 rounded-md font-medium transition-all duration-200 hover:shadow-lg text-sm ${
                  features.canExportExcel 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-400 hover:bg-gray-500 text-white'
                }`}
                aria-label={features.canExportExcel ? "Export grid to Excel file" : "Sign up to export to Excel"}
              >
                {features.canExportExcel ? 'Export to Excel' : 'Excel (Premium)'}
              </button>
              <button 
                onClick={() => generatePDF(gridState)}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-all duration-200 hover:shadow-lg text-sm"
                aria-label="Generate and print PDF"
              >
                Print PDF
              </button>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200 hover:shadow-lg"
                aria-label="Open settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setShowMobileMenu((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
          {showMobileMenu && (
            <div className="md:hidden mt-4 pt-4 border-t border-white/30">
              <div className="flex flex-col gap-3">
                <Link
                  href="/"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  Back to Home
                </Link>
                {userGrids.length > 1 && (
                  <div className="relative grids-dropdown-container">
                    <button
                      onClick={() => setShowGridsDropdown(!showGridsDropdown)}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-sm text-gray-700 transition-colors w-full"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        {gridState.title || 'Super Bowl LX'}
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${showGridsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showGridsDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 mb-1">
                            Your Grids ({userGrids.length})
                          </div>
                          {userGrids.map((grid) => (
                            <button
                              key={grid.id}
                              onClick={() => {
                                setShowMobileMenu(false);
                                handleSwitchGrid(grid.id || '');
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                                grid.id === gridState.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                              }`}
                            >
                              <div className="font-medium">{grid.title || 'Untitled Grid'}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {grid.boxes.filter(b => b.name.trim()).length} participants
                                {grid.numbersGenerated && ' • Numbers generated'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {userGrids.length <= 1 && (
                  <div className="text-sm font-semibold text-gray-700">
                    {gridState.title || 'Super Bowl LX'} Squares Calculator
                  </div>
                )}
                <Link
                  href="/?join=1"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  Enter Share Code
                </Link>
                <Link
                  href="/how-to-play"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  How to Play
                </Link>
                <a
                  href="https://buymeacoffee.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium text-sm transition-all duration-200 hover:shadow-lg"
                >
                  <span className="text-base">☕</span>
                  Coffee
                </a>
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    if (features.canShare) {
                      // TODO: Implement sharing functionality
                      console.log('Share grid clicked');
                    } else {
                      promptGuestUpgrade();
                    }
                  }}
                  className={`py-2 px-4 rounded-md font-medium transition-all duration-200 hover:shadow-lg text-sm ${
                    features.canShare 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-gray-400 hover:bg-gray-500 text-white'
                  }`}
                  aria-label={features.canShare ? "Share grid with others" : "Sign up to share grid"}
                >
                  {features.canShare ? 'Share Grid' : 'Share (Premium)'}
                </button>
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    if (features.canExportExcel) {
                      exportToExcel(gridState);
                    } else {
                      promptGuestUpgrade();
                    }
                  }}
                  className={`py-2 px-4 rounded-md font-medium transition-all duration-200 hover:shadow-lg text-sm ${
                    features.canExportExcel 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-400 hover:bg-gray-500 text-white'
                  }`}
                  aria-label={features.canExportExcel ? "Export grid to Excel file" : "Sign up to export to Excel"}
                >
                  {features.canExportExcel ? 'Export to Excel' : 'Excel (Premium)'}
                </button>
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    generatePDF(gridState);
                  }}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-all duration-200 hover:shadow-lg text-sm"
                  aria-label="Generate and print PDF"
                >
                  Print PDF
                </button>
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowSettingsModal(true);
                  }}
                  className="p-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200 hover:shadow-lg inline-flex items-center justify-center"
                  aria-label="Open settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="w-full px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                Guest Mode
              </span>
              <span>Save &amp; share requires a free account.</span>
            </div>
            <Link href="/auth/signup" className="text-yellow-900 font-semibold hover:underline">
              Sign up free
            </Link>
          </div>
          {showGuestUpgradeBanner && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>Create a free account to save and share this grid.</span>
              <div className="flex items-center gap-3">
                <Link href="/auth/signup" className="font-semibold hover:underline">
                  Sign up free
                </Link>
                <button
                  onClick={() => setShowGuestUpgradeBanner(false)}
                  className="text-blue-700 hover:text-blue-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-8 max-w-7xl mx-auto mt-4">
          {/* Top Row: Game Settings, Grid Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Game Settings */}
            <div className="lg:col-span-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-6 border border-white/20">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Price per Box ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={gridState.pricePerBox || ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        handlePriceChange(0);
                      } else {
                        const numValue = Number(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          handlePriceChange(numValue || 1);
                        }
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all duration-200"
                    aria-label="Price per box in dollars"
                  />
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    <span className="font-medium">${(gridState.pricePerBox || 0).toLocaleString()}</span> × <span className="font-medium">100 boxes</span> = <span className="font-semibold text-black">${totalPot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> total pot
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Payout Template
                  </label>
                  <div className="relative">
                  <select
                    value={gridState.selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all duration-200 bg-white appearance-none"
                    aria-label="Select payout template"
                  >
                      {[...defaultPayoutTemplates].sort((a, b) => a.name.localeCompare(b.name)).map(template => (
                      <option key={template.name} value={template.name}>
                          {template.name}
                      </option>
                    ))}
                      <option value="Custom">Custom</option>
                  </select>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Template Description or Custom Inputs */}
                  {gridState.selectedTemplate === 'Custom' ? (
                      <div className="mt-2 space-y-3">
                      {/* Custom Percentage Inputs */}
                      <div className="p-3 bg-gray-50/90 backdrop-blur-sm border border-gray-200 rounded">
                        <h4 className="text-sm font-semibold text-black mb-3">Custom Payout Structure:</h4>
                        <div className="space-y-3">
                          {['1st Quarter', 'Halftime', '3rd Quarter', 'Final Score'].map((quarter) => {
                            const total = Object.values(customPercentages).reduce((sum, val) => sum + val, 0);
                            const isValid = total === 100;
                            const percentage = customPercentages[quarter as keyof typeof customPercentages];
                            const amount = (remainingPotForMainPayouts * percentage) / 100;
                            // Calculate adjusted percentage as percentage of total pot
                            const adjustedPercentage = totalPot > 0 ? (amount / totalPot) * 100 : percentage;
                            const displayPercentage = enabledSidePools.length > 0 
                              ? adjustedPercentage.toFixed(2)
                              : percentage.toFixed(2);
                            return (
                              <div key={quarter} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <label className="text-sm text-black font-medium">{quarter}:</label>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={percentage}
                                        onChange={(e) => handleCustomPercentageChange(quarter, Number(e.target.value) || 0)}
                                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm text-right"
                                        aria-label={`${quarter} percentage`}
                                      />
                                      <span className="text-sm text-black">%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {enabledSidePools.length > 0 && (
                                        <span className="text-xs text-gray-500">({displayPercentage}% of total)</span>
                                      )}
                                      <span className="text-sm font-medium text-black">${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-black">Main Payouts Total:</span>
                              <span className="text-sm font-semibold text-black">${remainingPotForMainPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          {/* Side Pools Section for Custom */}
                          {enabledSidePools.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              {enabledSidePools.map((pool) => (
                                <div key={pool.id} className="flex justify-between items-center text-sm">
                                  <span className="text-black">{pool.name}:</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-600">{pool.percentage.toFixed(2)}%</span>
                                    <span className="font-medium text-black">${((totalPot * pool.percentage) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              ))}
                              <div className="mt-2">
                                <div className="flex justify-between items-center text-sm font-semibold">
                                  <span className="text-black">Side Pools Total:</span>
                                  <span className="text-black">${totalSidePoolAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-gray-300">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-black">Total:</span>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${Object.values(customPercentages).reduce((sum, val) => sum + val, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {Object.values(customPercentages).reduce((sum, val) => sum + val, 0)}%
                                </span>
                                <span className="text-sm font-semibold text-black">${remainingPotForMainPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            {Object.values(customPercentages).reduce((sum, val) => sum + val, 0) !== 100 && (
                              <p className="text-xs text-red-600 mt-1">Percentages must total 100%</p>
                            )}
                            <div className="flex justify-between items-center text-xs text-gray-600 mt-2">
                              <span>Total Pot:</span>
                              <span>${totalPot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Visual Progress Bar for Custom */}
                      <div className="p-3 bg-gray-50/90 backdrop-blur-sm border border-gray-200 rounded">
                        <h4 className="text-sm font-semibold text-black mb-2">Visual Breakdown:</h4>
                        <div className="mt-3">
                          <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                            {['1st Quarter', 'Halftime', '3rd Quarter', 'Final Score'].map((quarter, index) => {
                              const colors = ['bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400'];
                              const percentage = customPercentages[quarter as keyof typeof customPercentages];
                              // Calculate adjusted percentage as percentage of total pot (accounting for side pools)
                              const adjustedPercentage = enabledSidePools.length > 0 
                                ? (remainingPotForMainPayouts * percentage / 100) / totalPot * 100
                                : percentage;
                              return (
                                <div
                                  key={quarter}
                                  className={`${colors[index % colors.length]} flex items-center justify-center text-[10px] text-white font-bold`}
                                  style={{ width: `${adjustedPercentage}%` }}
                                  title={`${quarter}: ${percentage}%${enabledSidePools.length > 0 ? ` (${adjustedPercentage.toFixed(2)}% of total)` : ''}`}
                                >
                                  {adjustedPercentage >= 15 ? `${adjustedPercentage.toFixed(2)}%` : ''}
                                </div>
                              );
                            })}
                            {enabledSidePools.length > 0 && totalSidePoolPercentage > 0 && (
                              <div
                                className="bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold"
                                style={{ width: `${totalSidePoolPercentage}%` }}
                                title={`Side Pools: ${totalSidePoolPercentage.toFixed(2)}%`}
                              >
                                {totalSidePoolPercentage >= 15 ? `${totalSidePoolPercentage.toFixed(2)}%` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (() => {
                    const selectedTemplate = defaultPayoutTemplates.find(t => t.name === gridState.selectedTemplate) || defaultPayoutTemplates[0];
                    return selectedTemplate ? (
                      <div className="mt-2 space-y-3">
                        
                        {/* Payout Structure & Breakdown */}
                        <div className="p-3 bg-gray-50/90 backdrop-blur-sm border border-gray-200 rounded">
                          <h4 className="text-sm font-semibold text-black mb-2">Payout Structure:</h4>
                          <div className="space-y-1 mb-3">
                            {selectedTemplate.rules.map((rule, index) => {
                              const payout = calculatedPayoutsWithSidePools.find(p => p.quarter === rule.quarter);
                              const displayPercentage = enabledSidePools.length > 0 
                                ? (payout?.adjustedPercentage || rule.percentage).toFixed(2)
                                : rule.percentage.toFixed(2);
                              return (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-black">{rule.quarter}:</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-600">{displayPercentage}%</span>
                                    <span className="font-medium text-black">${(payout?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="mt-2">
                              <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-black">Main Payouts Total:</span>
                                <span className="text-black">${remainingPotForMainPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Side Pools Section */}
                          {enabledSidePools.length > 0 && (
                            <div className="pt-2 border-t border-gray-300 mb-3">
                              {enabledSidePools.map((pool) => (
                                <div key={pool.id} className="flex justify-between items-center text-sm">
                                  <span className="text-black">{pool.name}:</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-600">{pool.percentage.toFixed(2)}%</span>
                                    <span className="font-medium text-black">${((totalPot * pool.percentage) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                              </div>
                            ))}
                              <div className="mt-2">
                                <div className="flex justify-between items-center text-sm font-semibold">
                                  <span className="text-black">Side Pools Total:</span>
                                  <span className="text-black">${totalSidePoolAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-gray-300">
                            <div className="flex justify-between items-center text-sm font-semibold">
                              <span className="text-black">Total Pot:</span>
                              <span className="text-black">${totalPot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          
                          {/* Visual Progress Bar */}
                          <div className="mt-3">
                            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                              {selectedTemplate.rules.map((rule, index) => {
                                const colors = ['bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400'];
                                const payout = calculatedPayoutsWithSidePools.find(p => p.quarter === rule.quarter);
                                // Calculate adjusted percentage as percentage of total pot (accounting for side pools)
                                const adjustedPercentage = enabledSidePools.length > 0 
                                  ? (payout?.adjustedPercentage || rule.percentage)
                                  : rule.percentage;
                                return (
                                  <div
                                    key={index}
                                    className={`${colors[index % colors.length]} flex items-center justify-center text-[10px] text-white font-bold`}
                                    style={{ width: `${adjustedPercentage}%` }}
                                    title={`${rule.quarter}: ${rule.percentage}%${enabledSidePools.length > 0 ? ` (${adjustedPercentage.toFixed(2)}% of total)` : ''}`}
                                  >
                                    {adjustedPercentage >= 15 ? `${adjustedPercentage.toFixed(2)}%` : ''}
                                  </div>
                                );
                              })}
                              {enabledSidePools.length > 0 && totalSidePoolPercentage > 0 && (
                                <div
                                  className="bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold"
                                  style={{ width: `${totalSidePoolPercentage}%` }}
                                  title={`Side Pools: ${totalSidePoolPercentage.toFixed(2)}%`}
                                >
                                  {totalSidePoolPercentage >= 15 ? `${totalSidePoolPercentage.toFixed(2)}%` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Notes */}
                          {isNoRepeatTemplate && (
                            <div className="mt-3 p-2 bg-orange-50/90 backdrop-blur-sm border border-orange-200 rounded text-xs text-orange-800">
                              * If the same person wins multiple quarters, their additional winnings roll to the next available quarter.
                            </div>
                          )}
                          
                          {calculatedPayouts.length <= 2 && (
                            <div className="mt-3 p-2 bg-green-50/90 backdrop-blur-sm border border-green-200 rounded text-xs text-green-800">
                              Simplified payout structure - fewer payouts to manage during the game.
                            </div>
                          )}
                          
                          {/* Best For & Strategy Explanation */}
                          <div className="mt-3 p-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded text-xs text-black space-y-2">
                            <div>
                              <strong>Best for:</strong> {selectedTemplate.bestFor}
                            </div>
                            <div>
                            <strong>Strategy:</strong> {(() => {
                              switch (selectedTemplate.name) {
                                  case 'Balanced':
                                  return 'Equal payouts keep everyone engaged throughout the entire game. No complexity, no complaints.';
                                  case 'Big Finish':
                                  return 'Small early payouts maintain interest while the big prize awaits the final score. Great for competitive groups.';
                                case 'Halftime + Final Only':
                                  return 'Only two payouts to track and distribute. Perfect for busy hosts who want simplicity.';
                                case 'Progressive Build':
                                  return 'Excitement builds as payouts increase each quarter. Creates anticipation and momentum.';
                                  case 'Early Action':
                                  return 'Front-loaded excitement gets everyone invested early. Great for watch parties and casual groups.';
                                  case 'Winner Take All':
                                  return 'Maximum tension as everything rides on the final score. High-stakes, winner-takes-all drama.';
                                  case 'Three Payout':
                                  return 'Skips 3rd quarter complexity while maintaining good balance between early action and final payoff.';
                                  case 'No Repeat Winners':
                                  return 'Prevents any single person from dominating multiple quarters. Ensures broader participation in winnings.';
                                default:
                                  return 'Choose the structure that best fits your group\'s preferences and experience level.';
                              }
                            })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
            </div>

                {/* Add Side Pool Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowSidePoolsModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-md transform hover:scale-[1.02] rainbow-shadow"
                    aria-label="Add side pool"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Side Pool
                  </button>
                  <style dangerouslySetInnerHTML={{__html: `
                    .rainbow-shadow {
                      position: relative;
                    }
                    .rainbow-shadow:hover {
                      animation: rainbow-shadow 2s linear infinite;
                    }
                    @keyframes rainbow-shadow {
                      0% {
                        box-shadow: 0 4px 20px rgba(255, 0, 0, 0.5), 0 0 30px rgba(255, 0, 0, 0.3);
                      }
                      14% {
                        box-shadow: 0 4px 20px rgba(255, 127, 0, 0.5), 0 0 30px rgba(255, 127, 0, 0.3);
                      }
                      28% {
                        box-shadow: 0 4px 20px rgba(255, 255, 0, 0.5), 0 0 30px rgba(255, 255, 0, 0.3);
                      }
                      42% {
                        box-shadow: 0 4px 20px rgba(0, 255, 0, 0.5), 0 0 30px rgba(0, 255, 0, 0.3);
                      }
                      57% {
                        box-shadow: 0 4px 20px rgba(0, 0, 255, 0.5), 0 0 30px rgba(0, 0, 255, 0.3);
                      }
                      71% {
                        box-shadow: 0 4px 20px rgba(75, 0, 130, 0.5), 0 0 30px rgba(75, 0, 130, 0.3);
                      }
                      85% {
                        box-shadow: 0 4px 20px rgba(148, 0, 211, 0.5), 0 0 30px rgba(148, 0, 211, 0.3);
                      }
                      100% {
                        box-shadow: 0 4px 20px rgba(255, 0, 0, 0.5), 0 0 30px rgba(255, 0, 0, 0.3);
                      }
                    }
                  `}} />
                    </div>
                  </div>
              </div>
              

            {/* Grid Progress */}
            <div className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-6 border border-white/20">
              <div className="space-y-4">
                {/* Progress Indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-black font-medium">Grid Progress</span>
                    <span className="text-black font-semibold">{filledBoxesCount} / 100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        canGenerateNumbers 
                          ? 'bg-green-500' 
                          : filledBoxesCount > 0 
                            ? 'bg-blue-500' 
                            : 'bg-gray-300'
                      }`}
                      style={{ width: `${filledBoxesCount}%` }}
                      role="progressbar"
                      aria-valuenow={filledBoxesCount}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  {!canGenerateNumbers && filledBoxesCount > 0 && (
                    <p className="text-xs text-gray-600">
                      {100 - filledBoxesCount} more boxes needed to generate numbers
                    </p>
                  )}
                </div>

                {/* Money Collected Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-black font-medium">Money Collected</span>
                    <span className="text-black font-semibold">${totalMoneyCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${totalPot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${
                        moneyCollectedPercentage === 100
                          ? 'bg-green-500' 
                          : moneyCollectedPercentage > 0 
                            ? 'bg-yellow-500' 
                            : 'bg-gray-300'
                      }`}
                      style={{ width: `${Math.min(100, moneyCollectedPercentage)}%` }}
                      role="progressbar"
                      aria-valuenow={moneyCollectedPercentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  {moneyCollectedPercentage < 100 && totalMoneyCollected > 0 && (
                    <p className="text-xs text-gray-600">
                      ${(totalPot - totalMoneyCollected).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining to collect
                    </p>
                  )}
                </div>
                
                <button
                  onClick={handleGenerateNumbers}
                  disabled={!canGenerateNumbers}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-all duration-200 ${
                    canGenerateNumbers
                      ? 'bg-green-600 hover:bg-green-700 hover:shadow-lg text-white transform hover:scale-[1.02]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  aria-label={gridState.numbersGenerated ? 'Regenerate random numbers' : 'Generate random numbers'}
                >
                  {gridState.numbersGenerated ? '🔄 Regenerate Numbers' : '🎲 Generate Numbers'}
                </button>

                {/* Note: Sharing not available for anonymous users */}
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 font-medium">💡 Want to share your grid?</p>
                  <p className="text-xs text-blue-700 mt-1">
                    <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 underline">
                      Create a free account
                    </Link> to save and share your grids!
                  </p>
                </div>
                
                {gridState.numbersGenerated && (
                  <div className="p-3 bg-green-50/90 backdrop-blur-sm border border-green-200 rounded-md">
                    <p className="text-sm text-green-800 font-medium">Numbers Generated</p>
                    <p className="text-xs text-green-700 mt-1">Random numbers have been assigned to rows and columns.</p>
                  </div>
                )}
                
                {/* Participant List */}
                {getParticipants().length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-black">Participants</h3>
                      <input
                        type="text"
                        placeholder="Search..."
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        className="flex-1 max-w-[200px] px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      />
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'not-paid')}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                      >
                        <option value="all">All</option>
                        <option value="paid">Paid</option>
                        <option value="not-paid">Not Paid</option>
                      </select>
              </div>
                    <div className="max-h-[400px] overflow-y-auto">
                    <div className="space-y-1">
                        {getParticipants()
                          .filter(participant => {
                            const matchesSearch = participant.name.toLowerCase().includes(participantSearch.toLowerCase());
                            const matchesFilter = paymentFilter === 'all' 
                              || (paymentFilter === 'paid' && participant.payment.paid)
                              || (paymentFilter === 'not-paid' && !participant.payment.paid);
                            return matchesSearch && matchesFilter;
                          })
                          .map((participant) => {
                          const isEditing = editingParticipant === participant.name;
                          return (
                            <div
                              key={participant.name}
                              className="px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors group"
                              onMouseEnter={() => {}}
                            >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <span className="font-medium text-black text-base">{participant.name}</span>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div>
                                    <span className="font-medium">Boxes:</span> {participant.boxes.join(', ')}
                          </div>
                                  <div>
                                    <span className="font-medium">Total:</span> ${participant.total.toFixed(2)}
                    </div>
                  </div>
                              </div>
                              {!isEditing && (
                                <button
                                  onClick={() => handleStartEditParticipant(participant)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded flex-shrink-0"
                                  aria-label={`Edit payment for ${participant.name}`}
                                >
                                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              <div className="flex-shrink-0">
                                {isEditing ? (
                                  <div className="space-y-2 min-w-[200px]">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={tempPaidStatus}
                                        onChange={(e) => {
                                          setTempPaidStatus(e.target.checked);
                                          if (e.target.checked) {
                                            // Auto-focus and open date picker when paid is checked
                                            setTimeout(() => {
                                              dateInputRef.current?.focus();
                                              dateInputRef.current?.showPicker?.();
                                            }, 100);
                                          }
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-xs text-black">Paid</span>
                                    </label>
                                    {tempPaidStatus && (
                                      <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={tempPaidDate}
                                        onChange={(e) => setTempPaidDate(e.target.value)}
                                        onClick={(e) => {
                                          // Open date picker on click
                                          if (e.currentTarget.showPicker) {
                                            e.currentTarget.showPicker();
                                          }
                                        }}
                                        className="w-full px-2 py-1.5 text-xs text-black border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                      />
                                    )}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleParticipantPaymentUpdate(participant.name, tempPaidStatus, tempPaidDate)}
                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingParticipant(null);
                                          setTempPaidStatus(false);
                                          setTempPaidDate('');
                                        }}
                                        className="px-2 py-1 text-xs bg-gray-300 hover:bg-gray-400 text-black rounded"
                                      >
                                        Cancel
                                      </button>
                              </div>
                            </div>
                                    ) : (
                            <div className="text-right">
                                        {participant.payment.paid ? (
                                          <div className="flex items-center gap-1 text-green-600">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <div className="text-xs">
                                              <div className="font-medium">Paid</div>
                                              {participant.payment.paidDate && (
                                                <div className="text-gray-500">
                                                  {new Date(participant.payment.paidDate).toLocaleDateString()}
                            </div>
                                              )}
                          </div>
                        </div>
                                        ) : (
                                          <div className="flex items-center gap-1 text-red-600">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            <div className="text-xs font-medium">Not Paid</div>
                    </div>
                                        )}
                  </div>
                )}
                  </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>

          {/* Squares Grid - Full Width */}
          <div className="w-full">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-6 border border-white/20 w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                  {gridState.title || 'Super Bowl LX'}
                </h2>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getGameStateColor()}`}>
                    {getCurrentGameState().toUpperCase()}
                  </span>
                  {getCurrentGameState() === 'ready' && features.hasGameDayMode && (
                    <button
                      onClick={() => setShowGameDayModal(true)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      🏈 Game Day Mode
                    </button>
                  )}
                  {getCurrentGameState() === 'ready' && !features.hasGameDayMode && features.showUpgradePrompts && (
                    <button
                      onClick={promptGuestUpgrade}
                      className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      🏈 Game Day (Premium)
                    </button>
                  )}
                  {getCurrentGameState() === 'live' && (
                    <button
                      onClick={() => setShowGameDayModal(true)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors animate-pulse"
                    >
                      📊 Update Score
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full relative">
                  
                  {/* Payout Preview Box - Top Left Corner */}
                  <div className="absolute top-0 left-0 w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 border-2 border-gray-400 bg-white shadow-lg z-50 flex flex-col justify-start items-start text-left px-2 py-2 text-black">
                    <div className="font-bold text-xs md:text-sm lg:text-base leading-tight mb-1">Pot: ${totalPot.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div className="text-[10px] md:text-xs lg:text-sm leading-tight space-y-0">
                      {calculatedPayoutsWithSidePools.map((p, i) => (
                        <div key={i} className="leading-tight">{p.quarter.split(' ')[0]}: ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Team Name Row */}
                  <div className="flex">
                    <div className="w-12 h-16"></div>
                    <div className="w-12 h-16"></div>
                    <div className="flex-1 min-w-[640px] h-16 flex items-center justify-center font-semibold text-base md:text-lg lg:text-xl text-black border-2 border-gray-400 bg-blue-50">
                      {gridState.homeTeamName || 'Home Team'}
                    </div>
                  </div>
                  
                  {/* Column Headers */}
                  <div className="flex">
                    <div className="w-16 h-16"></div>
                    <div className="w-16 h-16"></div>
                    <div className="flex flex-1">
                    {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className="flex-1 min-w-[80px] h-16 border-2 border-gray-400 bg-blue-100 flex items-center justify-center font-bold text-base md:text-lg lg:text-xl text-black">
                        {gridState.numbersGenerated ? gridState.colNumbers[i] : ''}
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Grid Rows Container with Away Team */}
                  <div className="relative flex">
                    {/* Away Team - spans all rows */}
                    <div className="w-12 h-[800px] flex items-center justify-center font-semibold text-base md:text-lg lg:text-xl text-black border-2 border-gray-400 bg-red-50 absolute left-0">
                      <span className="transform -rotate-90 whitespace-nowrap">{gridState.awayTeamName || 'Away Team'}</span>
                    </div>
                    
                    {/* Grid Rows */}
                    <div className="ml-12 flex-1">
                      {Array.from({ length: 10 }, (_, row) => (
                        <div key={row} className="flex">
                          <div className="w-20 h-20 border-2 border-gray-400 bg-red-100 flex items-center justify-center font-bold text-base md:text-lg lg:text-xl text-black flex-shrink-0">
                            {gridState.numbersGenerated ? gridState.rowNumbers[row] : ''}
                          </div>
                          <div className="flex flex-1">
                      {/* Row Boxes */}
                      {Array.from({ length: 10 }, (_, col) => {
                        const boxIndex = row * 10 + col;
                        const box = gridState.boxes[boxIndex];
                        const isEditing = editingBox === box.id;
                        const isWinningBox = getWinningBoxes().includes(boxIndex);
                        const winner = gridState.gameWinners?.find(w => w.boxIndex === boxIndex);
                        
                        return (
                          <div
                            key={col}
                                  className={`flex-1 min-w-[80px] h-20 border border-gray-300 flex items-center justify-center cursor-pointer text-sm md:text-base lg:text-lg font-medium transition-all duration-200 relative ${
                              isWinningBox 
                                ? 'bg-yellow-200 hover:bg-yellow-300 border-yellow-500 border-2 shadow-lg' 
                                : box.name 
                                  ? 'bg-green-50 hover:bg-green-100 hover:shadow-md hover:border-green-400' 
                                  : 'bg-white hover:bg-blue-50 hover:shadow-sm hover:border-blue-300'
                            } ${isEditing ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}
                            onClick={() => !isEditing && handleBoxClick(box.id)}
                            role="button"
                            tabIndex={0}
                            aria-label={box.name ? `Box ${boxIndex + 1}: ${box.name}` : `Box ${boxIndex + 1}: Empty`}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
                                e.preventDefault();
                                handleBoxClick(box.id);
                              }
                            }}
                          >
                            {/* Number badge in top right corner */}
                            <div className="absolute top-0 right-0 bg-white text-black text-[10px] md:text-xs lg:text-sm font-semibold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
                              {boxIndex + 1}
                            </div>
                            
                            {/* Winner badge in top left corner */}
                            {winner && (
                              <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] md:text-[10px] lg:text-xs font-bold w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-br">
                                {GameDayManager.formatQuarterName(winner.quarter)}
                              </div>
                            )}
                            
                            {isEditing ? (
                              <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={handleNameSubmit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleNameSubmit();
                                  if (e.key === 'Escape') {
                                    setEditingBox(null);
                                    setTempName('');
                                  }
                                }}
                                className="w-full h-full text-center text-sm md:text-base lg:text-lg bg-yellow-100 border-none outline-none text-black focus:ring-2 focus:ring-yellow-400"
                                autoFocus
                                maxLength={8}
                                aria-label={`Editing box ${boxIndex + 1}`}
                              />
                            ) : (
                              <span className="text-center leading-tight px-1 text-black">
                                {box.name || '+'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50/90 backdrop-blur-sm border border-blue-200/50 rounded-md">
                <p className="text-sm text-blue-900 font-medium mb-1">How to use</p>
                <p className="text-xs text-blue-800">
                  Click any box to add a participant name. Fill all 100 boxes to enable number generation.
                </p>
              </div>
            </div>
          </div>

          {/* Game Status & Winners Panel */}
          {((gridState.gameWinners && gridState.gameWinners.length > 0) || (gridState.currentScores && gridState.currentScores.length > 0)) && (
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-6 border border-white/20">
              <h2 className="text-lg font-semibold mb-4 text-black flex items-center gap-2">
                🏈 Game Status
              </h2>
              
              {/* Current Scores */}
              {gridState.currentScores && gridState.currentScores.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Latest Scores</h3>
                  <div className="space-y-1">
                    {gridState.currentScores
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 3)
                      .map((score, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 bg-blue-50 rounded">
                          <span className="font-medium text-blue-800">{GameDayManager.formatQuarterName(score.quarter)}</span>
                          <span className="text-blue-700">
                            {gridState.homeTeamName} {score.homeTeam} - {gridState.awayTeamName} {score.awayTeam}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Winners */}
              {gridState.gameWinners && gridState.gameWinners.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🎉 Winners</h3>
                  <div className="space-y-2">
                    {gridState.gameWinners.map((winner, index) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-yellow-900">{winner.participantName}</div>
                            <div className="text-xs text-yellow-700">
                              {GameDayManager.formatQuarterName(winner.quarter)} • Box #{winner.boxIndex + 1}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-yellow-900">${winner.amount}</div>
                            <div className="text-xs text-yellow-600">{winner.homeLastDigit}-{winner.awayLastDigit}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>Quarters Completed</span>
                  <span>{gridState.gameWinners?.length || 0} / {gridState.payoutRules.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((gridState.gameWinners?.length || 0) / gridState.payoutRules.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black">Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close settings"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Game Title</h4>
                <input
                  type="text"
                  value={gridState.title || 'Super Bowl LX'}
                  onChange={async (e) => {
                    const newState = { ...gridState, title: e.target.value };
                    setGridState(newState);
                    
                    try {
                      await StorageFactory.getInstance().saveGrid(newState);
                    } catch (error) {
                      console.error('Failed to save grid state:', error);
                    }
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all duration-200"
                  placeholder="Super Bowl LX"
                  aria-label="Game title"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This title appears in the header and exports
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Home Team</h4>
                  <input
                    type="text"
                    value={gridState.homeTeamName || 'Home Team'}
                    onChange={async (e) => {
                      const newState = { ...gridState, homeTeamName: e.target.value };
                      setGridState(newState);
                      
                      try {
                        await StorageFactory.getInstance().saveGrid(newState);
                      } catch (error) {
                        console.error('Failed to save grid state:', error);
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all duration-200"
                    placeholder="Home Team"
                    aria-label="Home team name"
                  />
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Away Team</h4>
                  <input
                    type="text"
                    value={gridState.awayTeamName || 'Away Team'}
                    onChange={async (e) => {
                      const newState = { ...gridState, awayTeamName: e.target.value };
                      setGridState(newState);
                      
                      try {
                        await StorageFactory.getInstance().saveGrid(newState);
                      } catch (error) {
                        console.error('Failed to save grid state:', error);
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black transition-all duration-200"
                    placeholder="Away Team"
                    aria-label="Away team name"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Grid Management</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowClearNamesConfirm(true);
                    }}
                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                    aria-label="Clear all participant names"
                  >
                    🗑️ Clear All Names
                  </button>
                  
                  <button
                    onClick={() => {
                      if (gridState.numbersGenerated) {
                        setShowSettingsModal(false);
                        setShowClearNumbersConfirm(true);
                      }
                    }}
                    disabled={!gridState.numbersGenerated}
                    className={`w-full py-2.5 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                      gridState.numbersGenerated
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    aria-label="Clear generated numbers"
                  >
                    🔢 Clear Generated Numbers
                  </button>
                  
                  {!gridState.numbersGenerated && (
                    <p className="text-xs text-gray-500 text-center">
                      Numbers must be generated before they can be cleared
                    </p>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Status</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Boxes filled: <span className="font-semibold text-black">{filledBoxesCount} / 100</span></p>
                  <p>Numbers generated: <span className="font-semibold text-black">{gridState.numbersGenerated ? 'Yes' : 'No'}</span></p>
                  <p>Price per box: <span className="font-semibold text-black">${gridState.pricePerBox}</span></p>
                  <p>Total pot: <span className="font-semibold text-black">${totalPot}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {showClearNamesConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowClearNamesConfirm(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-2xl p-6 max-w-md mx-4 border border-white/20" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-black mb-2">Clear All Names?</h3>
            <p className="text-sm text-gray-700 mb-4">
              This will remove all participant names from the grid. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearNamesConfirm(false)}
                className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAllNames}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearNumbersConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowClearNumbersConfirm(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-2xl p-6 max-w-md mx-4 border border-white/20" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-black mb-2">Clear Generated Numbers?</h3>
            <p className="text-sm text-gray-700 mb-4">
              This will remove all generated numbers from rows and columns. You'll need to regenerate them before the game.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowClearNumbersConfirm(false)}
                className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearNumbers}
                className="flex-1 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-medium transition-colors"
              >
                Clear Numbers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowUpgradeModal(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-2xl p-8 max-w-md mx-4 w-full border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-black mb-3">Sign Up to Share Your Grid</h3>
              <p className="text-gray-600 mb-6">
                Grid sharing requires a free account. All features are free - just sign up to get started!
              </p>
              
              <div className="space-y-3 mb-6 text-left">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">Share grids with share codes</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">Export to Excel spreadsheets</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">Real-time collaboration</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">Game day mode with live scoring</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">Cloud backup & sync</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    router.push('/auth/signup');
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Sign Up Free
                </button>
              </div>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Continue as Guest (local-only)
              </button>
              
              <p className="text-xs text-gray-500 mt-4">
                No credit card required • Import your current grid • 2 minute setup
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Game Day Modal */}
      {showGameDayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowGameDayModal(false)}>
          <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-2xl p-6 max-w-lg mx-4 w-full border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black flex items-center gap-2">
                🏈 Game Day Mode
              </h3>
              <button
                onClick={() => setShowGameDayModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close game day mode"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Current Scores Display */}
              {gridState.currentScores && gridState.currentScores.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Current Scores</h4>
                  <div className="space-y-2">
                    {gridState.currentScores.map((score, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-blue-800">{score.quarter}:</span>
                        <span className="text-blue-700">
                          {gridState.homeTeamName} {score.homeTeam} - {gridState.awayTeamName} {score.awayTeam}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Winners Display */}
              {gridState.gameWinners && gridState.gameWinners.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-2">🎉 Winners</h4>
                  <div className="space-y-2">
                    {gridState.gameWinners.map((winner, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-yellow-800">{winner.quarter}:</span>
                        <div className="text-right">
                          <div className="text-yellow-700 font-semibold">{winner.participantName}</div>
                          <div className="text-xs text-yellow-600">${winner.amount} • {winner.homeLastDigit}-{winner.awayLastDigit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Input Form */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Enter Score</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {gridState.homeTeamName} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentHomeScore}
                      onChange={(e) => setCurrentHomeScore(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {gridState.awayTeamName} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentAwayScore}
                      onChange={(e) => setCurrentAwayScore(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quarter/Period
                  </label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select quarter...</option>
                    {GameDayManager.getAvailableQuarters(gridState).map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedQuarter === 'Final Score' && (
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gridState.wentToOvertime || false}
                        onChange={async (e) => {
                          const newState = { ...gridState, wentToOvertime: e.target.checked };
                          setGridState(newState);
                          try {
                            await StorageFactory.getInstance().saveGrid(newState);
                          } catch (error) {
                            console.error('Failed to save grid state:', error);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Game went to Overtime</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Check this if the game went to overtime for Overtime Jackpot side pool
                    </p>
                  </div>
                )}

                <button
                  onClick={handleScoreSubmit}
                  disabled={!currentHomeScore || !currentAwayScore || !selectedQuarter}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                    currentHomeScore && currentAwayScore && selectedQuarter
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  🎯 Determine Winner
                </button>
              </div>

              {/* Game State Controls */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Game Status</h4>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getGameStateColor()}`}>
                    {getCurrentGameState().toUpperCase()}
                  </span>
                  
                  {getCurrentGameState() === 'ready' && (
                    <button
                      onClick={() => handleGameStateChange('live')}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Start Game
                    </button>
                  )}
                  
                  {getCurrentGameState() === 'live' && gridState.gameWinners && gridState.gameWinners.length === gridState.payoutRules.length && (
                    <button
                      onClick={() => handleGameStateChange('completed')}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Complete Game
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side Pools Modal */}
      {showSidePoolsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSidePoolsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-6xl mx-4 w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-black">🎯 Side Pools</h3>
              <button
                onClick={() => setShowSidePoolsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close side pools"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(gridState.sidePools || []).map((pool) => (
                <div key={pool.id} className="border border-gray-200 rounded-lg p-5 space-y-3 bg-gray-50 relative">
                  {pool.id.startsWith('custom-') && (
                    <button
                      onClick={() => handleDeleteCustomPool(pool.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition-colors"
                      aria-label={`Delete ${pool.name}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={pool.enabled}
                          onChange={(e) => handleSidePoolToggle(pool.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label={`Enable ${pool.name}`}
                        />
                        <label className="text-sm font-semibold text-black cursor-pointer">
                          {pool.name}
                        </label>
                      </div>
                      <p className="text-xs text-gray-600 ml-6">{pool.description}</p>
                    </div>
                  </div>
                  <div className="ml-6 space-y-2">
                    <label className="block text-xs font-medium text-black">
                      Percentage (%) {pool.enabled && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pool.percentage || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          handleSidePoolPercentageChange(pool.id, 0);
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 0) {
                            handleSidePoolPercentageChange(pool.id, Math.min(100, numValue));
                          }
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm ${
                        pool.enabled && (!pool.percentage || pool.percentage <= 0) 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-300'
                      }`}
                      aria-label={`${pool.name} percentage`}
                      required={pool.enabled}
                    />
                    {pool.enabled && (!pool.percentage || pool.percentage <= 0) && (
                      <p className="text-xs text-red-500">
                        Percentage is required when side pool is enabled
                      </p>
                    )}
                    {pool.percentage > 0 && (
                      <p className="text-xs text-gray-500">
                        Amount: ${(Math.round((totalPot * pool.percentage) / 100 * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Add Custom Side Pool Form */}
              {showAddCustomPool ? (
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-5 space-y-3 bg-blue-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-black">Add Custom Side Pool</h4>
                    <button
                      onClick={() => {
                        setShowAddCustomPool(false);
                        setCustomPoolName('');
                        setCustomPoolDescription('');
                        setCustomPoolPercentage(0);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={customPoolName}
                        onChange={(e) => setCustomPoolName(e.target.value)}
                        placeholder="e.g., First Touchdown Bonus"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Description
                      </label>
                      <textarea
                        value={customPoolDescription}
                        onChange={(e) => setCustomPoolDescription(e.target.value)}
                        placeholder="Explain how this side pool works..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={customPoolPercentage || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setCustomPoolPercentage(0);
                          } else {
                            const numValue = Number(value);
                            if (!isNaN(numValue) && numValue >= 0) {
                              setCustomPoolPercentage(Math.min(100, numValue));
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm"
                      />
                      {customPoolPercentage > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Amount: ${(Math.round((totalPot * customPoolPercentage) / 100 * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleAddCustomPool}
                      disabled={!customPoolName.trim() || !customPoolDescription.trim()}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Add Side Pool
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCustomPool(true)}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-5 space-y-2 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center min-h-[150px]"
                >
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-600">Add Custom Side Pool</span>
                </button>
              )}
              {gridState.sidePools && gridState.sidePools.filter(p => p.enabled).length > 0 && (
                <div className="col-span-full mt-4 p-4 bg-blue-50/90 backdrop-blur-sm border border-blue-200 rounded text-sm text-blue-800">
                  <strong>Note:</strong> Side pool percentages are deducted from the main pot. Make sure your main payout percentages and side pool percentages don't exceed 100% total.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}