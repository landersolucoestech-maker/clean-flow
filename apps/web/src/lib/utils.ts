import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// TIMEZONE UTILITIES - EST (America/New_York)
// ============================================

export const SYSTEM_TIMEZONE = "America/New_York";

/**
 * Parse a date string (YYYY-MM-DD) correctly without timezone shift
 * Returns a Date object at noon in local time to avoid edge cases
 */
export function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Handle YYYY-MM-DD format directly to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create date at noon to avoid any edge cases with DST
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  
  // Fallback for other formats
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format a date in EST timezone
 */
export function formatDateInEST(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? parseDateString(date) : date;
  return d.toLocaleDateString("en-US", { 
    timeZone: SYSTEM_TIMEZONE,
    ...options 
  });
}

/**
 * Get current date/time in EST timezone
 */
export function getCurrentDateInEST(): Date {
  const now = new Date();
  const estString = now.toLocaleString("en-US", { timeZone: SYSTEM_TIMEZONE });
  return new Date(estString);
}

/**
 * Format date to YYYY-MM-DD string in EST
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display (e.g., "Jan 15, 2025")
 */
export function formatDateDisplay(date: Date | string): string {
  return formatDateInEST(date, { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
}

/**
 * Format date for long display (e.g., "January 15, 2025")
 */
export function formatDateLong(date: Date | string): string {
  return formatDateInEST(date, { 
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  });
}
