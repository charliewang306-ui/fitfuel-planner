# FitMeal Stripe 集成完整配置指南

## 概述

FitMeal 现已完成全面的 Stripe 支付集成，采用单一订阅方案（$14.99/月，7天免费试用），并实施了完善的防重复支付机制。

## 一、订阅方案详情

### 单一订阅方案（Professional）
- **价格**: $14.99/月
- **试用期**: 7天免费试用
- **功能包括**:
  - AI 餐饮计划生成（3次/天）
  - AI 营养教练咨询（无限次）
  - AI 自动提醒（早晚各1次智能提醒）
  - 完整的营养追踪与分析
  - 连续打卡与月度日历
  - 条码扫描与 OCR 识别
  - 餐饮计划与购物清单
  - PWA 离线支持

## 二、Stripe 配置步骤

### 1. 获取 Stripe API 密钥

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 创建或登录你的 Stripe 账户
3. 进入 **开发者 > API密钥** 部分
4. 复制以下密钥：
   - **可发布密钥 (Publishable Key)**: 用于前端 - `VITE_STRIPE_PUBLIC_KEY`
   - **密钥 (Secret Key)**: 用于后端 - `STRIPE_SECRET_KEY`

### 2. 创建 Stripe 产品和价格

在 Stripe Dashboard 中创建订阅产品：

1. 进入 **产品 > 添加产品**
2. 设置产品信息：
   - **名称**: FitMeal Professional
   - **描述**: 完整的营养管理与AI教练服务
   - **定价模式**: 标准定价
   - **价格**: $14.99 USD
   - **计费周期**: 月度
   - **试用期**: 7天
3. 创建完成后，复制 **价格 ID (Price ID)**: `price_xxxxx`

### 3. 配置 Webhook

Webhooks 用于接收 Stripe 的支付和订阅状态更新：

1. 进入 **开发者 > Webhooks**
2. 点击 **添加端点**
3. 设置以下信息：
   - **端点 URL**: `https://your-replit-app.replit.app/api/webhooks/stripe`
   - **描述**: FitMeal Subscription Events
   - **监听事件**（选择以下4个）:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. 创建完成后，点击 **显示签名密钥**，复制 **Webhook 签名密钥**: `whsec_xxxxx`

### 4. 设置 Replit Secrets

在 Replit 项目中添加以下环境变量（Tools > Secrets）：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `VITE_STRIPE_PUBLIC_KEY` | `pk_test_xxxxx` 或 `pk_live_xxxxx` | Stripe 可发布密钥（前端） |
| `STRIPE_SECRET_KEY` | `sk_test_xxxxx` 或 `sk_live_xxxxx` | Stripe 密钥（后端） |
| `STRIPE_PRICE_ID` | `price_xxxxx` | 订阅价格 ID |
| `STRIPE_ENDPOINT_SECRET` | `whsec_xxxxx` | Webhook 签名密钥 |

**注意**: 开发阶段使用 `test` 密钥，生产环境切换为 `live` 密钥。

### 5. 更新 shared/pricing.ts

确保 `pricing.ts` 中的价格 ID 与 Stripe Dashboard 中的一致：

```typescript
export const SUBSCRIPTION_PLAN = {
  id: 'professional',
  name: 'Professional',
  priceMonthly: 14.99,
  currency: 'USD',
  stripePriceId: process.env.STRIPE_PRICE_ID || 'price_YOUR_PRICE_ID',
  trialDays: 7,
  // ...
};
```

### 6. 测试支付流程

#### 测试卡号（Test Mode）
使用以下测试卡号进行测试：

- **成功支付**: `4242 4242 4242 4242`
- **需要 3D 验证**: `4000 0025 0000 3155`
- **卡被拒绝**: `4000 0000 0000 0002`
- **CVV**: 任意3位数字
- **到期日期**: 任意未来日期
- **邮政编码**: 任意5位数字

#### 测试流程
1. 访问应用的订阅页面
2. 点击 "开始7天免费试用"
3. 填写测试卡信息并完成支付
4. 检查：
   - 用户账户是否显示 "试用中" 状态
   - Stripe Dashboard 是否显示新的订阅
   - Webhook 是否成功接收事件（查看 Webhook 日志）

## 三、核心功能实现

### 1. 订阅创建流程

**前端 (UpgradeProNew.tsx)**:
```typescript
// 创建 Checkout Session
const response = await apiRequest('/api/create-checkout-session', {
  method: 'POST',
});
const { url } = await response.json();
window.location.href = url; // 跳转到 Stripe Checkout
```

**后端 (server/routes.ts - /api/create-checkout-session)**:
- 创建 Stripe Checkout Session
- 设置 7 天试用期（`subscription_data.trial_period_days: 7`）
- 记录 userId 到 metadata
- 配置成功和取消回调 URL

### 2. Webhook 事件处理

**接口**: `POST /api/webhooks/stripe`

处理4种关键事件：

