import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { GridState } from '@/types';
import { defaultPayoutTemplates } from '@/lib/payout-templates';

export const generatePDF = async (gridState: GridState) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const totalPot = gridState.pricePerBox * 100;

  // Title across the top
  const gameTitle = gridState.title || 'Super Bowl LX';
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(gameTitle, pageWidth / 2, margin + 8, { align: 'center' });

  // Payouts across the top in a single line
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const payoutTexts = gridState.payoutRules.map(rule => {
    const amount = Math.round((totalPot * rule.percentage) / 100 * 100) / 100;
    const quarterLabel = rule.quarter.replace(' Quarter', '').replace('Final Score', 'Final');
    return `${quarterLabel}: $${amount}`;
  });
  const payoutLine = `${payoutTexts.join('  |  ')}  |  Total Pot: $${totalPot}`;
  pdf.text(payoutLine, pageWidth / 2, margin + 17, { align: 'center' });

  const enabledSidePools = (gridState.sidePools || []).filter(pool => pool.enabled);
  const sidePotLineItems = enabledSidePools.map(pool => {
    const amount = Math.round((totalPot * (pool.percentage || 0)) / 100 * 100) / 100;
    const label = pool.name.replace(/\s*score/i, '').trim();
    return `${label}: $${amount}`;
  });
  if (enabledSidePools.length > 0) {
    const sidePoolLine = sidePotLineItems.join('  |  ');
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    pdf.text(`Side Pots: ${sidePoolLine}`, pageWidth / 2, margin + 24, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
  }

  // Calculate grid dimensions to fill the entire remaining page
  const gridStartY = margin + 42; // More space for header/payouts
  const availableHeight = pageHeight - gridStartY - margin;
  const labelSpace = 20; // Space for Away Team label on the left
  const availableWidth = pageWidth - 2 * margin - labelSpace;
  
  // Make grid rectangular to fill entire page (don't require square cells)
  const cellWidth = availableWidth / 11; // 11 because we include headers
  const cellHeight = availableHeight / 11; // 11 because we include headers
  
  // Position grid to use full available space, leaving room for Away Team label
  const gridStartX = margin + labelSpace;

  // Draw grid with rectangular cells to fill the page
  pdf.setLineWidth(0.6);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(Math.max(8, Math.min(cellWidth, cellHeight) * 0.15)); // Scale font size with smaller dimension

  // Top-left corner cell
  pdf.setFillColor(243, 244, 246); // bg-gray-100 equivalent
  pdf.rect(gridStartX, gridStartY, cellWidth, cellHeight, 'F');
  pdf.setDrawColor(107, 114, 128); // border-gray-500 equivalent
  pdf.setLineWidth(0.7);
  pdf.rect(gridStartX, gridStartY, cellWidth, cellHeight, 'S');
  
  // Column headers (Home Team)
  for (let col = 0; col < 10; col++) {
    const x = gridStartX + (col + 1) * cellWidth;
    const y = gridStartY;
    
    // Header cell background - blue theme like the web interface
    pdf.setFillColor(147, 197, 253); // bg-blue-300 equivalent
    pdf.rect(x, y, cellWidth, cellHeight, 'F');
    pdf.setDrawColor(37, 99, 235); // border-blue-600 equivalent
    pdf.setLineWidth(0.7);
    pdf.rect(x, y, cellWidth, cellHeight, 'S');
    
    // Header number
    const headerNum = gridState.numbersGenerated ? gridState.colNumbers[col].toString() : '';
    if (headerNum) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(Math.max(10, Math.min(cellWidth, cellHeight) * 0.2));
      pdf.setTextColor(0, 0, 0);
      pdf.text(headerNum, x + cellWidth / 2, y + cellHeight / 2 + 1.5, { align: 'center' });
    }
  }
  
  // Team labels positioned for the rectangular layout
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(Math.max(10, Math.min(cellWidth, cellHeight) * 0.15));
  pdf.setTextColor(0, 0, 0);
  
  // Home Team label (horizontal, above column headers)
  const team2LabelY = gridStartY - 8;
  const gridWidth = cellWidth * 11;
  pdf.text('Home Team', gridStartX + (gridWidth / 2), team2LabelY, { align: 'center' });
  
  // Away Team label (vertical, rotated 90 degrees to the left of row headers)
  const team1LabelX = margin + labelSpace / 2; // Centered in the label space
  const gridHeight = cellHeight * 11;
  const team1LabelY = gridStartY + (gridHeight / 2);
  pdf.text('Away Team', team1LabelX, team1LabelY, { align: 'center', angle: 90 });

  // Row headers and grid cells
  for (let row = 0; row < 10; row++) {
    const y = gridStartY + (row + 1) * cellHeight;
    
    // Row header (Away Team)
    const rowHeaderX = gridStartX;
    pdf.setFillColor(254, 202, 202); // bg-red-300 equivalent
    pdf.rect(rowHeaderX, y, cellWidth, cellHeight, 'F');
    pdf.setDrawColor(220, 38, 38); // border-red-600 equivalent
    pdf.setLineWidth(0.7);
    pdf.rect(rowHeaderX, y, cellWidth, cellHeight, 'S');
    
    const rowHeaderNum = gridState.numbersGenerated ? gridState.rowNumbers[row].toString() : '';
    if (rowHeaderNum) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(Math.max(10, Math.min(cellWidth, cellHeight) * 0.2));
      pdf.setTextColor(0, 0, 0);
      pdf.text(rowHeaderNum, rowHeaderX + cellWidth / 2, y + cellHeight / 2 + 1.5, { align: 'center' });
    }
    
    // Grid cells
    for (let col = 0; col < 10; col++) {
      const x = gridStartX + (col + 1) * cellWidth;
      const boxIndex = row * 10 + col;
      const box = gridState.boxes[boxIndex];
      
      // Cell background and border - green tint for filled boxes
      if (box.name.trim()) {
        pdf.setFillColor(220, 252, 231); // green-100 tint
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.rect(x, y, cellWidth, cellHeight, 'F');
      pdf.setDrawColor(156, 163, 175); // border-gray-400 equivalent
      pdf.setLineWidth(0.6);
      pdf.rect(x, y, cellWidth, cellHeight, 'S');

      // Box number (top-right)
      const boxNumber = (boxIndex + 1).toString();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(Math.max(6, Math.min(cellWidth, cellHeight) * 0.16));
      pdf.setTextColor(107, 114, 128); // text-gray-500
      pdf.text(boxNumber, x + cellWidth - 1.2, y + 3.2, { align: 'right' });
      
      // Name in cell
      if (box.name.trim()) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(Math.max(6, Math.min(cellWidth, cellHeight) * 0.12));
        pdf.setTextColor(0, 0, 0);
        
        // Handle long names by splitting into words and wrapping
        const words = box.name.trim().split(' ');
        const maxWidth = cellWidth * 0.8; // Leave some padding
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = pdf.getTextWidth(testLine);
          
          if (textWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        
        // If we have too many lines, truncate to fit in rectangular cell
        const maxLines = Math.floor(cellHeight / 3);
        if (lines.length > maxLines) {
          lines.splice(maxLines - 1);
          lines[maxLines - 1] = lines[maxLines - 1].substring(0, 8) + '...';
        }
        
        const lineHeight = Math.max(2.5, cellHeight * 0.15);
        const startY = y + cellHeight / 2 - (lines.length - 1) * lineHeight / 2;
        
        lines.forEach((line, index) => {
          pdf.text(line, x + cellWidth / 2, startY + index * lineHeight, { align: 'center' });
        });
      }
    }
  }

  // Save PDF
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `super-bowl-squares-${timestamp}.pdf`;
  pdf.save(filename);
};

