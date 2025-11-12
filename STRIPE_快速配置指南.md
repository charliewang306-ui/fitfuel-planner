# Stripe 快速配置指南（5分钟完成）

## 🎯 第一步：注册 Stripe

1. 访问：https://dashboard.stripe.com/register
2. 填写邮箱和密码注册
3. 选择国家：中国（或您所在的国家）
4. 点击"跳过"跳过验证（测试模式不需要）

## 🔑 第二步：获取 API 密钥（2分钟）

1. 登录后，确保左上角显示 **"测试模式"** (Test Mode)
2. 点击右上角 **"开发者"** (Developers)
3. 点击 **"API密钥"** (API keys)
4. 复制以下两个密钥：

### 密钥 1：可发布密钥
- 找到 **"可发布密钥"** (Publishable key)
- 点击"显示测试密钥"
- 复制整个密钥（格式：`pk_test_51xxxxx`）
- **📝 保存为：VITE_STRIPE_PUBLIC_KEY**

### 密钥 2：密钥
- 找到 **"密钥"** (Secret key)  
- 点击"显示测试密钥"
- 复制整个密钥（格式：`sk_test_51xxxxx`）
- **📝 保存为：STRIPE_SECRET_KEY**

## 💰 第三步：创建产品（3分钟）

1. 点击左侧 **"产品"** (Products)
2. 点击 **"+ 添加产品"** (Add product)
3. 填写产品信息：

```
产品名称：FitMeal Professional
描述：完整的营养管理与AI教练服务
```

4. 在"定价"部分：
   - 选择 **"标准定价"**
   - 价格：**14.99**
   - 货币：**USD**
   - 计费周期：**每月** (Monthly)

5. 勾选 ✅ **"免费试用"**
   - 试用天数：**7**

6. 点击 **"添加产品"** 保存

7. 保存后，在产品页面找到 **"API ID"** 或 **"价格 ID"**
   - 格式：`price_1xxxxxxxxxxxxx`
   - **📝 复制这个 Price ID**

## 🔔 第四步：配置 Webhook（可选，建议跳过先测试）

**暂时跳过这一步！** 

先完成基础配置，等支付功能正常后再配置 Webhook。

## ✅ 第五步：在 Replit 添加 Secrets

现在把刚才复制的密钥添加到 Replit：

1. 在 Replit 编辑器，点击左侧 **🔒 Secrets**
2. 点击 **"New Secret"** 或 **"添加新密钥"**

### 添加 Secret 1
- Key: `VITE_STRIPE_PUBLIC_KEY`
- Value: 粘贴您复制的可发布密钥（`pk_test_51xxxxx`）
- 点击 **"Add Secret"**

### 添加 Secret 2
- Key: `STRIPE_SECRET_KEY`
- Value: 粘贴您复制的密钥（`sk_test_51xxxxx`）
- 点击 **"Add Secret"**

### 添加 Secret 3（关键！）
- Key: `STRIPE_PRICE_ID`
- Value: 粘贴您复制的 Price ID（`price_1xxxxx`）
- 点击 **"Add Secret"**

## 🚀 第六步：重启应用

1. 点击 Replit 顶部 **"Stop"** 停止应用
2. 点击 **"Run"** 重新启动
3. 等待 10-20 秒应用完全启动

## ✅ 第七步：测试支付

1. 访问订阅页面：`/upgrade`
2. 点击 **"开始 7 天免费试用"**
3. 应该跳转到 Stripe 支付页面
4. 使用测试卡号：

```
卡号：4242 4242 4242 4242
到期：12/25（任意未来日期）
CVV：123
邮编：12345
```

5. 完成支付，应该会回到应用并显示"Premium 会员"

## 🎉 完成！

现在您的应用已经可以接受订阅支付了！

---

## 📞 遇到问题？

**问题：点击按钮没反应**
- 检查浏览器控制台是否有错误
- 确认所有 3 个 Secrets 都已添加
- 重启应用

**问题：还是显示 "Price ID not configured"**
- 检查 Secret 的 Key 名称是否完全一致（区分大小写）
- 确认 Price ID 格式正确（`price_1xxxxx`）
- 重启应用

**问题：跳转到 Stripe 后报错**
- 检查 Price ID 是否正确复制
- 确认产品在 Stripe 中是"激活"状态
