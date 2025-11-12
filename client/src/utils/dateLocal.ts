/**
 * Local timezone date utilities
 * Handles date rollover at device local midnight (00:00)
 * Automatically handles DST (Daylight Saving Time) transitions
 */

/**
 * Get device's current IANA timezone (e.g., "America/Denver", "Asia/Shanghai")
 */
export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get local date key in YYYY-MM-DD format
 * Uses device timezone, unaffected by DST
 * @param d - Date object (defaults to now)
 * @returns YYYY-MM-DD string (e.g., "2025-11-02")
 */
export function localDateKey(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getLocalTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  
  return `${y}-${m}-${day}`;
}

/**
 * Calculate milliseconds until next local midnight
 * Automatically handles DST transitions
 * @param now - Current date (defaults to now)
 * @returns milliseconds until next local 00:00:00
 */
export function msUntilNextLocalMidnight(now = new Date()): number {
  // Get current local date as YYYY-MM-DD
  const todayKey = localDateKey(now);
  const [year, month, day] = todayKey.split('-').map(Number);
  
  // Create tomorrow's date by incrementing day (handles month/year boundaries automatically)
  const tomorrowMidnight = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  
  const ms = tomorrowMidnight.getTime() - now.getTime();
  
  // Validation: result should be between 0 and 26 hours (accounting for DST spring forward)
  // During DST "fall back", a day is 25 hours; during "spring forward", it's 23 hours
  if (ms < 0 || ms > 26 * 60 * 60 * 1000) {
    console.error('[dateLocal] Invalid midnight calculation - possible timezone issue:', {
      now: now.toLocaleString(),
      nowISO: now.toISOString(),
      todayKey,
      tomorrowMidnight: tomorrowMidnight.toLocaleString(),
      calculatedMs: ms,
      calculatedHours: Math.round(ms / 1000 / 60 / 60 * 10) / 10
    });
    // Return safe fallback: check again in 1 hour
    return 60 * 60 * 1000;
  }
  
  return ms;
}

/**
 * Check if two dates are the same local day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if both dates are on the same local day
 */
export function isSameLocalDay(date1: Date, date2: Date): boolean {
  return localDateKey(date1) === localDateKey(date2);
}

/**
 * Get start of local day (00:00:00.000 in local timezone)
 * @param d - Date object (defaults to now)
 * @returns Date object at start of local day
 */
export function startOfLocalDay(d = new Date()): Date {
  const dayKey = localDateKey(d);
  const [year, month, day] = dayKey.split('-').map(Number);
  const result = new Date();
  result.setFullYear(year, month - 1, day);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of local day (23:59:59.999 in local timezone)
 * @param d - Date object (defaults to now)
 * @returns Date object at end of local day
 */
export function endOfLocalDay(d = new Date()): Date {
  const dayKey = localDateKey(d);
  const [year, month, day] = dayKey.split('-').map(Number);
  const result = new Date();
  result.setFullYear(year, month - 1, day);
  result.setHours(23, 59, 59, 999);
  return result;
}
