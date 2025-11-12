// Streak calculation utilities for daily completion tracking

// Default completion thresholds
const PROTEIN_OK = 0.90;  // ≥90%
const DEFAULT_KCAL_WINDOW = 0.10; // ±10%
const WATER_OK = 0.80;    // ≥80%

type DayInputs = {
  protein: number;
  proteinTarget: number;
  kcal: number;
  kcalTarget: number;
  water: number;
  waterTarget: number;
};

export type DayStatus = 'completed' | 'partial' | 'not';

export type StreakConfig = {
  waterMustMeet?: boolean;  // If true, water must be met for 'completed'
  kcalWindow?: number;      // Calorie tolerance: 0.08, 0.10, or 0.12
};

/**
 * Evaluates whether a day's nutrition meets completion criteria
 * @param d - Day's nutrition and target values
 * @param config - Optional configuration for streak rules
 * @returns 'completed' if all criteria met, 'partial' if 2/3 met, 'not' otherwise
 */
export function evaluateDay(d: DayInputs, config?: StreakConfig): DayStatus {
  const kcalWindow = config?.kcalWindow ?? DEFAULT_KCAL_WINDOW;
  const waterMustMeet = config?.waterMustMeet ?? false;
  
  const p_ok = d.protein >= d.proteinTarget * PROTEIN_OK;
  const kcal_ok = Math.abs(d.kcal - d.kcalTarget) <= d.kcalTarget * kcalWindow;
  const water_ok = d.water >= d.waterTarget * WATER_OK;

  // If waterMustMeet is enabled, all three must be met for completion
  if (waterMustMeet) {
    if (p_ok && kcal_ok && water_ok) return 'completed';
  } else {
    // Standard: protein + calories = completed (water is bonus)
    if (p_ok && kcal_ok) return 'completed';
  }
  
  // Partial: at least 2/3 criteria met
  const okCount = [p_ok, kcal_ok, water_ok].filter(Boolean).length;
  if (okCount >= 2) return 'partial';
  return 'not';
}

/**
 * Calculates streak from an array of day statuses
 * @param statuses - Array of day statuses from today to past (descending order)
 * @param strictMode - If true, 'partial' status breaks streak (treated as 'not')
 * @returns Number of consecutive completed days
 */
export function calcStreak(statuses: Array<DayStatus>, strictMode: boolean = false): number {
  let streak = 0;
  for (const s of statuses) {
    if (s === 'completed') {
      streak++;
      continue;
    }
    if (s === 'partial') {
      if (strictMode) {
        break; // In strict mode, partial breaks streak
      }
      continue; // In normal mode, partial doesn't increase but doesn't break
    }
    break; // 'not' breaks the streak
  }
  return streak;
}

/**
 * Alternative streak calculation using daily_status records
 * @param days - Array of {day, completed} objects, sorted by day descending (today -> past)
 * @returns Number of consecutive completed days
 */
export function calcStreakFromRecords(
  days: Array<{ day: string; completed: boolean }>
): number {
  let streak = 0;
  for (const d of days) {
    if (d.completed) streak++;
    else break;
  }
  return streak;
}
