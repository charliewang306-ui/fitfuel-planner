# Supabase 认证完整配置指南

## 📋 **配置前检查清单**

当前状态：
- ✅ Supabase 项目已创建
- ✅ Apple JWT 已生成（有效期至 2026-05-06）
- ⚠️ Email 登录需要配置
- ❌ Google OAuth 需要配置

---

## 1️⃣ **Email 登录配置（必需）**

### **步骤 1：访问 Supabase Dashboard**

1. 打开 https://supabase.com/dashboard
2. 选择您的项目：`hedfxawszuhxttrnxptg`
3. 进入：**Authentication** → **Providers**

### **步骤 2：配置 Email Provider**

1. 找到 **Email** 选项
2. 确保开关是 **Enabled** ✅

### **步骤 3：关键设置检查**

点击 Email 进入详细配置，检查以下设置：

#### **A. Confirm email（邮箱验证）**

**选项 1：开启验证（推荐生产环境）**
```
✅ Confirm email: ENABLED
```
- 用户注册后必须点击邮件验证链接
- 更安全，但测试不便

**选项 2：关闭验证（开发/测试）**
```
❌ Confirm email: DISABLED
```
- 用户注册后可立即登录
- 方便测试，但安全性降低

**建议：开发阶段先 DISABLED，发布前改为 ENABLED**

#### **B. Secure email change（安全邮箱变更）**
```
✅ Secure email change: ENABLED（保持开启）
```

#### **C. Mailer settings（邮件设置）**

检查邮件模板是否正确：
- **Confirm signup**：注册验证邮件
- **Magic Link**：魔法链接登录
- **Change Email Address**：邮箱变更确认
- **Reset Password**：密码重置

**如果使用自定义域名，需要配置 SMTP：**
- 否则使用 Supabase 默认邮件服务（会显示 noreply@mail.app.supabase.io）

#### **D. 配置 OTP 验证码邮件模板（重要！）**

**问题：** 默认情况下，Supabase 的 OTP 邮件只包含 Magic Link（链接），不显示验证码数字。

**解决方案：** 修改邮件模板以显示验证码。

**步骤：**

1. 进入 **Authentication** → **Email Templates**
2. 找到 **Magic Link** 模板
3. 点击编辑
4. 在邮件内容中添加验证码显示：

**推荐的邮件模板：**

```html
<h2>登录验证码</h2>

<p>您的 6 位登录验证码是：</p>

<h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">
  {{ .Token }}
</h1>

<p>此验证码将在 5 分钟后过期。</p>

<p>如果您也想使用链接登录，可以点击下方按钮：</p>

<a href="{{ .ConfirmationURL }}">点击登录</a>

<p>如果您没有请求此验证码，请忽略此邮件。</p>
```

**关键变量：**
- `{{ .Token }}` - 显示 6 位验证码
- `{{ .ConfirmationURL }}` - Magic Link 登录链接（可选）

5. 点击 **Save**

**测试效果：**
修改后，用户收到的邮件将同时包含：
- ✅ 6 位数字验证码（用于 APP 内输入）
- ✅ Magic Link 按钮（可选的快捷登录方式）

### **步骤 4：URL Configuration（重要！）**

进入：**Authentication** → **URL Configuration**

#### **必须配置的 URL：**

**开发环境：**
```
Site URL: http://localhost:5000
Redirect URLs: 
  - http://localhost:5000/**
  - https://*.replit.dev/**
```

**生产环境（发布后）：**
```
Site URL: https://your-app-name.replit.app
Redirect URLs:
  - https://your-app-name.replit.app/**
```

### **步骤 5：测试 Email 登录**

1. 刷新应用登录页面
2. 点击"使用邮箱登录"
3. 点击"立即注册"
4. 填写：
   - 邮箱：test@example.com
   - 密码：至少6位
5. 提交

**如果 Confirm email 是 DISABLED：**
- ✅ 立即登录成功

