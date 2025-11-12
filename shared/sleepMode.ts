/**
 * Sleep-aware meal scheduling system
 * Implements night mode, pre-sleep cutoff window, and automatic meal rescheduling
 */

import { addMinutes, subMinutes, differenceInMinutes } from 'date-fns';

export interface UserSleepConfig {
  wakeTime: string;  // HH:MM format (e.g., "07:00")
  sleepTime: string; // HH:MM format (e.g., "23:00")
  preSleepCutoffHours: number; // Hours before sleep to stop eating (default: 2.5)
  nightModeBufferMin: number;  // Minutes before sleep to enter night mode (default: 90)
  lastReminderBufferMin: number; // Minutes before sleep for last reminder (default: 60)
  allowLightProteinAfterCutoff: boolean; // Allow light protein in cutoff window (default: true)
  autoRescheduleMeals: boolean; // Auto-adjust meals to avoid cutoff (default: true)
  minGapBetweenMealsMin: number; // Minimum gap between meals in minutes (default: 120)
}

export interface EatingWindow {
  start: Date;  // Wake time (local time)
  end: Date;    // Sleep time - preSleepCutoffHours (local time)
  durationHours: number; // Total eating window in hours
}

export interface TimeMode {
  mode: 'normal' | 'night' | 'cutoff';  // Current time mode
  message: string; // User-facing message (Chinese)
  messageEn: string; // User-facing message (English)
}

export interface MealSchedule {
  breakfast: Date;
  lunch: Date;
  dinner: Date;
  snack1?: Date; // Optional first snack
  snack2?: Date; // Optional second snack
}

/**
 * Parse HH:MM time string to Date object (today in local time)
 */
export function parseTimeToday(timeStr: string): Date {
  const now = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return localDate;
}

/**
 * Calculate the eating window for today
 */
export function calculateEatingWindow(config: UserSleepConfig): EatingWindow {
  const wakeDate = parseTimeToday(config.wakeTime);
  const sleepDate = parseTimeToday(config.sleepTime);
  
  // If sleep time is earlier than wake time, it's next day
  if (sleepDate < wakeDate) {
    sleepDate.setDate(sleepDate.getDate() + 1);
  }
  
  // BUG FIX: Use subMinutes with hours*60 to preserve fractional hours (e.g., 2.5h = 150min)
  const eatEnd = subMinutes(sleepDate, config.preSleepCutoffHours * 60);
  const durationHours = differenceInMinutes(eatEnd, wakeDate) / 60;
  
  return {
    start: wakeDate,
    end: eatEnd,
    durationHours
  };
}

/**
 * Determine current time mode (normal, night, or cutoff)
 */
export function getCurrentTimeMode(config: UserSleepConfig, now: Date = new Date()): TimeMode {
  const sleepDate = parseTimeToday(config.sleepTime);
  if (sleepDate < now) {
    sleepDate.setDate(sleepDate.getDate() + 1);
  }
  
  // BUG FIX: Use subMinutes with hours*60 to preserve fractional hours
  const cutoffStart = subMinutes(sleepDate, config.preSleepCutoffHours * 60);
  const nightModeStart = addMinutes(sleepDate, -config.nightModeBufferMin);
  
  if (now >= cutoffStart) {
    // In cutoff window
    return {
      mode: 'cutoff',
      message: '已进入睡前禁食窗口。为了睡眠与代谢，不建议再进食。如有强烈饥饿，可选择"轻蛋白小补"。',
      messageEn: 'In pre-sleep fasting window. Avoid eating for better sleep and metabolism. If very hungry, choose light protein only.'
    };
  } else if (now >= nightModeStart) {
    // In night mode (but before cutoff)
    return {
      mode: 'night',
      message: '已接近休息时间：建议只补关键营养（优先蛋白，低脂易消化），其余留到明天早/午温和校正。',
      messageEn: 'Approaching sleep time: Focus on essential nutrients (protein priority, low-fat, easy to digest). Leave the rest for tomorrow.'
    };
  } else {
    // Normal time
    return {
      mode: 'normal',
      message: '',
      messageEn: ''
    };
  }
}

/**
 * Generate optimal meal schedule based on eating window
 * Distributes meals evenly within the eating window with minimum gaps
 */
