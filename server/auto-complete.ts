/**
 * Auto-completion logic for daily status
 * Triggers when:
 * 1. Before sleep (30min before sleep + 90min since last log)
 * 2. Macro goals met (protein ≥85%, calories ≥80%, water 60-120% + 90min since last log)
 * 3. Day rollover (03:00 local time next day)
 */

import { db } from './db';
import { dailyStatus, dailyTargets, foodLogs, waterLogs, userProfiles } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

interface AutoCompleteContext {
  userId: string;
  day: string; // YYYY-MM-DD
  now: Date; // Current server time
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current local time in Denver timezone as minutes since midnight
 */
function getCurrentDenverMinutes(now: Date): number {
  // Convert to Denver timezone (America/Denver)
  const denverTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }));
  return denverTime.getHours() * 60 + denverTime.getMinutes();
}

/**
 * Get last log timestamp from food or water logs
 */
async function getLastLogTime(userId: string, day: string): Promise<Date | null> {
  // Get latest food log for this day
  const [latestFood] = await db
    .select({ datetime: foodLogs.datetime })
    .from(foodLogs)
    .where(and(
      eq(foodLogs.userId, userId),
      sql`DATE(${foodLogs.datetime}) = ${day}`
    ))
    .orderBy(desc(foodLogs.datetime))
    .limit(1);

  // Get latest water log for this day
  const [latestWater] = await db
    .select({ datetime: waterLogs.datetime })
    .from(waterLogs)
    .where(and(
      eq(waterLogs.userId, userId),
      sql`DATE(${waterLogs.datetime}) = ${day}`
    ))
    .orderBy(desc(waterLogs.datetime))
    .limit(1);

  const foodTime = latestFood?.datetime;
  const waterTime = latestWater?.datetime;

  if (!foodTime && !waterTime) return null;
  if (!foodTime) return waterTime!;
  if (!waterTime) return foodTime;

  return foodTime > waterTime ? foodTime : waterTime;
}

/**
 * Get current day's nutrition intake
 */
async function getCurrentIntake(userId: string, day: string) {
  // Get food intake for this day
  const foodIntake = await db
    .select({
      totalKcal: sql<number>`COALESCE(SUM(${foodLogs.kcal}), 0)`,
      totalProtein: sql<number>`COALESCE(SUM(${foodLogs.proteinG}), 0)`,
    })
    .from(foodLogs)
    .where(and(
      eq(foodLogs.userId, userId),
      sql`DATE(${foodLogs.datetime}) = ${day}`
    ));

  // Get water intake for this day (using effectiveOz for hydration calculation)
  const waterIntake = await db
    .select({
      totalWater: sql<number>`COALESCE(SUM(${waterLogs.effectiveOz}), 0)`,
    })
    .from(waterLogs)
    .where(and(
      eq(waterLogs.userId, userId),
      sql`DATE(${waterLogs.datetime}) = ${day}`
    ));

  return {
    kcal: Number(foodIntake[0]?.totalKcal || 0),
    protein: Number(foodIntake[0]?.totalProtein || 0),
    water: Number(waterIntake[0]?.totalWater || 0),
  };
}

/**
 * Check if daily status should be auto-completed
 * Returns reason if should complete, null otherwise
 */
export async function checkAutoComplete(ctx: AutoCompleteContext): Promise<'sleep' | 'macro_ok' | null> {
  const { userId, day, now } = ctx;

  // Get user profile
  const [user] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  if (!user) return null;

  // Get daily targets
  const [targets] = await db
    .select()
    .from(dailyTargets)
    .where(and(
      eq(dailyTargets.userId, userId),
      eq(dailyTargets.date, day)
    ))
    .limit(1);

  if (!targets) return null;

  // Check if already completed
  const [status] = await db
    .select()
    .from(dailyStatus)
    .where(and(
      eq(dailyStatus.userId, userId),
      eq(dailyStatus.day, day)
    ))
    .limit(1);

  if (status?.completed) return null;

  // Get last log time
  const lastLogTime = await getLastLogTime(userId, day);
  if (!lastLogTime) return null; // No logs yet, can't auto-complete

  // Check if 90 minutes since last log
  const minutesSinceLastLog = (now.getTime() - lastLogTime.getTime()) / 1000 / 60;
  if (minutesSinceLastLog < 90) return null;

  // Get current intake
  const intake = await getCurrentIntake(userId, day);

  // Condition 2: Macro goals met
  const calRatio = intake.kcal / targets.kcal;
  const proRatio = intake.protein / targets.proteinG;
  const waterOk = intake.water >= targets.waterOz * 0.6 && intake.water <= targets.waterOz * 1.2;

  if (proRatio >= 0.85 && calRatio >= 0.80 && waterOk) {
    return 'macro_ok';
  }

  // Condition 1: Before sleep
  const currentMinutes = getCurrentDenverMinutes(now);
  const sleepMinutes = parseTimeToMinutes(user.sleepTime);
  const sleepThreshold = sleepMinutes - 30; // 30 min before sleep

  // Handle sleep time crossing midnight (e.g., 01:00)
  let beforeSleep = false;
  
  if (sleepMinutes < 180) {
    // Sleep time is 00:00-03:00 (crosses midnight)
    // sleepThreshold might be negative (e.g., sleepTime=00:15 -> threshold=-15)
    if (sleepThreshold < 0) {
      // Window spans previous day: [23:30-24:00) or [00:00-sleepMinutes)
      const adjustedThreshold = 1440 + sleepThreshold; // Convert negative to previous day
      beforeSleep = currentMinutes >= adjustedThreshold || currentMinutes < sleepMinutes;
    } else {
      // Window is entirely after midnight: [sleepThreshold-sleepMinutes)
      beforeSleep = currentMinutes >= sleepThreshold && currentMinutes < sleepMinutes;
    }
  } else {
    // Normal sleep time (after 03:00), window doesn't cross midnight
    beforeSleep = currentMinutes >= sleepThreshold && currentMinutes < sleepMinutes + 60;
  }

  if (beforeSleep) {
    return 'sleep';
  }

  return null;
}

/**
 * Mark daily status as auto-completed
 */
export async function markAutoComplete(
  userId: string,
  day: string,
  reason: 'sleep' | 'macro_ok' | 'day_rollover'
): Promise<void> {
  const now = new Date();

  // Check if record exists
  const [existing] = await db
    .select()
    .from(dailyStatus)
    .where(and(
      eq(dailyStatus.userId, userId),
      eq(dailyStatus.day, day)
    ))
    .limit(1);

  if (existing) {
    // Update existing record
    await db
      .update(dailyStatus)
      .set({
        completed: true,
        completedAt: now,
        autoCompleted: true,
        autodoneReason: reason,
        updatedAt: now,
      })
      .where(eq(dailyStatus.id, existing.id));
  } else {
    // Create new record
    await db.insert(dailyStatus).values({
      userId,
      day,
      completed: true,
      completedAt: now,
      autoCompleted: true,
      autodoneReason: reason,
    });
  }

  console.log(`[AutoComplete] User ${userId} day ${day} auto-completed: ${reason}`);
}

/**
 * Run auto-complete check and mark if needed
 */
export async function runAutoCompleteCheck(userId: string, day: string): Promise<boolean> {
  const now = new Date();
  const reason = await checkAutoComplete({ userId, day, now });

  if (reason) {
    await markAutoComplete(userId, day, reason);
    return true;
  }

  return false;
}
