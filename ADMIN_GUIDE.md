# 管理员功能使用指南

## 🔐 如何成为管理员（只有您能看到）

### 步骤 1：首次登录
1. 发布应用后，使用 Apple 或 Google 账号登录一次
2. 这会在数据库中创建您的用户账号（默认角色：普通用户）

### 步骤 2：获取您的用户 ID
登录后，打开浏览器开发者工具（F12），在控制台输入：
```javascript
localStorage.getItem("userId")
```
复制显示的 ID（例如：`abc123-def456-ghi789`）

### 步骤 3：设置管理员权限
在 Replit 项目中运行：
```bash
npx tsx scripts/set-admin-role.ts <您的用户ID>
```

示例：
```bash
npx tsx scripts/set-admin-role.ts abc123-def456-ghi789
```

✅ 成功后会显示：
```
✅ 成功！用户已升级为管理员
   用户 ID: abc123-def456-ghi789
   新角色: admin
```

---

## 📊 访问管理面板

发布后访问：
```
https://your-app-name.replit.app/admin
```

**重要提示：**
- ✅ 只有角色为 `admin` 或 `staff` 的用户才能访问
- ✅ 普通用户访问会显示 404（而不是 403），隐藏管理功能的存在
- ✅ 所有管理 API 都有权限保护

---

## ⚠️ JWT 到期提醒在哪里查看

### 方式 1：管理面板（推荐）
访问 `/admin`，页面顶部会显示彩色警告横幅：

#### 🟢 全部正常（>30 天）
```
✅ All OAuth Tokens Active
All OAuth integration JWTs are valid and healthy.
Next check: 2026-05-06
```

#### 🟡 警告（≤30 天）
```
🟡 WARNING: Apple OAuth JWT Expiring Soon
JWT expires in 25 days on 2026-05-06.
Please plan to regenerate the JWT soon.
```

#### 🟠 紧急（≤7 天）
```
🟠 URGENT: Apple OAuth JWT Expiring Soon
JWT expires in 5 days on 2026-05-06.
Generate a new JWT immediately!
```

#### 🔴 已过期
```
🔴 CRITICAL: Apple OAuth JWT EXPIRED
JWT expired 3 days ago on 2026-05-06.
Users cannot login with Apple OAuth! Generate a new JWT immediately.
```

### 方式 2：服务器日志
每天凌晨 0:05 自动检查，日志会显示：
```
[Scheduler] ✅ Apple OAuth JWT: 178 days remaining
```

或警告：
```
[Scheduler] ⚠️ WARNING: Apple OAuth JWT expires in 25 days!
[Scheduler] ⚠️ Regenerate JWT before 2026-05-06
```

### 方式 3：API 接口
直接调用（需要管理员权限）：
```bash
curl https://your-app.replit.app/api/system/integration-tokens
```

返回：
```json
{
  "tokens": [{
    "provider": "apple",
    "daysUntilExpiry": 178,
    "status": "active",
    "isExpired": false,
    "isWarning": false
  }]
}
```

---

## 🔧 如何更新 JWT（到期前）

当收到警告时（≤30 天），需要重新生成 Apple JWT：

### 步骤 1：生成新的 JWT
在 Replit 项目中运行：
```bash
npx tsx scripts/generate-apple-jwt.ts
```

这会生成新的 6 个月有效期 JWT。

### 步骤 2：更新 Supabase
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目 → Authentication → Providers → Apple
3. 更新 "Client Secret (JWT)" 为新生成的值
4. 保存

### 步骤 3：更新数据库记录
运行：
```bash
npx tsx scripts/init-apple-jwt-expiry.ts
```

或者手动更新数据库中的到期时间。

---

## 🛡️ 安全提示

1. **不要分享管理员账号**
   - 只有您的 Apple/Google 账号应该是管理员
   - 其他用户永远不应该被设置为 admin 或 staff

2. **定期检查**
   - 建议每月访问一次 `/admin` 查看 JWT 状态
   - 收到警告后及时更新 JWT

3. **保护脚本**
   - 不要将 `scripts/set-admin-role.ts` 的使用方法告诉用户
   - 这个脚本只在您的 Replit 后台运行

4. **隐藏管理功能**
   - 不要在应用中显示 "管理" 按钮或链接
   - 直接记住网址：`/admin`
   - 普通用户访问会看到 404 错误

---

## 📋 管理面板功能清单

访问 `/admin` 后，您可以：

- 📊 **仪表板**：查看用户统计、订阅数、AI 使用情况
- 👥 **用户管理**：查看所有用户、授予订阅、封禁用户
- 💳 **订阅管理**：查看所有订阅状态
- 🤖 **AI 使用统计**：监控 AI 菜单和教练的使用情况
- ⚠️ **JWT 到期提醒**：实时监控 OAuth 令牌状态
- 📝 **审计日志**：查看所有管理操作记录

---

## ❓ 常见问题

**Q: 普通用户能看到管理面板吗？**
A: 不能。所有管理 API 都会返回 404（而不是 403），让普通用户以为这个功能不存在。

**Q: 如何撤销管理员权限？**
A: 在数据库中将 `role` 改回 `user`，或创建类似的脚本。

**Q: 忘记查看 JWT 导致过期怎么办？**
A: 按照 "如何更新 JWT" 步骤重新生成即可。用户登录会暂时失败，但更新后立即恢复。

**Q: 我可以添加其他管理员吗？**
A: 可以，用同样的脚本设置其他用户的 role 为 `admin` 或 `staff`。但建议只有您一个人是管理员。

---

**祝您使用愉快！** 🎉