export const printGrid = async (gridState: GridState) => {
  // Create a temporary div for printing
  const printDiv = document.createElement('div');
  printDiv.style.position = 'absolute';
  printDiv.style.left = '-9999px';
  printDiv.style.backgroundColor = 'white';
  printDiv.style.padding = '10px';
  printDiv.style.fontSize = '12px';
  printDiv.style.fontFamily = 'Arial, sans-serif';
  printDiv.style.width = '100vw';
  printDiv.style.height = '100vh';

  const totalPot = gridState.pricePerBox * 100;
  const gameTitle = gridState.title || 'Super Bowl LX';
  const template = defaultPayoutTemplates.find(t => t.name === gridState.selectedTemplate);

  // Create payouts line
  const payoutTexts = gridState.payoutRules.map(rule => {
    const amount = Math.round((totalPot * rule.percentage) / 100 * 100) / 100;
    const quarterLabel = rule.quarter.replace(' Quarter', '').replace('Final Score', 'Final');
    return `${quarterLabel}: $${amount}`;
  });
  const payoutLine = `${payoutTexts.join('  |  ')}  |  Total Pot: $${totalPot}`;

  const enabledSidePools = (gridState.sidePools || []).filter(pool => pool.enabled);
  const sidePotLineItems = enabledSidePools.map(pool => {
    const amount = Math.round((totalPot * (pool.percentage || 0)) / 100 * 100) / 100;
    const label = pool.name.replace(/\s*score/i, '').trim();
    return `${label}: $${amount}`;
  });

  printDiv.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; width: 100%; padding: 10px;">
      <!-- Title and payouts across the top -->
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold;">${gameTitle}</h1>
        <p style="margin: 0; font-size: 14px;">${payoutLine}</p>
        ${enabledSidePools.length > 0 ? `
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #374151;">
            Side Pots: ${sidePotLineItems.join('  |  ')}
          </p>
        ` : ''}
      </div>
      
      <!-- Grid filling the remaining space -->
      <div style="flex-grow: 1; position: relative; margin-left: 40px;">
        <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-weight: bold; font-size: 16px;">Home Team</div>
        <div style="position: absolute; left: -30px; top: 50%; transform: translateY(-50%) rotate(-90deg); font-weight: bold; font-size: 16px; width: 100px; text-align: center;">Away Team</div>
        
        <table style="width: 100%; height: 100%; border-collapse: collapse; border: 2px solid #000;">
          <tr style="height: 9.09%;">
            <td style="width: 9.09%; border: 1px solid #9CA3AF; background-color: #F3F4F6;"></td>
            ${Array.from({ length: 10 }, (_, i) => `
              <td style="width: 9.09%; border: 2px solid #3B82F6; background-color: #93C5FD; text-align: center; font-weight: bold; font-size: 16px; vertical-align: middle;">
                ${gridState.numbersGenerated ? gridState.colNumbers[i] : ''}
              </td>
            `).join('')}
          </tr>
          ${Array.from({ length: 10 }, (_, row) => `
            <tr style="height: 9.09%;">
              <td style="width: 9.09%; border: 2px solid #EF4444; background-color: #FECACA; text-align: center; font-weight: bold; font-size: 16px; vertical-align: middle;">
                ${gridState.numbersGenerated ? gridState.rowNumbers[row] : ''}
              </td>
              ${Array.from({ length: 10 }, (_, col) => {
                const boxIndex = row * 10 + col;
                const box = gridState.boxes[boxIndex];
                return `
                  <td style="width: 9.09%; border: 2px solid #6B7280; background-color: ${box.name ? '#DCFCE7' : 'white'}; font-size: 12px; padding: 2px; vertical-align: middle; word-wrap: break-word; overflow: hidden; position: relative;">
                    <div style="position: absolute; top: 2px; right: 4px; font-size: 9px; color: #6B7280;">${boxIndex + 1}</div>
                    <div style="text-align: center;">${box.name || ''}</div>
                  </td>
                `;
              }).join('')}
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(printDiv);

  try {
    const canvas = await html2canvas(printDiv, {
      backgroundColor: 'white',
      scale: 2
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = (pdfHeight - imgHeight * ratio) / 2;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `super-bowl-squares-print-${timestamp}.pdf`;
    pdf.save(filename);

  } finally {
    document.body.removeChild(printDiv);
  }
};