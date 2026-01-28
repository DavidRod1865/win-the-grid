import { SquareBox } from '@/types';

/**
 * Find duplicate participant names in the grid
 */
export function findDuplicateParticipants(boxes: SquareBox[]): Map<string, number[]> {
  const nameMap = new Map<string, number[]>();

  boxes.forEach((box, index) => {
    const name = box.name.trim().toLowerCase();
    if (name) {
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name)!.push(index);
    }
  });

  // Filter to only duplicates
  const duplicates = new Map<string, number[]>();
  nameMap.forEach((indices, name) => {
    if (indices.length > 1) {
      duplicates.set(name, indices);
    }
  });

  return duplicates;
}

/**
 * Search for participant names and return matching box indices
 */
export function searchParticipants(boxes: SquareBox[], query: string): number[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return boxes
    .map((box, index) => ({ box, index }))
    .filter(({ box }) => box.name.toLowerCase().includes(lowerQuery))
    .map(({ index }) => index);
}

/**
 * Get the next empty box index
 */
export function getNextEmptyBox(boxes: SquareBox[], currentIndex?: number): number | null {
  const startIndex = currentIndex !== undefined ? currentIndex + 1 : 0;

  for (let i = startIndex; i < boxes.length; i++) {
    if (!boxes[i].name.trim()) {
      return i;
    }
  }

  // Wrap around to beginning if no empty boxes found after current
  if (currentIndex !== undefined) {
    for (let i = 0; i < currentIndex; i++) {
      if (!boxes[i].name.trim()) {
        return i;
      }
    }
  }

  return null;
}

/**
 * Count filled and empty boxes
 */
export function getBoxStats(boxes: SquareBox[]): {
  filled: number;
  empty: number;
  total: number;
  percentage: number;
} {
  const filled = boxes.filter((box) => box.name.trim()).length;
  const total = boxes.length;
  const empty = total - filled;
  const percentage = (filled / total) * 100;

  return { filled, empty, total, percentage };
}

/**
 * Get all unique participant names with their box numbers
 */
export function getParticipantList(boxes: SquareBox[]): Array<{
  name: string;
  boxNumbers: number[];
  count: number;
}> {
  const participantMap = new Map<string, number[]>();

  boxes.forEach((box, index) => {
    const name = box.name.trim();
    if (name) {
      if (!participantMap.has(name)) {
        participantMap.set(name, []);
      }
      participantMap.get(name)!.push(index + 1); // 1-indexed for display
    }
  });

  return Array.from(participantMap.entries())
    .map(([name, boxNumbers]) => ({
      name,
      boxNumbers: boxNumbers.sort((a, b) => a - b),
      count: boxNumbers.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Validate participant data before saving
 */
export function validateParticipants(boxes: SquareBox[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const stats = getBoxStats(boxes);
  const duplicates = findDuplicateParticipants(boxes);

  // Check if any boxes are filled
  if (stats.filled === 0) {
    warnings.push('No participants added yet');
  }

  // Check for duplicates
  if (duplicates.size > 0) {
    warnings.push(
      `${duplicates.size} participant(s) have multiple boxes: ${Array.from(
        duplicates.keys()
      ).join(', ')}`
    );
  }

  // Check for very long names (might cause display issues)
  const longNames = boxes.filter((box) => box.name.length > 30);
  if (longNames.length > 0) {
    warnings.push(
      `${longNames.length} participant name(s) are very long and may not display well`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a CSV export of participants
 */
export function exportParticipantsToCSV(boxes: SquareBox[]): string {
  const participants = getParticipantList(boxes);

  let csv = 'Name,Box Count,Box Numbers\n';

  participants.forEach((p) => {
    csv += `"${p.name}",${p.count},"${p.boxNumbers.join(', ')}"\n`;
  });

  return csv;
}

/**
 * Parse CSV data and return participant names
 */
export function parseParticipantsFromCSV(csvText: string): string[] {
  const lines = csvText.split(/\r?\n/);
  const names: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed) {
      // Handle quoted CSV values
      const match = trimmed.match(/^"?([^",]+)"?/);
      if (match) {
        names.push(match[1].trim());
      }
    }
  });

  return names.filter((name) => name.length > 0);
}

/**
 * Auto-fill empty boxes with a list of names
 */
export function autoFillBoxes(
  boxes: SquareBox[],
  names: string[],
  allowDuplicates: boolean = true
): SquareBox[] {
  const updatedBoxes = [...boxes];
  const existingNames = new Set(
    boxes.map((b) => b.name.toLowerCase()).filter((n) => n)
  );

  let nameIndex = 0;
  let boxIndex = 0;

  while (nameIndex < names.length && boxIndex < updatedBoxes.length) {
    // Find next empty box
    while (boxIndex < updatedBoxes.length && updatedBoxes[boxIndex].name.trim()) {
      boxIndex++;
    }

    if (boxIndex >= updatedBoxes.length) break;

    const name = names[nameIndex];

    // Skip if duplicate and not allowed
    if (!allowDuplicates && existingNames.has(name.toLowerCase())) {
      nameIndex++;
      continue;
    }

    // Fill the box
    updatedBoxes[boxIndex] = {
      ...updatedBoxes[boxIndex],
      name: name,
    };

    existingNames.add(name.toLowerCase());
    nameIndex++;
    boxIndex++;
  }

  return updatedBoxes;
}
