# 🧹 SillyTavern 酒馆资产批量清理中心 (st-batch-cleaner)

适用于 **SillyTavern（酒馆）+ Tavern Helper（酒馆助手）** 的全平台可视化资产批量清理与级联保护脚本。

---

## 🚀 方法一：官方标准 jsDelivr 云端导入（推荐）

你可以直接在 **酒馆助手 ‣ 脚本** 中新建一个脚本，粘贴以下仅一行代码即可使用（或直接导入仓库 `dist/st-batch-cleaner/st-batch-cleaner-酒馆助手脚本-云端版.json`）：

```ts
import 'https://testingcf.jsdelivr.net/gh/sisjzknxhnsnejxn-cmyk/st-batch-cleaner/dist/st-batch-cleaner/index.js';
```

### 🔄 CDN 缓存刷新与备用镜像域名
由于 jsDelivr 主服务器、国内镜像节点及浏览器存在缓存机制，当仓库代码更新后：
1. **自动版本 Tag 刷新**：本仓库已配置 `StageDog/tavern_helper_template` 官方 GitHub Actions 自动工作流 (`.github/workflows/bundle.yaml`)，每次推送 `src/` 源码都会自动打包 `dist/` 并递增 Git 版本 Tag，使 jsDelivr 主服务器在 **12 小时内** 自动刷新缓存。
2. **手动立即刷新主服务器缓存**：前往 [https://www.jsdelivr.com/tools/purge](https://www.jsdelivr.com/tools/purge)，输入以下链接（注意将 `testingcf.jsdelivr.net` 改为 `cdn.jsdelivr.net`）并点击确认：
   ```text
   https://cdn.jsdelivr.net/gh/sisjzknxhnsnejxn-cmyk/st-batch-cleaner/dist/st-batch-cleaner/index.js
   ```
3. **切换备用镜像域名**：若当前节点尚未同步最新缓存，可临时将 `import` 链接中的域名替换为以下任意镜像：
   - `testingcf.jsdelivr.net`
   - `fastly.jsdelivr.net`
   - `gcore.jsdelivr.net`

---

## 📦 方法二：导入离线本地完整版 JSON

如果处于纯离线内网环境，可直接将仓库中的 `dist/st-batch-cleaner/st-batch-cleaner-酒馆助手脚本-本地版.json` 导入到酒馆助手脚本列表中使用。

---

## ✨ 核心特性

- **多模块统一管理**：支持 **角色卡 (Characters)**、**世界书 (Worldbooks)**、**用户面具 (Personas)** 的批量检索、多维排序、关联/孤立状态筛选与批量清理。
- **引用图谱差集防误删 (`DependencyGraphEngine`)**：
  - 自动锁定当前正在游玩的角色卡、默认面具及已全局启用的世界书。
  - 删除角色卡并勾选级联删除时，仅清理**仅被本次选中角色独占引用**的世界书与面具；若某世界书/面具仍被其他未删角色引用，自动降级为「保护跳过」或「仅解绑」，绝不误伤共享资产。
- **删前一键 JSON 备份**：支持在删除前自动导出包含角色设定、世界书词条与面具描述的 JSON 备份包，并对移动端低内存环境提供体积保护。
- **云酒馆防崩节流护航 (`CloudThrottleController`)**：
  - 内置 **本地极速 / 云酒馆均衡 / 云酒馆防崩安全** 三档预设及自定义间隔。
  - 自动对 `429 / 502 / 503 / 504` 等网关错误执行指数退避重试。
  - 支持在执行过程中随时 **暂停 / 继续 / 紧急停止**。
- **高对比度日/夜双主题 & 三合一无侵入入口**：
  - 独立高对比度 **日间模式 / 夜间模式 / 自动跟随**，彻底解决浅色或深色背景下文字看不清的问题。
  - 移除拥挤的顶部栏图标，提供可在设置中自由开关的 **可拖拽贴边磁吸悬浮球**、**输入框旁魔棒扩展菜单**、**左下角汉堡主菜单** 以及 `Alt + Shift + C` 快捷键。
- **iOS / Android / PC 全端适配**：适配 iOS 刘海/灵动岛/底部安全区 (`100dvh`)、iOS Safari 添加主屏幕全屏引导、移动端防自动缩放与分批增量渲染。