export function generateMealSchedule(
  config: UserSleepConfig,
  snacksCount: number = 0 // 0, 1, or 2 snacks
): MealSchedule {
  const window = calculateEatingWindow(config);
  const minGapMin = config.minGapBetweenMealsMin;
  
  // Calculate total meals: breakfast + lunch + dinner + snacks
  const totalMeals = 3 + snacksCount;
  
  // Calculate ideal gap between meals
  const windowMinutes = differenceInMinutes(window.end, window.start);
  const idealGapMin = Math.max(windowMinutes / totalMeals, minGapMin);
  
  // Fixed offsets from wake time (legacy system for backward compatibility)
  // But now we validate they don't violate cutoff window
  const breakfast = addMinutes(window.start, 45); // Wake + 45min
  const lunch = addMinutes(window.start, 300);    // Wake + 5h
  const dinner = addMinutes(window.start, 570);   // Wake + 9.5h
  
  const schedule: MealSchedule = {
    breakfast: validateMealTime(breakfast, window, config.autoRescheduleMeals),
    lunch: validateMealTime(lunch, window, config.autoRescheduleMeals),
    dinner: validateMealTime(dinner, window, config.autoRescheduleMeals)
  };
  
  // Add snacks between meals
  if (snacksCount >= 1) {
    // Snack 1: between breakfast and lunch (2.75h from wake)
    const snack1 = addMinutes(window.start, 165);
    schedule.snack1 = validateMealTime(snack1, window, config.autoRescheduleMeals);
  }
  
  if (snacksCount >= 2) {
    // Snack 2: between lunch and dinner (7h from wake)
    const snack2 = addMinutes(window.start, 420);
    schedule.snack2 = validateMealTime(snack2, window, config.autoRescheduleMeals);
  }
  
  return schedule;
}

/**
 * Validate meal time doesn't fall into cutoff window
 * If it does and autoReschedule is enabled, move it earlier to fit within eating window
 * BUG FIX: Honor autoRescheduleMeals flag
 */
function validateMealTime(mealTime: Date, window: EatingWindow, autoReschedule: boolean): Date {
  if (mealTime > window.end) {
    if (autoReschedule) {
      // Meal is after cutoff, move it to 30 min before cutoff
      return addMinutes(window.end, -30);
    }
    // If auto-reschedule disabled, keep original time (user's responsibility)
  }
  return mealTime;
}

/**
 * Check if a specific time is in the night mode window
 */
export function isInNightMode(config: UserSleepConfig, time: Date = new Date()): boolean {
  const mode = getCurrentTimeMode(config, time);
  return mode.mode === 'night' || mode.mode === 'cutoff';
}

/**
 * Check if a specific time is in the cutoff window
 */
export function isInCutoffWindow(config: UserSleepConfig, time: Date = new Date()): boolean {
  const mode = getCurrentTimeMode(config, time);
  return mode.mode === 'cutoff';
}

/**
 * Light protein foods allowed during cutoff window
 */
export const LIGHT_PROTEIN_FOODS = [
  'protein_powder',   // Protein powder with water
  'egg_white',        // Egg whites
  'skim_milk',        // Skim milk (small serving)
  'greek_yogurt_plain', // Plain Greek yogurt (unsweetened, low-fat)
  'tofu',             // Soft tofu
  'soy_milk_unsweetened', // Unsweetened soy milk
  'whey_protein',     // Whey protein isolate
  'chicken_breast_small' // Very small portion of lean chicken breast
];

/**
 * Foods to filter out during night mode (high-fat, high-sugar, hard to digest)
 */
export const NIGHT_MODE_EXCLUDED_CATEGORIES = [
  'fried',         // Fried foods
  'high_fat',      // High-fat foods
  'high_sugar',    // High-sugar foods
  'nuts',          // Nuts (high fat)
  'cheese',        // Cheese (high fat)
  'red_meat',      // Red meat (hard to digest)
  'processed',     // Processed foods
  'dessert',       // Desserts
  'fast_food'      // Fast food
];

/**
 * Check if a food is allowed during night mode
 * Night mode allows: lean protein, low-fat dairy, easy-to-digest carbs
 */
export function isAllowedInNightMode(food: any): boolean {
  // Allow foods with: high protein, low fat, low fiber
  const proteinPer100g = food.proteinG || 0;
  const fatPer100g = food.fatG || 0;
  const fiberPer100g = food.fiberG || 0;
  
  // Good protein source (>10g per 100g) and low fat (<5g per 100g)
  const isLeanProtein = proteinPer100g > 10 && fatPer100g < 5;
  
  // Low-fat dairy (>3g protein, <3g fat per 100g)
  const isLowFatDairy = proteinPer100g > 3 && fatPer100g < 3;
  
  // Low fiber (<3g per 100g) - easier to digest
  const isEasyDigest = fiberPer100g < 3;
  
  return (isLeanProtein || isLowFatDairy) && isEasyDigest;
}

/**
 * Check if a food is allowed during cutoff window (light protein only)
 */
export function isAllowedInCutoffWindow(food: any): boolean {
  // Only allow very lean protein with minimal fat
  const proteinPer100g = food.proteinG || 0;
  const fatPer100g = food.fatG || 0;
  const carbsPer100g = food.carbsG || 0;
  
  // Must be high protein (>15g), very low fat (<2g), low carbs (<10g)
  return proteinPer100g > 15 && fatPer100g < 2 && carbsPer100g < 10;
}

/**
 * Scale meal portion for late-night meals (reduce by 20-40%)
 */
export function scaleLateNightPortion(originalGrams: number, minutesBeforeCutoff: number): number {
  if (minutesBeforeCutoff < 30) {
    // Very close to cutoff: 60% of original
    return originalGrams * 0.6;
  } else if (minutesBeforeCutoff < 60) {
    // Close to cutoff: 80% of original
    return originalGrams * 0.8;
  }
  return originalGrams; // Normal portion
}
