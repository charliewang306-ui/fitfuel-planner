# FitFuel Planner - iOS App 构建指南

## ✅ 已完成的配置

### 1. Capacitor 依赖已安装
- `@capacitor/cli` - Capacitor 命令行工具
- `@capacitor/core` - Capacitor 核心库
- `@capacitor/ios` - iOS 平台支持

### 2. Capacitor 配置已创建
- **App ID**: `com.shapelyeat.app`
- **App Name**: `FitFuel Planner`
- **Web Directory**: `dist` (Vite 构建输出目录)

### 3. iOS 平台已添加
- iOS 原生项目已创建在 `ios/` 目录
- 使用最新的 Capacitor 7

---

## 📱 iOS App 构建流程

### 步骤 1：更新生产服务器 URL

在 `capacitor.config.ts` 文件中，将以下 URL 替换为你的实际生产地址：

```typescript
server: {
  url: 'https://your-production-url.replit.app',  // ⚠️ 替换为实际 URL
  cleartext: false
}
```

**如何获取你的 Replit 生产 URL：**
1. 在 Replit 中点击 "Publish" 按钮发布你的应用
2. 复制生成的 `.replit.app` URL
3. 粘贴到上面的配置中

---

### 步骤 2：构建 Web 应用

在项目根目录运行：

```bash
npm run build
```

这会创建优化后的生产版本在 `dist/` 目录。

---

### 步骤 3：同步 Web 资源到 iOS

将构建好的 Web 应用复制到 iOS 原生项目：

```bash
npx cap sync ios
```

这个命令会：
- 复制 `dist/` 中的文件到 `ios/App/App/public/`
- 更新 iOS 原生依赖
- 同步 Capacitor 插件

---

### 步骤 4：在 macOS/Xcode 中打开项目

⚠️ **注意**：后续步骤需要在 macOS 系统上完成，因为 Xcode 只能在 macOS 运行。

**选项 A - 在本地 Mac 上继续：**

1. 下载整个项目到 Mac 电脑
2. 在终端中运行：
   ```bash
   npx cap open ios
   ```
3. Xcode 会自动打开 iOS 项目

**选项 B - 使用 Xcode Cloud（远程构建）：**
- 如果你没有 Mac，可以使用 Xcode Cloud 进行远程构建
- 参考：https://developer.apple.com/xcode-cloud/

---

### 步骤 5：在 Xcode 中配置

1. **选择开发团队**
   - 点击项目名称 "App"
   - 在 "Signing & Capabilities" 选项卡
   - 选择你的 Apple Developer 账号

2. **验证 Bundle Identifier**
   - 确认是 `com.shapelyeat.app`
   - 这必须在 Apple Developer Portal 中注册

3. **配置应用图标和启动画面**
   - 导航到 `ios/App/App/Assets.xcassets`
   - 添加你的应用图标（1024x1024）

---

### 步骤 6：构建并测试

**在模拟器上测试：**
```bash
# 选择目标设备（iPhone 15, iPad 等）
# 点击 ▶️ 按钮运行
```

**在真实设备上测试：**
1. 用 USB 连接 iPhone/iPad
2. 在 Xcode 顶部选择你的设备
3. 点击 ▶️ 运行
4. 首次运行需要在设备上信任开发者证书

---

### 步骤 7：发布到 App Store

1. **准备发布版本**
   ```bash
   # 在 Xcode 中选择 "Any iOS Device"
   # Product → Archive
   ```

2. **上传到 App Store Connect**
   - Archive 完成后会打开 Organizer
   - 点击 "Distribute App"
   - 选择 "App Store Connect"
   - 按照向导完成上传

3. **在 App Store Connect 配置**
   - 登录 https://appstoreconnect.apple.com
   - 创建新 App（如果还没有）
   - 添加描述、截图、隐私政策等
   - 提交审核

---

## 🔄 开发工作流

### 更新 Web 应用后的同步流程

每次修改前端代码后：

```bash
# 1. 构建最新版本
npm run build

# 2. 同步到 iOS
npx cap sync ios

# 3. 在 Xcode 中重新运行
```

### 实时预览（开发模式）

你也可以在 iOS App 中使用开发服务器：

