/**
 * Server-side Task Scheduler
 * 
 * Runs daily maintenance tasks at 0:05 AM:
 * 1. Archive yesterday's missed reminders
 * 2. Clear today's old data
 * 3. Generate fresh reminders for today
 */

import { storage } from "./storage";
import { 
  generateMealSchedule, 
  calculateEatingWindow, 
  getCurrentTimeMode,
  type UserSleepConfig 
} from "@shared/sleepMode";
import { runAutoCompleteCheck, markAutoComplete } from "./auto-complete";

interface UserScheduleConfig extends UserSleepConfig {
  snacksCount: number;
  waterIntervalHours: number;
  quietPeriodEnabled: boolean;
}

interface ScheduledReminder {
  type: 'meal' | 'water' | 'snack' | 'ai_evening' | 'ai_morning';
  scheduledTime: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

// Helper: Parse time string "HH:MM" to minutes since midnight
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert minutes since midnight back to "HH:MM"
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Check if time is within quiet period (30min before/after sleep)
function isInQuietPeriod(
  timeMinutes: number,
  wakeMinutes: number,
  sleepMinutes: number,
  enabled: boolean
): boolean {
  if (!enabled) return false;
  
  const quietMargin = 30;
  const wakeStart = wakeMinutes - quietMargin;
  const wakeEnd = wakeMinutes + quietMargin;
  const sleepStart = sleepMinutes - quietMargin;
  const sleepEnd = sleepMinutes + quietMargin;
  
  if (timeMinutes >= wakeStart && timeMinutes <= wakeEnd) return true;
  if (timeMinutes >= sleepStart && timeMinutes <= sleepEnd) return true;
  
  return false;
}

// Generate meal reminders (breakfast, lunch, dinner + snacks)
// Uses sleep-aware scheduling to avoid cutoff window
function generateMealReminders(
  config: UserScheduleConfig
): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];
  
  // Generate meal schedule using sleep mode logic (avoids cutoff window)
  const mealSchedule = generateMealSchedule(config, config.snacksCount);
  
  // Helper: Convert Date to HH:MM format
  const dateToTimeString = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Add main meals (always included)
  reminders.push(
    { type: 'meal', scheduledTime: dateToTimeString(mealSchedule.breakfast), mealType: 'breakfast' },
    { type: 'meal', scheduledTime: dateToTimeString(mealSchedule.lunch), mealType: 'lunch' },
    { type: 'meal', scheduledTime: dateToTimeString(mealSchedule.dinner), mealType: 'dinner' }
  );
  
  // Add snacks if configured
  if (mealSchedule.snack1) {
    reminders.push({ type: 'snack', scheduledTime: dateToTimeString(mealSchedule.snack1), mealType: 'snack' });
  }
  
  if (mealSchedule.snack2) {
    reminders.push({ type: 'snack', scheduledTime: dateToTimeString(mealSchedule.snack2), mealType: 'snack' });
  }
  
  return reminders.sort((a, b) => 
    parseTimeToMinutes(a.scheduledTime) - parseTimeToMinutes(b.scheduledTime)
  );
}

