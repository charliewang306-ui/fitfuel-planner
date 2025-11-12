/**
 * Reminder Scheduler - Intelligent daily reminder generation
 * 
 * Generates optimized meal and water reminders based on:
 * - Wake/sleep times
 * - Number of meals (3 main + 0-2 snacks)
 * - Water interval (2-3 hours)
 * - Quiet period (30min before/after sleep)
 */

export interface UserScheduleConfig {
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:00"
  snacksCount: number; // 0-2
  waterIntervalHours: number; // 2.0-3.0
  quietPeriodEnabled: boolean;
}

export interface ScheduledReminder {
  type: 'meal' | 'water' | 'snack';
  scheduledTime: string; // "HH:MM"
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight back to "HH:MM"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if time is within quiet period (30min before/after sleep)
 */
function isInQuietPeriod(
  timeMinutes: number,
  wakeMinutes: number,
  sleepMinutes: number,
  enabled: boolean
): boolean {
  if (!enabled) return false;
  
  const quietMargin = 30; // minutes
  const wakeStart = wakeMinutes - quietMargin;
  const wakeEnd = wakeMinutes + quietMargin;
  const sleepStart = sleepMinutes - quietMargin;
  const sleepEnd = sleepMinutes + quietMargin;
  
  // Check if within wake quiet period
  if (timeMinutes >= wakeStart && timeMinutes <= wakeEnd) return true;
  
  // Check if within sleep quiet period
  if (timeMinutes >= sleepStart && timeMinutes <= sleepEnd) return true;
  
  return false;
}

/**
 * Generate meal reminders (breakfast, lunch, dinner + snacks)
 */
function generateMealReminders(
  wakeMinutes: number,
  sleepMinutes: number,
  snacksCount: number,
  quietPeriodEnabled: boolean
): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];
  const awakeMinutes = sleepMinutes - wakeMinutes;
  
  // 3 main meals: breakfast, lunch, dinner
  // Breakfast: 30-60min after wake
  const breakfastTime = wakeMinutes + 45;
  
  // Lunch: midpoint of day
  const lunchTime = wakeMinutes + Math.floor(awakeMinutes * 0.45);
  
  // Dinner: 2-3 hours before sleep
  const dinnerTime = sleepMinutes - 150; // 2.5 hours before sleep
  
  reminders.push(
    { type: 'meal', scheduledTime: minutesToTime(breakfastTime), mealType: 'breakfast' },
    { type: 'meal', scheduledTime: minutesToTime(lunchTime), mealType: 'lunch' },
    { type: 'meal', scheduledTime: minutesToTime(dinnerTime), mealType: 'dinner' }
  );
  
  // Add snacks if requested
  if (snacksCount >= 1) {
    // Morning snack: between breakfast and lunch
    const morningSnackTime = breakfastTime + Math.floor((lunchTime - breakfastTime) * 0.6);
    if (!isInQuietPeriod(morningSnackTime, wakeMinutes, sleepMinutes, quietPeriodEnabled)) {
      reminders.push({ type: 'snack', scheduledTime: minutesToTime(morningSnackTime), mealType: 'snack' });
    }
  }
  
  if (snacksCount >= 2) {
    // Afternoon snack: between lunch and dinner
    const afternoonSnackTime = lunchTime + Math.floor((dinnerTime - lunchTime) * 0.6);
    if (!isInQuietPeriod(afternoonSnackTime, wakeMinutes, sleepMinutes, quietPeriodEnabled)) {
      reminders.push({ type: 'snack', scheduledTime: minutesToTime(afternoonSnackTime), mealType: 'snack' });
    }
  }
  
  return reminders.sort((a, b) => 
    parseTimeToMinutes(a.scheduledTime) - parseTimeToMinutes(b.scheduledTime)
  );
}

/**
 * Generate water reminders at regular intervals
 */
function generateWaterReminders(
  wakeMinutes: number,
  sleepMinutes: number,
  intervalHours: number,
  quietPeriodEnabled: boolean
): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];
  const intervalMinutes = intervalHours * 60;
  
  // Start first water reminder 1 hour after wake
  let currentTime = wakeMinutes + 60;
  
  while (currentTime < sleepMinutes - 60) {
    if (!isInQuietPeriod(currentTime, wakeMinutes, sleepMinutes, quietPeriodEnabled)) {
      reminders.push({
        type: 'water',
        scheduledTime: minutesToTime(currentTime)
      });
    }
    currentTime += intervalMinutes;
  }
  
  return reminders;
}

/**
 * Main function: Generate complete daily schedule
 */
export function generateDailyReminders(config: UserScheduleConfig): ScheduledReminder[] {
  const wakeMinutes = parseTimeToMinutes(config.wakeTime);
  const sleepMinutes = parseTimeToMinutes(config.sleepTime);
  
  // Validate times
  if (sleepMinutes <= wakeMinutes) {
    throw new Error('Sleep time must be after wake time');
  }
  
  // Generate meal and water reminders
  const mealReminders = generateMealReminders(
    wakeMinutes,
    sleepMinutes,
    config.snacksCount,
    config.quietPeriodEnabled
  );
  
  const waterReminders = generateWaterReminders(
    wakeMinutes,
    sleepMinutes,
    config.waterIntervalHours,
    config.quietPeriodEnabled
  );
  
  // Combine and sort by time
  const allReminders = [...mealReminders, ...waterReminders];
  allReminders.sort((a, b) => 
    parseTimeToMinutes(a.scheduledTime) - parseTimeToMinutes(b.scheduledTime)
  );
  
  return allReminders;
}

/**
 * Helper: Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}