**如果 Confirm email 是 ENABLED：**
- ✅ 显示："验证邮件已发送"
- 📧 查收邮箱，点击验证链接
- ✅ 验证后可登录

---

## 2️⃣ **Google OAuth 配置（必需）**

### **步骤 1：创建 Google Cloud 项目**

1. 访问 https://console.cloud.google.com/
2. 点击顶部项目下拉菜单 → **New Project**
3. 填写：
   - Project name: `FitFuel Planner`
   - Location: No organization
4. 点击 **CREATE**

### **步骤 2：配置 OAuth 同意屏幕**

1. 左侧菜单：**APIs & Services** → **OAuth consent screen**
2. 选择 **External**（外部用户）
3. 点击 **CREATE**

填写信息：
```
App name: FitFuel Planner
User support email: your-email@gmail.com
Developer contact information: your-email@gmail.com
```

其他字段可选，点击 **SAVE AND CONTINUE**

**Scopes（权限）：**
- 默认即可（email, profile, openid）
- 点击 **SAVE AND CONTINUE**

**Test users（测试用户）：**
- 如果应用处于 Testing 状态，添加您的邮箱
- 点击 **ADD USERS**
- 输入：charliewang305@gmail.com
- 点击 **SAVE AND CONTINUE**

### **步骤 3：创建 OAuth 凭据**

1. 左侧菜单：**Credentials**
2. 点击 **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `FitFuel Planner Web`

#### **配置 Authorized redirect URIs（关键！）**

点击 **+ ADD URI**，添加：

```
https://hedfxawszuhxttrnxptg.supabase.co/auth/v1/callback
```

**如果有自定义域名，也添加：**
```
https://your-app-name.replit.app/auth/v1/callback
```

5. 点击 **CREATE**

### **步骤 4：复制凭据**

创建成功后，弹窗会显示：
```
Client ID: xxxxxx.apps.googleusercontent.com
Client Secret: xxxxxx
```

**重要：立即复制这两个值！**

### **步骤 5：在 Supabase 中配置**

1. 回到 Supabase Dashboard
2. **Authentication** → **Providers** → **Google**
3. 开关切换为 **Enabled**
4. 填写：
   - **Client ID**: 粘贴刚才复制的 Client ID
   - **Client Secret**: 粘贴刚才复制的 Client Secret
5. 点击 **Save**

### **步骤 6：发布 OAuth 应用（可选）**

**如果只是测试：**
- 保持 Testing 状态即可
- 只有添加的测试用户能登录

**如果要公开发布：**
1. 回到 Google Cloud Console
2. **OAuth consent screen**
3. 点击 **PUBLISH APP**
4. 确认发布

### **步骤 7：测试 Google 登录**

1. 刷新应用登录页面
2. 点击"Sign in with Google"
3. 选择您的 Google 账号
4. ✅ 授权后自动登录

---

## 3️⃣ **Apple OAuth 配置（已部分完成）**

### **当前状态：**
- ✅ JWT 已生成（2025-11-07 签发，2026-05-06 到期）
- ✅ Supabase 中已配置 Client Secret (JWT)
- ⚠️ 需要验证 Redirect URLs

### **步骤 1：检查 Supabase 配置**

1. Supabase Dashboard
2. **Authentication** → **Providers** → **Apple**
3. 确认已填写：
   - **Services ID**: `com.shapelyeat.app.auth`
   - **Client Secret (JWT)**: （您之前生成的 JWT）
4. 状态应该是 **Enabled** ✅

### **步骤 2：在 Apple Developer 配置 Redirect URLs**

1. 访问 https://developer.apple.com/account/
2. **Certificates, Identifiers & Profiles**
3. 左侧菜单：**Identifiers**
4. 选择您的 Services ID：`com.shapelyeat.app.auth`

#### **配置 Return URLs：**

点击 **Configure**（在 Sign In with Apple 旁边）

添加以下 URL：

**Supabase 回调（必需）：**
```
https://hedfxawszuhxttrnxptg.supabase.co/auth/v1/callback
```

**Domains（必需）：**
```
hedfxawszuhxttrnxptg.supabase.co
```

