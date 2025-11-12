import { db } from '../server/db';
import { integrationTokens } from '@shared/schema';

async function initAppleJWTExpiry() {
  try {
    // Apple JWT generated on 2025-11-07, expires on 2026-05-06 (6 months)
    const issuedAt = new Date('2025-11-07');
    const expiresAt = new Date('2026-05-06');
    
    const result = await db
      .insert(integrationTokens)
      .values({
        provider: 'apple',
        issuedAt,
        expiresAt,
        notes: 'Initial Apple OAuth JWT configured on 2025-11-07'
      })
      .onConflictDoUpdate({
        target: integrationTokens.provider,
        set: {
          issuedAt,
          expiresAt,
          lastWarnedAt: null,
          updatedAt: new Date()
        }
      })
      .returning();

    console.log('✅ Apple JWT expiry recorded:', result[0]);
    console.log(`📅 Issued: ${issuedAt.toISOString().split('T')[0]}`);
    console.log(`⏰ Expires: ${expiresAt.toISOString().split('T')[0]}`);
    console.log(`📊 Days until expiry: ${Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initAppleJWTExpiry();
