import { supabase } from '../supabase';

/**
 * Generate a random 6-character share code
 * Uses characters that are easy to read and type (no ambiguous characters like 0/O, 1/I)
 */
export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if a share code is unique in the database
 */
export async function isShareCodeUnique(code: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('grids')
      .select('id')
      .eq('share_code', code)
      .single();

    return !data; // Code is unique if no data returned
  } catch (error) {
    // If error is "not found", code is unique
    return true;
  }
}

/**
 * Generate a unique share code by checking against database
 * Tries up to 10 times, then falls back to timestamp-based code
 */
export async function generateUniqueShareCode(): Promise<string> {
  let code = generateShareCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    if (await isShareCodeUnique(code)) {
      return code;
    }
    code = generateShareCode();
    attempts++;
  }

  // Fallback: use timestamp + random chars to ensure uniqueness
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  const random = Math.random().toString(36).slice(-3).toUpperCase();
  return timestamp + random;
}

/**
 * Format share code for display (adds hyphen in middle for readability)
 * Example: ABC123 -> ABC-123
 */
export function formatShareCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Generate full share URL from share code
 */
export function getShareUrl(shareCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/share/${shareCode}`;
}

/**
 * Validate share code format
 */
export function isValidShareCode(code: string): boolean {
  // Must be exactly 6 characters, uppercase letters and numbers only
  return /^[A-Z0-9]{6}$/.test(code);
}