**发布后添加（生产环境）：**
```
Return URLs: https://your-app-name.replit.app/auth/v1/callback
Domains: your-app-name.replit.app
```

点击 **Save** → **Continue** → **Save**

### **步骤 3：Apple 登录限制说明**

⚠️ **重要：Apple Sign In 在开发环境有限制**

**不支持：**
- ❌ localhost
- ❌ Replit 预览域名（*.replit.dev）
- ❌ 临时/动态域名

**支持：**
- ✅ 已验证的固定域名（*.replit.app）
- ✅ 自定义域名
- ✅ iOS/macOS 原生应用

**测试建议：**
- 开发阶段：使用 Email 或 Google 登录
- 发布后：在正式域名测试 Apple 登录

---

## 4️⃣ **验证所有登录方式**

### **检查清单：**

#### **Email 登录**
- [ ] Supabase Email Provider: Enabled
- [ ] Confirm email 设置已确认（ENABLED 或 DISABLED）
- [ ] URL Configuration 已配置
- [ ] 测试注册/登录成功

#### **Google 登录**
- [ ] Google Cloud OAuth 凭据已创建
- [ ] Redirect URI 已添加：`https://hedfxawszuhxttrnxptg.supabase.co/auth/v1/callback`
- [ ] Supabase Google Provider 已启用
- [ ] Client ID 和 Client Secret 已填写
- [ ] 测试登录成功

#### **Apple 登录**
- [ ] Apple Services ID 已创建
- [ ] JWT 已生成并在 Supabase 中配置
- [ ] Apple Developer 中 Return URLs 已配置
- [ ] 了解 Apple 登录在开发环境的限制
- [ ] 准备在发布后测试

---

## 5️⃣ **发布前最后检查**

### **Supabase URL Configuration**

发布前更新为生产环境 URL：

```
Site URL: https://your-app-name.replit.app

Redirect URLs:
  - https://your-app-name.replit.app/**
  - https://hedfxawszuhxttrnxptg.supabase.co/**
```

### **Google OAuth**

在 Google Cloud Console 添加生产回调 URL：
```
https://your-app-name.replit.app/auth/v1/callback
```

### **Apple OAuth**

在 Apple Developer 添加生产域名：
```
Return URLs: https://your-app-name.replit.app/auth/v1/callback
Domains: your-app-name.replit.app
```

---

## 🎯 **快速配置步骤总结**

### **现在立即完成（开发环境）：**

1. **Email 登录：**
   - Supabase → Email Provider → Enabled
   - Confirm email → DISABLED（方便测试）
   - URL Configuration → 添加 localhost 和 replit.dev

2. **Google 登录：**
   - Google Cloud → 创建 OAuth 凭据
   - 复制 Client ID 和 Secret
   - Supabase → Google Provider → 填写凭据

3. **测试：**
   - Email 注册/登录
   - Google 登录

### **发布前完成（生产环境）：**

1. **更新 URL Configuration：**
   - Supabase → 改为 replit.app 域名
   - Google Cloud → 添加生产回调 URL
   - Apple Developer → 添加生产域名

2. **Email 验证：**
   - Confirm email → ENABLED（提高安全性）

3. **测试所有登录方式：**
   - Email、Google、Apple

---

## ❓ **常见问题**

**Q: 为什么 Email 登录报 "Invalid login credentials"？**
A: 可能是：
1. 账号还没注册
2. 邮箱需要验证（Confirm email 开启时）
3. 密码错误

**Q: Google 登录出现 403 错误？**
A: 检查：
1. Supabase 中 Client ID 和 Secret 是否正确
2. Redirect URI 是否完全匹配
3. OAuth 应用是否处于 Testing 状态（需添加测试用户）

**Q: Apple 登录在开发环境无法使用？**
A: 正常现象。Apple 不支持临时域名，发布到 replit.app 后才能使用。

---

**配置完成后，您的应用将支持 3 种登录方式，可以安全发布！** 🎉
