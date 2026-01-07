import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { GridState } from '@/types';
import { defaultPayoutTemplates } from '@/lib/payout-templates';

export const exportToExcel = (gridState: GridState) => {
  const workbook = XLSX.utils.book_new();
  
  // Create the main grid sheet
  const gridData: (string | number)[][] = [];
  
  // Header row with column numbers
  const headerRow: (string | number)[] = [''];
  for (let col = 0; col < 10; col++) {
    headerRow.push(gridState.numbersGenerated ? gridState.colNumbers[col] : col);
  }
  gridData.push(headerRow);
  
  // Grid rows with data
  for (let row = 0; row < 10; row++) {
    const rowData: (string | number)[] = [];
    
    // Row number
    rowData.push(gridState.numbersGenerated ? gridState.rowNumbers[row] : row);
    
    // Box names
    for (let col = 0; col < 10; col++) {
      const boxIndex = row * 10 + col;
      const box = gridState.boxes[boxIndex];
      rowData.push(box.name || '');
    }
    
    gridData.push(rowData);
  }
  
  const gridSheet = XLSX.utils.aoa_to_sheet(gridData);
  
  // Style the grid
  const gridRange = XLSX.utils.decode_range(gridSheet['!ref'] || 'A1');
  
  // Set column widths
  gridSheet['!cols'] = Array(11).fill({ width: 12 });
  
  // Add borders and formatting
  for (let row = gridRange.s.r; row <= gridRange.e.r; row++) {
    for (let col = gridRange.s.c; col <= gridRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!gridSheet[cellAddress]) {
        gridSheet[cellAddress] = { t: 's', v: '' };
      }
      
      // Header styling
      if (row === 0 || col === 0) {
        gridSheet[cellAddress].s = {
          fill: { fgColor: { rgb: 'CCCCCC' } },
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      } else {
        gridSheet[cellAddress].s = {
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, gridSheet, 'Squares Grid');
  
  // Create payout information sheet
  const gameTitle = gridState.title || 'Super Bowl LX';
  const payoutData: (string | number)[][] = [
    [`${gameTitle} Squares - Payout Information`],
    [''],
    ['Game Settings:'],
    ['Price per Box:', `$${gridState.pricePerBox}`],
    ['Total Pot:', `$${gridState.pricePerBox * 100}`],
    ['Template:', gridState.selectedTemplate],
    [''],
    ['Template Details:']
  ];
  
  // Add template details
  const template = defaultPayoutTemplates.find(t => t.name === gridState.selectedTemplate);
  if (template) {
    payoutData.push(['Description:', template.description]);
    payoutData.push(['Best for:', template.bestFor]);
    if (template.specialLogic === 'no-repeat') {
      payoutData.push(['Special Rule:', 'Same person cannot win multiple quarters (payout rolls forward)']);
    }
  }
  
  payoutData.push(['']);
  payoutData.push(['Payout Breakdown:']);
  
  // Calculate payouts
  const totalPot = gridState.pricePerBox * 100;
  gridState.payoutRules.forEach(rule => {
    const amount = Math.round((totalPot * rule.percentage) / 100 * 100) / 100;
    payoutData.push([rule.quarter, `$${amount}`, `(${rule.percentage}%)`]);
  });
  
  payoutData.push(['']);
  payoutData.push(['Game Status:']);
  payoutData.push(['Numbers Generated:', gridState.numbersGenerated ? 'Yes' : 'No']);
  
  if (gridState.numbersGenerated) {
    payoutData.push(['']);
    payoutData.push(['Row Numbers:', gridState.rowNumbers.join(', ')]);
    payoutData.push(['Column Numbers:', gridState.colNumbers.join(', ')]);
  }
  
  // Add participant list
  const participants = gridState.boxes
    .filter(box => box.name.trim() !== '')
    .map(box => box.name.trim())
    .sort();
  
  if (participants.length > 0) {
    payoutData.push(['']);
    payoutData.push([`Participants (${participants.length}/100):`]);
    participants.forEach((name, index) => {
      payoutData.push([`${index + 1}.`, name]);
    });
  }
  
  const payoutSheet = XLSX.utils.aoa_to_sheet(payoutData);
  
  // Style the payout sheet
  payoutSheet['!cols'] = [{ width: 20 }, { width: 15 }, { width: 10 }];
  
  XLSX.utils.book_append_sheet(workbook, payoutSheet, 'Payout Info');
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `super-bowl-squares-${timestamp}.xlsx`;
  
  // Export file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  saveAs(blob, filename);
};