#### a. `checkout.session.completed`
- 用户完成 Checkout 流程
- 更新用户资料：
  - `stripeSubscriptionId`
  - `subscriptionStatus`: `'trialing'` 或 `'active'`
  - `subscriptionTrialEnd`
  - `subscriptionCurrentPeriodEnd`

#### b. `invoice.payment_succeeded`
- 首次付款成功或续费成功
- **防重复支付机制**：
  1. 获取支付卡片的 `fingerprint`
  2. 查询数据库是否已有相同 fingerprint 的活跃订阅
  3. 如果存在重复：
     - 立即取消新订阅
     - 退款给用户
     - 记录日志
  4. 如果无重复：
     - 更新订阅状态为 `'active'`
     - 保存 `paymentFingerprint`

#### c. `customer.subscription.updated`
- 订阅状态变更（如取消、恢复）
- 同步状态到数据库
- 处理 `cancel_at_period_end` 标志

#### d. `customer.subscription.deleted`
- 订阅彻底取消
- 设置状态为 `'canceled'`
- 清空订阅相关字段

### 3. 订阅管理

#### 取消订阅
**接口**: `POST /api/subscription/cancel`
- 设置 `cancel_at_period_end = true`
- 订阅在当前周期结束后自动取消
- 用户仍可在周期内使用所有功能
- 状态更新为 `'cancel_at_period_end'`

#### 恢复订阅
**接口**: `POST /api/subscription/resume`
- 检查是否有待取消的订阅
- 取消 `cancel_at_period_end` 标志
- 恢复订阅为 `'active'` 或 `'trialing'` 状态

### 4. 订阅状态查询

**接口**: `GET /api/subscription-status`
- 返回当前用户的订阅详情：
  - `isPro`: 是否为付费用户
  - `status`: 订阅状态
  - `trialEnd`: 试用结束时间
  - `currentPeriodEnd`: 当前周期结束时间
  - `cancelAtPeriodEnd`: 是否已安排取消

## 四、数据库字段说明

`user_profiles` 表新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `stripeCustomerId` | varchar | Stripe 客户 ID |
| `stripeSubscriptionId` | varchar | Stripe 订阅 ID |
| `subscriptionStatus` | varchar | 订阅状态: `'active'`, `'trialing'`, `'cancel_at_period_end'`, `'canceled'`, `'past_due'` |
| `subscriptionTrialEnd` | timestamp | 试用期结束时间 |
| `subscriptionCurrentPeriodEnd` | timestamp | 当前计费周期结束时间 |
| `paymentFingerprint` | varchar | 支付卡片指纹（防重复支付） |

## 五、安全与防护机制

### 1. Webhook 签名验证
- 使用 `STRIPE_ENDPOINT_SECRET` 验证 webhook 真实性
- 防止恶意请求伪造订阅状态

### 2. 防重复支付
- 使用卡片 `fingerprint` 唯一标识
- 同一张卡不能创建多个活跃订阅
- 自动退款并取消重复订阅

### 3. 元数据追踪
- 每个 Stripe 订阅记录 `userId`
- 确保订阅与用户账户正确关联

## 六、常见问题

### Q1: Webhook 未收到事件？
**检查项**:
1. Webhook URL 是否正确配置
2. 应用是否正在运行
3. Stripe Dashboard > Webhooks 查看事件日志
4. 检查 `STRIPE_ENDPOINT_SECRET` 是否正确

### Q2: 测试模式下订阅如何运作？
- 使用测试密钥和测试卡
- 试用期可以手动跳过（Stripe Dashboard）
- 所有功能完全模拟真实环境

### Q3: 如何切换到生产环境？
1. 将所有 `_test_` 密钥替换为 `_live_` 密钥
2. 更新 `STRIPE_PRICE_ID` 为生产价格 ID
3. 配置生产环境的 Webhook 端点
4. 启用 Stripe 账户的实际支付功能

### Q4: 用户如何取消订阅？
方式1: 通过应用内 Billing 页面（待实现）
方式2: 通过 Stripe Customer Portal（已实现 `/api/customer-portal` 接口）

## 七、下一步优化建议

1. **创建 Billing 管理页面**: 用户可查看订阅详情、取消/恢复订阅、查看发票
2. **发票历史**: 显示所有支付记录和发票
3. **更新支付方式**: 允许用户更换信用卡
4. **订阅升级/降级**: 如果未来添加多层级方案
5. **优惠码支持**: Stripe Coupons 集成

## 八、API 端点总览

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/create-checkout-session` | POST | 创建 Stripe Checkout Session |
| `/api/webhooks/stripe` | POST | 接收 Stripe Webhook 事件 |
| `/api/subscription-status` | GET | 查询当前订阅状态 |
| `/api/subscription/cancel` | POST | 安排订阅在周期末取消 |
| `/api/subscription/resume` | POST | 恢复已安排取消的订阅 |
| `/api/customer-portal` | POST | 创建 Stripe Customer Portal 会话 |

---

**配置完成后，FitMeal 将拥有完整的订阅支付能力！** 🎉
