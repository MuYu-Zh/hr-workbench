# 🧑‍💼 人事工作台 (HR Workbench)

> 个人人事管理应用 · 数据本地存储 · 可安装为 PWA

一款面向个人 HR 从业者的轻量工作台，覆盖员工档案、招聘管理、组织架构、待办备忘、常用网址等日常事务。**纯前端实现，无后端依赖，数据保存在浏览器本地**；支持文件存储模式，数据可以真实文件形式落盘到用户指定文件夹。

---

## ✨ 功能特性

### 已实现模块

| 模块 | 入口 | 说明 |
| --- | --- | --- |
| 📊 工作总览 | 首页 | 在职/离职统计、今日待办看板 |
| 🏢 组织架构 | 组织架构 | 维护组织树、删除校验、组织结构图预览与全屏 |
| 👥 员工档案管理 | 员工档案管理 | 在职花名册、离职档案、员工信息维护、证件/附件归档、xlsx 批量导入 |
| 📣 招聘管理 | 招聘管理 | 招聘需求、候选人简历库、面试记录、offer 发放、渠道统计 |
| ⏰ 考勤管理 | 考勤管理 | 月度考勤汇总、请假/加班/出差申请、补卡、异常预警、排班，支持钉钉考勤 xlsx 导入 |
| ✅ 待办 & 备忘录 | 待办 & 备忘录 | 每日待办、备忘录笔记、重要事项提醒 |
| 🔗 常用网址 | 常用网址 | 社保/公积金/个税/招聘/OA 等快捷链接管理 |
| ⚙️ 系统设置 | 系统设置 | 个人信息、数据备份/恢复、文件存储模式、检查更新 |

### 规划中模块

以下模块已保留菜单入口，后续版本逐步实现：

- 💰 薪资管理（薪资台账、工资表、调薪、代扣明细、工资条）
- 🎯 绩效考核（考核周期、考核表、结果汇总、面谈、等级分布）
- 📚 培训与发展（培训计划、记录、技能证书、效果评估）
- 📄 劳动合同管理（合同台账、到期提醒、试用期、模板）
- 🛡️ 社保公积金管理（社保、公积金、增减员、基数调整、待遇申领）
- 🔄 员工异动管理（转正、调岗调薪、晋升降职、离职交接）

### 平台能力

- **PWA**：可安装为独立应用，支持离线使用
- **文件存储模式**：数据以 `hr-data.json` / `hr-config.json` / `attachments/` 落盘
- **自动更新**：基于 GitHub 仓库版本号检测并更新应用文件，不影响业务数据

---

## 🚀 快速开始

### 方式一：直接使用 PWA（推荐）

1. 使用 **Chrome / Edge** 打开在线地址：**https://muyu-zh.github.io/hr-workbench/**
2. 点击浏览器地址栏右侧的 **安装图标**
3. 安装后可从桌面/开始菜单/程序坞启动，像原生应用一样使用
4. 支持离线打开，数据仍保存在本机

> 如果访问提示 404 或源码页面，请在 GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，并等待部署完成。

### 方式二：本地运行（开发 / 体验）

需要 Node.js 18+：

```bash
npm install
npm run dev
```

然后打开 Vite 输出的本地地址（默认 `http://localhost:8000`）。

### 方式三：本地构建并预览

```bash
npm run build
npm run preview
```

---

## 📲 PWA 安装与使用指南

### 安装为应用

- 浏览器要求：**Chrome / Edge**（桌面端）
- 环境要求：`https://` 或 `localhost`（PWA 需要 secure context）
- 安装入口：地址栏右侧安装图标，或浏览器菜单 → “安装 人事工作台”

### 离线使用

- 安装后应用资源会被 Service Worker 缓存
- 断网时仍可打开应用和已加载页面
- 业务数据保存在本机 IndexedDB / 文件存储文件夹，不依赖网络

### 缓存与更新

- 应用使用版本化缓存：`version.json` 版本变化时，Service Worker 会重建缓存
- 如果页面长期未更新，请先强制刷新：`Ctrl+Shift+R`
- 仍异常时：DevTools → Application → Service Workers → Unregister，再刷新

---

## 💾 数据存储与备份迁移

### 默认存储：IndexedDB

- 数据保存在浏览器本地，刷新/关闭不丢失
- 适合单浏览器、单设备日常使用

### 文件存储模式（推荐）

