import { db } from '../server/db';
import { integrationTokens } from '@shared/schema';

async function testJWTCheck() {
  try {
    console.log('[Test] Fetching integration tokens...');
    
    const tokens = await db
      .select()
      .from(integrationTokens);
    
    console.log(`[Test] Found ${tokens.length} tokens`);
    
    const now = new Date();
    
    for (const token of tokens) {
      const daysUntilExpiry = Math.floor((token.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const providerName = token.provider === 'apple' ? 'Apple OAuth' : 'Google OAuth';
      
      console.log(`[Test] ${providerName}:`);
      console.log(`  - Issued: ${token.issuedAt.toISOString().split('T')[0]}`);
      console.log(`  - Expires: ${token.expiresAt.toISOString().split('T')[0]}`);
      console.log(`  - Days until expiry: ${daysUntilExpiry}`);
      console.log(`  - Last warned: ${token.lastWarnedAt?.toISOString().split('T')[0] || 'Never'}`);
      
      // Check if expired
      if (daysUntilExpiry < 0) {
        console.error(`⚠️  CRITICAL: ${providerName} JWT has EXPIRED ${Math.abs(daysUntilExpiry)} days ago!`);
        continue;
      }
      
      // Check if within warning window
      if (daysUntilExpiry <= 7) {
        console.warn(`⚠️  URGENT: ${providerName} JWT expires in ${daysUntilExpiry} days!`);
      } else if (daysUntilExpiry <= 30) {
        console.warn(`⚠️  WARNING: ${providerName} JWT expires in ${daysUntilExpiry} days!`);
      } else {
        console.log(`✅ ${providerName} JWT: ${daysUntilExpiry} days remaining`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('[Test] Error:', error);
    process.exit(1);
  }
}

testJWTCheck();
