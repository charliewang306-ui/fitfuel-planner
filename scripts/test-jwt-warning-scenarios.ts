import { db } from '../server/db';
import { integrationTokens } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function testWarningScenarios() {
  console.log('=== JWT Warning Scenarios Test ===\n');
  
  // Test different scenarios
  const scenarios = [
    { days: 178, expected: '✅ ACTIVE (green)' },
    { days: 35, expected: '✅ ACTIVE (green)' },
    { days: 30, expected: '🟡 WARNING (yellow)' },
    { days: 15, expected: '🟡 WARNING (yellow)' },
    { days: 7, expected: '🟠 URGENT (orange)' },
    { days: 3, expected: '🟠 URGENT (orange)' },
    { days: 0, expected: '🔴 EXPIRED (red)' },
    { days: -5, expected: '🔴 EXPIRED (red)' },
  ];
  
  for (const scenario of scenarios) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (scenario.days * 24 * 60 * 60 * 1000));
    
    const daysUntilExpiry = scenario.days;
    const isExpired = daysUntilExpiry < 0;
    const isWarning = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    const status = isExpired ? 'expired' : isWarning ? 'warning' : 'active';
    
    console.log(`Days: ${daysUntilExpiry.toString().padStart(4)} | Status: ${status.padEnd(8)} | Expected: ${scenario.expected}`);
    
    // Verify logic
    let actualBanner = '';
    if (isExpired) {
      actualBanner = '🔴 EXPIRED (red)';
    } else if (daysUntilExpiry <= 7) {
      actualBanner = '🟠 URGENT (orange)';
    } else if (daysUntilExpiry <= 30) {
      actualBanner = '🟡 WARNING (yellow)';
    } else {
      actualBanner = '✅ ACTIVE (green)';
    }
    
    const match = actualBanner === scenario.expected ? '✓' : '✗';
    console.log(`         Actual: ${actualBanner} ${match === '✓' ? '✓' : '✗ MISMATCH!'}\n`);
  }
  
  console.log('\n=== Current Apple JWT Status ===');
  const tokens = await db.select().from(integrationTokens);
  
  for (const token of tokens) {
    const now = new Date();
    const daysUntilExpiry = Math.floor((token.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`Provider: ${token.provider}`);
    console.log(`Issued: ${token.issuedAt.toISOString().split('T')[0]}`);
    console.log(`Expires: ${token.expiresAt.toISOString().split('T')[0]}`);
    console.log(`Days remaining: ${daysUntilExpiry}`);
    console.log(`Status: ${daysUntilExpiry < 0 ? 'EXPIRED 🔴' : daysUntilExpiry <= 7 ? 'URGENT 🟠' : daysUntilExpiry <= 30 ? 'WARNING 🟡' : 'ACTIVE ✅'}`);
  }
  
  process.exit(0);
}

testWarningScenarios().catch(console.error);
