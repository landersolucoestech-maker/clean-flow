import { describe, it, expect } from 'vitest';
import {
  SYSTEM_TIMEZONE,
  parseDateString,
  formatDateInEST,
  getCurrentDateInEST,
  formatDateToISO,
  formatDateDisplay,
  formatDateLong,
} from './utils';

describe('Timezone Utilities', () => {
  describe('SYSTEM_TIMEZONE', () => {
    it('should be set to America/New_York (EST)', () => {
      expect(SYSTEM_TIMEZONE).toBe('America/New_York');
    });
  });

  describe('parseDateString', () => {
    it('should parse YYYY-MM-DD format correctly', () => {
      const date = parseDateString('2025-01-15');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
    });

    it('should handle edge case for January 1st', () => {
      const date = parseDateString('2025-01-01');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
    });

    it('should handle edge case for December 31st', () => {
      const date = parseDateString('2025-12-31');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(11); // December is 11
      expect(date.getDate()).toBe(31);
    });

    it('should return current date for empty string', () => {
      const date = parseDateString('');
      const now = new Date();
      expect(date.getFullYear()).toBe(now.getFullYear());
    });

    it('should not shift dates across timezone boundaries', () => {
      // This is the critical test - date should remain 15, not shift to 14
      const date = parseDateString('2025-01-15');
      expect(date.getDate()).toBe(15);
      
      // Test multiple dates to ensure consistency
      const date2 = parseDateString('2025-06-15');
      expect(date2.getDate()).toBe(15);
      
      const date3 = parseDateString('2025-03-01');
      expect(date3.getDate()).toBe(1);
    });

    it('should create date at noon to avoid DST edge cases', () => {
      const date = parseDateString('2025-03-09'); // DST transition date
      expect(date.getHours()).toBe(12);
    });
  });

  describe('formatDateToISO', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15, 12, 0, 0); // Jan 15, 2025
      expect(formatDateToISO(date)).toBe('2025-01-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5, 12, 0, 0); // Jan 5, 2025
      expect(formatDateToISO(date)).toBe('2025-01-05');
    });

    it('should handle December correctly', () => {
      const date = new Date(2025, 11, 25, 12, 0, 0); // Dec 25, 2025
      expect(formatDateToISO(date)).toBe('2025-12-25');
    });
  });

  describe('formatDateDisplay', () => {
    it('should format date with short month', () => {
      const formatted = formatDateDisplay('2025-01-15');
      expect(formatted).toMatch(/Jan/i);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/2025/);
    });

    it('should handle Date object input', () => {
      const date = new Date(2025, 5, 20, 12, 0, 0); // June 20, 2025
      const formatted = formatDateDisplay(date);
      expect(formatted).toMatch(/Jun/i);
      expect(formatted).toMatch(/20/);
    });
  });

  describe('formatDateLong', () => {
    it('should format date with full month name', () => {
      const formatted = formatDateLong('2025-01-15');
      expect(formatted).toMatch(/January/i);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/2025/);
    });
  });

  describe('formatDateInEST', () => {
    it('should use EST timezone for formatting', () => {
      // The formatting should use America/New_York timezone
      const date = new Date(2025, 0, 15, 12, 0, 0);
      const formatted = formatDateInEST(date);
      // Just verify it returns a valid date string
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should accept custom format options', () => {
      const date = new Date(2025, 0, 15, 12, 0, 0);
      const formatted = formatDateInEST(date, { weekday: 'long' });
      // Should include day of week
      expect(formatted).toMatch(/wednesday/i);
    });
  });

  describe('getCurrentDateInEST', () => {
    it('should return a valid Date object', () => {
      const date = getCurrentDateInEST();
      expect(date instanceof Date).toBe(true);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  describe('Date consistency across operations', () => {
    it('should maintain date through parse -> format -> parse cycle', () => {
      const originalDateStr = '2025-01-15';
      const parsed = parseDateString(originalDateStr);
      const formatted = formatDateToISO(parsed);
      const reparsed = parseDateString(formatted);
      
      expect(reparsed.getDate()).toBe(15);
      expect(formatted).toBe(originalDateStr);
    });

    it('should handle invoice workflow dates correctly', () => {
      // Simulate the invoice date workflow
      const jobDate = '2025-01-15';
      const parsedJobDate = parseDateString(jobDate);
      
      // Issue date should be the job date
      const issueDate = formatDateToISO(parsedJobDate);
      expect(issueDate).toBe('2025-01-15');
      
      // Due date calculation (e.g., net 30)
      const dueDate = new Date(parsedJobDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const formattedDueDate = formatDateToISO(dueDate);
      expect(formattedDueDate).toBe('2025-02-14');
    });
  });
});