在 **系统设置 → 文件存储模式** 中选择一个文件夹，数据会以真实文件落盘：

```text
你选择的文件夹/
├── hr-data.json       # 全部业务数据
├── hr-config.json     # 系统参数与个人信息
└── attachments/       # 证件、附件等二进制文件
```

- 支持自动同步
- 支持启动时恢复文件夹授权
- 便于拷贝、备份和迁移

### 备份与恢复

在 **系统设置 → 数据备份 / 恢复** 中：

- **导出备份**：将所有非附件业务数据导出为 JSON 文件
- **恢复备份**：选择之前导出的 JSON 文件，覆盖当前数据

> 附件二进制未包含在 JSON 备份中；如需完整迁移，请使用文件存储模式复制整个文件夹。

### 换浏览器 / 换电脑迁移

1. 在旧环境开启文件存储模式，选择目标文件夹并等待同步
2. 将整个文件夹拷贝到新环境
3. 在新环境打开应用，进入“系统设置 → 文件存储模式”选择同一文件夹，或通过备份 JSON 恢复业务数据

---

## 🔄 更新机制

- 应用会读取 GitHub 仓库 `version.json` 与本地版本对比
- 发现新版本时提示更新说明
- 确认后自动下载新应用文件并写入缓存，刷新后生效
- 更新只替换应用代码，**不影响本地业务数据**

---

## ❓ 常见问题 / 故障排查

### 页面只显示标题/侧边栏，内容空白

- 可能是旧 Service Worker 缓存了旧版资源
- 解决：`Ctrl+Shift+R` 强制刷新；仍不行则 DevTools → Application → Service Workers → Unregister 后刷新

### 无法安装 PWA

- 确认使用 Chrome/Edge
- 确认访问地址是 `https://` 或 `localhost`
- `file://` 方式打开不支持安装

### 文件存储模式不可用 / 无法选择文件夹

- 需要 Chrome/Edge 且 secure context（`https://` 或 `localhost`）
- 如浏览器弹窗被拒绝，请在地址栏权限设置中允许

### 系统通知不生效

- 需要在浏览器地址栏/站点设置中允许通知权限
- 部分浏览器对通知权限要求用户主动交互后才能触发

### 数据丢失 / 恢复

- 默认 IndexedDB 数据与浏览器绑定，清除浏览器数据会删除
- 重要数据建议开启文件存储模式，并定期导出 JSON 备份

---

## 🛠 技术栈

- **前端框架**：Vue 3 + Vite
- **路由 / 状态**：Vue Router + Pinia
- **UI 组件库**：Element Plus
- **图表**：ECharts
- **Excel**：SheetJS
- **数据存储**：IndexedDB + localStorage
- **文件存储**：File System Access API
- **PWA**：Service Worker + Web App Manifest

---

## 🧑‍💻 开发与构建

### 常用命令

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器
npm run build      # 生产构建，输出到 dist/
npm run preview    # 预览构建产物
```

### 发布流程

1. 更新 `version.json`、`package.json` 版本号，以及 `public/sw.js` 中的 `SW_REV`
2. 提交并推送到 `main`
3. GitHub Actions 自动构建 `dist/` 并部署到 GitHub Pages

---

## 📁 目录结构

```text
hr-workbench/
├── index.html               # Vite 入口
├── package.json             # 依赖与脚本
├── vite.config.js           # Vite 配置
├── src/
│   ├── main.js              # Vue 应用入口
│   ├── App.vue              # 应用壳（侧边栏/顶栏/内容区）
│   ├── router/              # 路由与菜单
│   ├── stores/              # Pinia 状态
│   ├── services/            # IndexedDB、文件存储、更新等
│   ├── views/               # 各功能页面
│   │   ├── Dashboard.vue
│   │   ├── Org.vue
│   │   ├── Employee/
│   │   ├── Recruit/
│   │   ├── Attendance/
│   │   └── Todo/
│   └── styles/              # 全局样式
├── public/
│   ├── sw.js                # Service Worker
│   ├── version.json         # 版本与更新信息
│   ├── manifest.webmanifest # PWA 清单
│   └── icons/               # PWA 图标
├── dist/                    # 构建产物（生成）
└── .github/workflows/       # GitHub Pages 部署
```

---

## 🤝 参与贡献

欢迎提交 Issue 与 Pull Request，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📜 许可证

[MIT](LICENSE)