// Generate water reminders at regular intervals
// 喝水提醒：从 wakeTime + 15分钟 开始，每 2.5 小时一次
function generateWaterReminders(
  wakeMinutes: number,
  sleepMinutes: number,
  intervalHours: number,
  quietPeriodEnabled: boolean,
  maxReminders: number = -1 // -1 means unlimited
): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];
  // 固定每 2.5 小时一次
  const intervalMinutes = 150; // 2.5 hours = 150 minutes
  
  // 从 wakeTime + 15 分钟开始
  let currentTime = wakeMinutes + 15;
  
  while (currentTime < sleepMinutes - 30) {
    // Check if we've reached the limit (if maxReminders is set)
    if (maxReminders > 0 && reminders.length >= maxReminders) {
      break;
    }
    
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

// Generate AI-powered reminders based on user's wake/sleep schedule
function generateAIReminders(wakeMinutes: number, sleepMinutes: number): ScheduledReminder[] {
  const reminders: ScheduledReminder[] = [];
  
  // AI Morning Reminder: Same time as wake time
  // Purpose: Morning summary + breakfast motivation
  reminders.push({
    type: 'ai_morning',
    scheduledTime: minutesToTime(wakeMinutes)
  });
  
  // AI Evening Reminder: 2 hours before sleep
  // Purpose: Evening nutrition advice for dinner
  const eveningTime = sleepMinutes - 120; // 2 hours before sleep
  reminders.push({
    type: 'ai_evening',
    scheduledTime: minutesToTime(eveningTime)
  });
  
  return reminders;
}

export function generateDailyReminders(
  config: UserScheduleConfig & { waterRemindersPerDay?: number }
): ScheduledReminder[] {
  const wakeMinutes = parseTimeToMinutes(config.wakeTime);
  let sleepMinutes = parseTimeToMinutes(config.sleepTime);
  
  // Handle cross-midnight schedules
  if (sleepMinutes <= wakeMinutes) {
    sleepMinutes += 24 * 60;
  }
  
  // Use sleep-aware meal generation (avoids cutoff window)
  const mealReminders = generateMealReminders(config);
  
  // Use user's waterRemindersPerDay setting instead of subscription limit
  const maxWaterReminders = config.waterRemindersPerDay ?? 8;
  
  const waterReminders = generateWaterReminders(
    wakeMinutes,
    sleepMinutes,
    config.waterIntervalHours,
    config.quietPeriodEnabled,
    maxWaterReminders
  );
  
  const aiReminders = generateAIReminders(wakeMinutes, sleepMinutes);
  
  const allReminders = [...mealReminders, ...waterReminders, ...aiReminders];
  allReminders.sort((a, b) => 
    parseTimeToMinutes(a.scheduledTime) - parseTimeToMinutes(b.scheduledTime)
  );
  
  return allReminders;
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Get yesterday's date in YYYY-MM-DD format
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// Mark overdue reminders as 'missed'
export async function markMissedReminders() {
  try {
    const DEMO_USER_ID = 'demo-user-1';
    const today = getTodayDate();
    
    // Get today's reminders
    const reminders = await storage.getRemindersByDate(DEMO_USER_ID, today);
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentMinutes = parseTimeToMinutes(currentTime);
    
    let markedCount = 0;
    for (const reminder of reminders) {
      // Only mark pending and delayed reminders that are overdue
      if ((reminder.status === 'pending' || reminder.status === 'delayed') && reminder.date === today) {
        const scheduledMinutes = parseTimeToMinutes(reminder.scheduledTime);
        
        // If scheduled time has passed (with 5-minute grace period)
        if (currentMinutes > scheduledMinutes + 5) {
          await storage.updateReminder(reminder.id, { status: 'missed' });
          markedCount++;
        }
      }
    }
    
    if (markedCount > 0) {
      console.log(`[Scheduler] Marked ${markedCount} overdue reminders as missed`);
    }
  } catch (error: any) {
    console.error('[Scheduler] Failed to mark missed reminders:', error.message);
  }
}

// Auto-complete check (runs every 15 minutes)
export async function runAutoCompleteCheckForAll() {
  try {
    // Get all users (in production, iterate through actual users)
    const DEMO_USER_ID = 'demo-user-1';
    const user = await storage.getUserProfile(DEMO_USER_ID);
    
    if (!user) {
      return;
    }
    
    const today = getTodayDate();
    await runAutoCompleteCheck(user.id, today);
  } catch (error: any) {
    console.error('[Scheduler] Auto-complete check failed:', error.message);
  }
}

// Day rollover check (runs at 03:00 AM local time)
export async function runDayRolloverCheck() {
  console.log('[Scheduler] Running day rollover check at', new Date().toISOString());
  
  try {
    // Get all users (in production, iterate through actual users)
    const DEMO_USER_ID = 'demo-user-1';
    const user = await storage.getUserProfile(DEMO_USER_ID);
    
    if (!user) {
      return;
    }
    
    // Get yesterday's date (the day that just ended)
    const yesterday = getYesterdayDate();
    
    // Check if yesterday is not completed, auto-complete it
    const { db } = await import('./db');
    const { dailyStatus } = await import('@shared/schema');
    const { and, eq } = await import('drizzle-orm');
    
    const [status] = await db
      .select()
      .from(dailyStatus)
      .where(and(
        eq(dailyStatus.userId, user.id),
        eq(dailyStatus.day, yesterday)
      ))
      .limit(1);
    
    if (!status || !status.completed) {
      await markAutoComplete(user.id, yesterday, 'day_rollover');
      console.log(`[Scheduler] Day rollover: auto-completed ${yesterday} for ${user.id}`);
    }
  } catch (error: any) {
    console.error('[Scheduler] Day rollover check failed:', error.message);
  }
}

// Daily maintenance task (runs at 0:05 AM)
export async function runDailyMaintenance() {
  console.log('[Scheduler] Running daily maintenance at', new Date().toISOString());
  
  try {
    // Get all users (in production, iterate through actual users)
    // For now, we only have the demo user
    const DEMO_USER_ID = 'demo-user-1';
    const user = await storage.getUserProfile(DEMO_USER_ID);
    
    if (!user) {
      console.log('[Scheduler] No users found, skipping maintenance');
      return;
    }
    
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    
    console.log(`[Scheduler] Processing user: ${user.id}`);
    console.log(`[Scheduler] Today: ${today}, Yesterday: ${yesterday}`);
    
    // Step 0: Mark any overdue reminders from today as missed
    await markMissedReminders();
    
    // Step 1: Archive yesterday's missed reminders (soft delete by updating status)
    // In a real system, we'd mark them as "archived" or move to history table
    await storage.deleteRemindersByDate(user.id, yesterday);
    console.log(`[Scheduler] Archived yesterday's reminders for ${user.id}`);
    
    // Step 2: Delete today's existing reminders (in case of regeneration)
    await storage.deleteRemindersByDate(user.id, today);
    console.log(`[Scheduler] Cleared today's old reminders for ${user.id}`);
    
    // Step 3: Generate fresh reminders for today
    const config = {
      wakeTime: user.wakeTime || '07:00',
      sleepTime: user.sleepTime || '23:00',
      preSleepCutoffHours: user.preSleepCutoffHours || 2.5,
      nightModeBufferMin: user.nightModeBufferMin || 90,
      lastReminderBufferMin: user.lastReminderBufferMin || 60,
      allowLightProteinAfterCutoff: user.allowLightProteinAfterCutoff !== false, // Default true
      autoRescheduleMeals: user.autoRescheduleMeals !== false, // Default true
      minGapBetweenMealsMin: user.minGapBetweenMealsMin || 120,
      snacksCount: user.snacksCount || 0,
      waterIntervalHours: user.waterIntervalHours || 2.5,
      quietPeriodEnabled: user.quietPeriodEnabled || false,
      waterRemindersPerDay: user.waterRemindersPerDay || 8, // Use user's setting instead of subscription limit
    };
    
    const reminders = generateDailyReminders(config);
    console.log(`[Scheduler] Generated ${reminders.length} reminders for ${user.id} (Water reminders: ${config.waterRemindersPerDay}/day)`);
    
    // Insert new reminders into database
    for (const reminder of reminders) {
      await storage.createReminder({
        userId: user.id,
        type: reminder.type,
        scheduledTime: reminder.scheduledTime,
        date: today,
        status: 'pending',
      });
    }
    
    console.log(`[Scheduler] Successfully generated ${reminders.length} reminders for ${today}`);
    
    // Step 4: Check OAuth integration token expiry
    await checkIntegrationTokenExpiry();
  } catch (error: any) {
    console.error('[Scheduler] Daily maintenance failed:', error.message);
  }
}

// Check if OAuth integration tokens (Apple/Google JWT) are expiring soon
async function checkIntegrationTokenExpiry() {
  try {
    const { db } = await import('./db');
    const { integrationTokens } = await import('@shared/schema');
    
    const tokens = await db
      .select()
      .from(integrationTokens);
    
    const now = new Date();
    
    for (const token of tokens) {
      const daysUntilExpiry = Math.floor((token.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const providerName = token.provider === 'apple' ? 'Apple OAuth' : 'Google OAuth';
      
      // Check if expired
      if (daysUntilExpiry < 0) {
        console.error(`[Scheduler] ⚠️  CRITICAL: ${providerName} JWT has EXPIRED ${Math.abs(daysUntilExpiry)} days ago!`);
        console.error(`[Scheduler] ⚠️  Users cannot login with ${providerName} until JWT is regenerated`);
        // Could send email/notification here
        continue;
      }
      
      // Check if within warning window (30 days or 7 days)
      let shouldWarn = false;
      let warningLevel = '';
      
      if (daysUntilExpiry <= 7) {
        shouldWarn = true;
        warningLevel = 'URGENT';
      } else if (daysUntilExpiry <= 30) {
        shouldWarn = true;
        warningLevel = 'WARNING';
      }
      
      if (shouldWarn) {
        // Check if we've warned recently (don't spam daily)
        const daysSinceLastWarn = token.lastWarnedAt 
          ? Math.floor((now.getTime() - token.lastWarnedAt.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        // Warn once per week for 30-day warning, daily for 7-day warning
        const shouldSendWarning = (warningLevel === 'URGENT') || (daysSinceLastWarn >= 7);
        
        if (shouldSendWarning) {
          console.warn(`[Scheduler] ⚠️  ${warningLevel}: ${providerName} JWT expires in ${daysUntilExpiry} days!`);
          console.warn(`[Scheduler] ⚠️  Regenerate JWT before ${token.expiresAt.toISOString().split('T')[0]}`);
          
          // Update lastWarnedAt
          const { eq } = await import('drizzle-orm');
          await db
            .update(integrationTokens)
            .set({ lastWarnedAt: now })
            .where(eq(integrationTokens.id, token.id));
        }
      } else {
        console.log(`[Scheduler] ✅ ${providerName} JWT: ${daysUntilExpiry} days remaining`);
      }
    }
  } catch (error: any) {
    console.error('[Scheduler] Integration token expiry check failed:', error.message);
  }
}

// Calculate milliseconds until next 0:05 AM
function getMillisecondsUntilNextRun(): number {
  const now = new Date();
  const next = new Date();
  
  // Set to today's 0:05 AM
  next.setHours(0, 5, 0, 0);
  
  // If we've passed 0:05 today, schedule for tomorrow
  if (now > next) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.getTime() - now.getTime();
}

// Start the scheduler
export function startScheduler() {
  console.log('[Scheduler] Starting daily task scheduler...');
  
  // Schedule first run
  const msUntilNext = getMillisecondsUntilNextRun();
  const nextRunTime = new Date(Date.now() + msUntilNext);
  console.log(`[Scheduler] Next run scheduled for: ${nextRunTime.toISOString()}`);
  
  setTimeout(() => {
    runDailyMaintenance();
    
    // Schedule recurring task every 24 hours
    setInterval(runDailyMaintenance, 24 * 60 * 60 * 1000);
  }, msUntilNext);
  
  // Mark missed reminders every 5 minutes
  setInterval(markMissedReminders, 5 * 60 * 1000);
  
  // Run auto-complete check every 15 minutes
  setInterval(runAutoCompleteCheckForAll, 15 * 60 * 1000);
  console.log('[Scheduler] Auto-complete checker scheduled (every 15 minutes)');
  
  // Schedule day rollover check for 03:00 AM daily
  const scheduleDayRollover = () => {
    const now = new Date();
    const next = new Date();
    
    // Set to today's 03:00 AM
    next.setHours(3, 0, 0, 0);
    
    // If we've passed 03:00 today, schedule for tomorrow
    if (now > next) {
      next.setDate(next.getDate() + 1);
    }
    
    const msUntilNext = next.getTime() - now.getTime();
    
    setTimeout(() => {
      runDayRolloverCheck();
      // Schedule recurring task every 24 hours
      setInterval(runDayRolloverCheck, 24 * 60 * 60 * 1000);
    }, msUntilNext);
    
    console.log(`[Scheduler] Day rollover check scheduled for: ${next.toISOString()}`);
  };
  
  scheduleDayRollover();
  
  // Also run immediately on startup for testing (comment out in production)
  console.log('[Scheduler] Running initial maintenance on startup...');
  runDailyMaintenance();
}
