/**
 * 设置管理员权限脚本
 * 
 * 使用方法：
 * 1. 先用 Apple/Google 登录应用一次，创建账号
 * 2. 找到您的 user_id（可以从浏览器开发者工具中查看）
 * 3. 运行：npx tsx scripts/set-admin-role.ts YOUR_USER_ID
 */

import { db } from '../server/db';
import { userProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function setAdminRole() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ 错误：请提供用户 ID');
    console.log('\n使用方法：');
    console.log('  npx tsx scripts/set-admin-role.ts <YOUR_USER_ID>');
    console.log('\n示例：');
    console.log('  npx tsx scripts/set-admin-role.ts abc123-def456-ghi789');
    console.log('\n💡 提示：登录后可在浏览器控制台运行以下代码获取您的 user_id：');
    console.log('  localStorage.getItem("userId")');
    process.exit(1);
  }
  
  try {
    console.log(`🔍 查找用户: ${userId}...`);
    
    // 查找用户
    const [user] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);
    
    if (!user) {
      console.error(`❌ 错误：找不到用户 ${userId}`);
      console.log('\n请确保：');
      console.log('1. 您已经通过 Apple/Google 登录过应用');
      console.log('2. user_id 正确（可以在浏览器控制台查看）');
      process.exit(1);
    }
    
    console.log(`✅ 找到用户: ${user.name || user.email || userId}`);
    console.log(`   当前角色: ${user.role}`);
    
    if (user.role === 'admin') {
      console.log('⚠️  该用户已经是管理员了！');
      process.exit(0);
    }
    
    // 设置为管理员
    const [updated] = await db
      .update(userProfiles)
      .set({ role: 'admin' })
      .where(eq(userProfiles.id, userId))
      .returning();
    
    console.log(`\n✅ 成功！用户已升级为管理员`);
    console.log(`   用户 ID: ${updated.id}`);
    console.log(`   姓名: ${updated.name || '(未设置)'}`);
    console.log(`   邮箱: ${updated.email || '(未设置)'}`);
    console.log(`   新角色: ${updated.role}`);
    console.log(`\n🎯 现在您可以访问管理面板：`);
    console.log(`   https://your-app.replit.app/admin`);
    console.log(`\n📊 管理功能包括：`);
    console.log(`   - 用户管理`);
    console.log(`   - 订阅管理`);
    console.log(`   - AI 使用统计`);
    console.log(`   - JWT 到期提醒 ⚠️`);
    console.log(`   - 审计日志`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

setAdminRole();
