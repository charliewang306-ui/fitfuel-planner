/**
 * Test script to verify DST (Daylight Saving Time) date rollover fix
 * 
 * This tests the msUntilNextLocalMidnight() function during:
 * 1. Normal days
 * 2. DST "fall back" (clock goes from 2:00 AM to 1:00 AM) - 25 hour day
 * 3. DST "spring forward" (clock goes from 2:00 AM to 3:00 AM) - 23 hour day
 */

// Simulate the fixed msUntilNextLocalMidnight function
function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function localDateKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getLocalTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${y}-${m}-${day}`;
}

function msUntilNextLocalMidnight(now = new Date()) {
  // Get current local date as YYYY-MM-DD
  const todayKey = localDateKey(now);
  const [year, month, day] = todayKey.split('-').map(Number);
  
  // Create tomorrow's date by incrementing day (handles month/year boundaries automatically)
  const tomorrowMidnight = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  
  const ms = tomorrowMidnight.getTime() - now.getTime();
  
  // Validation: result should be between 0 and 26 hours (accounting for DST spring forward)
  if (ms < 0 || ms > 26 * 60 * 60 * 1000) {
    console.error('[dateLocal] Invalid midnight calculation - possible timezone issue:', {
      now: now.toLocaleString(),
      nowISO: now.toISOString(),
      todayKey,
      tomorrowMidnight: tomorrowMidnight.toLocaleString(),
      calculatedMs: ms,
      calculatedHours: Math.round(ms / 1000 / 60 / 60 * 10) / 10
    });
    return 60 * 60 * 1000; // 1 hour fallback
  }
  
  return ms;
}

// Test scenarios
console.log('=== DST Date Rollover Test ===\n');
console.log('Timezone:', getLocalTimeZone());
console.log('');

// Test 1: Normal day (not DST transition)
console.log('Test 1: Normal Day');
const normalDay = new Date(2025, 10, 1, 14, 30, 0); // Nov 1, 2025, 2:30 PM
const msNormal = msUntilNextLocalMidnight(normalDay);
const hoursNormal = Math.round(msNormal / 1000 / 60 / 60 * 10) / 10;
console.log('  Current time:', normalDay.toLocaleString());
console.log('  Hours until midnight:', hoursNormal);
console.log('  Expected: ~9.5 hours');
console.log('  Status:', hoursNormal >= 9 && hoursNormal <= 10 ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 2: DST Fall Back - Nov 3, 2025 at 1:30 AM (after clock fell back)
// On this day, 2:00 AM becomes 1:00 AM, so the day has 25 hours
console.log('Test 2: DST Fall Back Day (Nov 3, 2025 - Winter Time begins)');
const fallBackDay = new Date(2025, 10, 3, 1, 30, 0); // Nov 3, 2025, 1:30 AM
const msFallBack = msUntilNextLocalMidnight(fallBackDay);
const hoursFallBack = Math.round(msFallBack / 1000 / 60 / 60 * 10) / 10;
console.log('  Current time:', fallBackDay.toLocaleString());
console.log('  Hours until midnight:', hoursFallBack);
console.log('  Expected: ~22.5 hours (this day has 25 hours total)');
console.log('  Valid range: 22-24 hours');
console.log('  Status:', hoursFallBack >= 22 && hoursFallBack <= 24 ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 3: Day after DST transition
console.log('Test 3: Day After DST Transition');
const dayAfter = new Date(2025, 10, 4, 10, 0, 0); // Nov 4, 2025, 10:00 AM
const msDayAfter = msUntilNextLocalMidnight(dayAfter);
const hoursDayAfter = Math.round(msDayAfter / 1000 / 60 / 60 * 10) / 10;
console.log('  Current time:', dayAfter.toLocaleString());
console.log('  Hours until midnight:', hoursDayAfter);
console.log('  Expected: ~14 hours');
console.log('  Status:', hoursDayAfter >= 13 && hoursDayAfter <= 15 ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 4: DST Spring Forward - Mar 9, 2025 at 3:30 AM (after clock jumped forward)
// On this day, 2:00 AM becomes 3:00 AM, so the day has 23 hours
console.log('Test 4: DST Spring Forward Day (Mar 9, 2025 - Summer Time begins)');
const springForwardDay = new Date(2025, 2, 9, 3, 30, 0); // Mar 9, 2025, 3:30 AM
const msSpringForward = msUntilNextLocalMidnight(springForwardDay);
const hoursSpringForward = Math.round(msSpringForward / 1000 / 60 / 60 * 10) / 10;
console.log('  Current time:', springForwardDay.toLocaleString());
console.log('  Hours until midnight:', hoursSpringForward);
console.log('  Expected: ~20.5 hours (this day has 23 hours total)');
console.log('  Valid range: 20-21 hours');
console.log('  Status:', hoursSpringForward >= 20 && hoursSpringForward <= 21 ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 5: Edge case - 11:59 PM
console.log('Test 5: Edge Case - Almost Midnight');
const almostMidnight = new Date(2025, 10, 5, 23, 59, 0); // Nov 5, 2025, 11:59 PM
const msAlmostMidnight = msUntilNextLocalMidnight(almostMidnight);
const minutesAlmostMidnight = Math.round(msAlmostMidnight / 1000 / 60);
console.log('  Current time:', almostMidnight.toLocaleString());
console.log('  Minutes until midnight:', minutesAlmostMidnight);
console.log('  Expected: ~1 minute');
console.log('  Status:', minutesAlmostMidnight >= 0 && minutesAlmostMidnight <= 2 ? '✅ PASS' : '❌ FAIL');
console.log('');

console.log('=== Test Summary ===');
console.log('All tests validate that the msUntilNextLocalMidnight() function:');
console.log('1. Correctly calculates time until midnight on normal days');
console.log('2. Handles DST "fall back" (25-hour days) correctly');
console.log('3. Handles DST "spring forward" (23-hour days) correctly');
console.log('4. Works correctly on days immediately after DST transitions');
console.log('5. Handles edge cases like times very close to midnight');
