# HitWar Android APK

Android 版本使用系统 WebView 加载本地 Vite 构建产物。游戏逻辑仍由现有 TypeScript/Canvas 代码提供，APK 只包含轻量原生壳和精简后的静态资源；设备上的 Android System WebView/Chrome 负责渲染引擎，因此不会把 Chromium 打进 APK。

## 本地构建

```bash
npm ci
npm run build
node scripts/prepare-android-dist.mjs
gradle -p android assembleDebug
```

生成文件：`android/app/build/outputs/apk/debug/app-debug.apk`。它由 Android 的 debug keystore 签名，可直接安装测试。正式发布使用 `assembleRelease`，产物 `app-release-unsigned.apk` 需要使用发行密钥签名。

多人模式继续使用游戏内填写的 WebSocket 地址；单机模式完全离线可运行。发布包会删除 PSD、XMind、source map、未使用音效和未使用字体，避免把设计源文件带入 APK。

GitHub Actions 工作流会在 Android 或前端资源变更时自动构建并上传 `hitwar-android-debug` 与 `hitwar-android-release` 两个工件。