1. 临时修改 `capacitor.config.ts`：
   ```typescript
   server: {
     url: 'http://你的本地IP:5000',  // 例如：http://192.168.1.100:5000
     cleartext: true  // 开发时允许 HTTP
   }
   ```

2. 运行开发服务器：
   ```bash
   npm run dev
   ```

3. 同步并在 Xcode 中运行：
   ```bash
   npx cap sync ios
   # 然后在 Xcode 中运行
   ```

⚠️ **发布前记得改回 HTTPS 生产 URL！**

---

## 🎨 iOS 特定优化建议

### 1. PWA 功能在原生 App 中的表现

你的应用已经是 PWA，以下功能在 iOS App 中的表现：

- ✅ **离线支持** - Service Worker 正常工作
- ✅ **本地存储** - localStorage/IndexedDB 可用
- ✅ **推送通知** - 需要额外配置 Capacitor Push 插件
- ✅ **全屏体验** - 自动全屏，无浏览器 UI

### 2. 性能优化

当前配置已包含的优化：

```typescript
ios: {
  contentInset: 'automatic',           // 自适应安全区域
  webContentsDebuggingEnabled: false,  // 生产环境禁用调试
  allowsLinkPreview: false             // 禁用链接预览
}
```

### 3. 添加原生功能（可选）

如需添加原生功能，可安装 Capacitor 插件：

```bash
# 相机功能
npm install @capacitor/camera

# 推送通知
npm install @capacitor/push-notifications

# 本地通知
npm install @capacitor/local-notifications

# 分享功能
npm install @capacitor/share
```

安装后运行 `npx cap sync ios` 同步到原生项目。

---

## 📋 常用命令速查

```bash
# 构建 Web 应用
npm run build

# 同步到 iOS（复制 Web 资源 + 更新插件）
npx cap sync ios

# 只复制 Web 资源（不更新插件）
npx cap copy ios

# 只更新插件（不复制 Web 资源）
npx cap update ios

# 在 Xcode 中打开项目
npx cap open ios

# 查看已安装的 Capacitor 插件
npx cap ls
```

---

## 🚨 常见问题

### Q: 我在 Xcode 中看到编译错误
**A:** 运行 `npx cap sync ios` 确保所有依赖都是最新的。

### Q: App 中显示的是旧版本内容
**A:** 确保运行了 `npm run build` 和 `npx cap sync ios`。

### Q: 无法连接到后端 API
**A:** 检查 `capacitor.config.ts` 中的 `server.url` 是否正确。

### Q: App 在真机上无法安装
**A:** 确认：
1. 在 Xcode 中选择了正确的开发团队
2. Bundle ID 在 Apple Developer Portal 中已注册
3. 设备已添加到 Provisioning Profile

---

## 📚 更多资源

- **Capacitor 官方文档**: https://capacitorjs.com/docs
- **iOS 开发指南**: https://capacitorjs.com/docs/ios
- **Apple Developer**: https://developer.apple.com
- **App Store Connect**: https://appstoreconnect.apple.com

---

## ✅ 检查清单

发布前确认：

- [ ] `capacitor.config.ts` 中的 `server.url` 已更新为生产 URL
- [ ] `webContentsDebuggingEnabled: false` （生产环境）
- [ ] 运行 `npm run build` 构建最新版本
- [ ] 运行 `npx cap sync ios` 同步到 iOS
- [ ] 在 Xcode 中测试所有核心功能
- [ ] 添加应用图标（1024x1024）
- [ ] 配置启动画面
- [ ] 在真实设备上测试
- [ ] 准备 App Store 截图和描述
- [ ] 隐私政策 URL 已准备
- [ ] 通过 Archive 构建发布版本

---

## 🎉 下一步

现在你的 Capacitor 配置已完成！

1. **立即测试**：在 Mac 上运行 `npx cap open ios` 在模拟器中查看效果
2. **发布应用**：按照上述步骤准备 App Store 发布
3. **享受原生体验**：你的 PWA 现在可以作为真正的 iOS 应用运行！

有任何问题，请参考 [Capacitor 官方文档](https://capacitorjs.com/docs) 或联系技术支持。
