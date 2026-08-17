# 🧑‍💼 liqianyu 的人事工作台 (HR Workbench)

> 个人人事管理单页应用 · 数据本地存储 · 可安装为 PWA

一款面向个人人事专员（HR）的轻量工作台：员工档案、招聘、考勤、薪资、绩效、培训、合同、社保公积金、组织架构、员工异动、待办备忘、常用网址等模块一体化管理。**纯前端实现，零后端依赖，数据保存在浏览器本地**，支持文件存储模式（数据以真实文件落盘到用户指定文件夹）。

## ✨ 功能特性

### 一期（已实现）
| 模块 | 说明 |
|---|---|
| 📊 工作总览 | 在职/入职/离职统计卡、近 6 月趋势、生日·转正提醒、今日待办看板 |
| 👥 员工档案管理 | 在职花名册、离职档案、基本信息维护、证件/附件归档（上传/预览/下载） |
| ✅ 待办 & 备忘录 | 每日待办、备忘录笔记、重要事项提醒（系统通知） |
| 🔗 常用网址 | 社保/公积金/个税/招聘/OA 快捷链接管理 |
| ⚙️ 系统设置 | 个人信息、密码锁、数据备份/恢复、CSV 导出、基础参数、**文件存储模式**、**检查更新** |

### 二期（规划中）
招聘管理 · 考勤管理 · 薪资管理 · 绩效考核 · 培训与发展 · 劳动合同 · 社保公积金 · 组织架构 · 员工异动

## 🚀 快速开始

### 方式一：本地启动（推荐，功能完整）

```bash
# Windows：双击 start.bat
# 或手动启动：
python -m http.server 8765
# 打开浏览器访问 http://localhost:8765
```

### 方式二：直接打开

双击 `index.html`（file:// 模式），基础功能可用，但 PWA 安装、系统通知、文件存储模式不可用（需 localhost 或 https）。

### 安装为应用（PWA）

使用 Chrome/Edge 打开 `http://localhost:8765`，点击地址栏右侧 **安装图标**，即可安装为独立窗口应用，支持离线使用。

## 📁 数据存储

- **默认**：浏览器 IndexedDB（刷新/关闭不丢失）
- **文件存储模式**（推荐）：系统设置 → 数据存储位置 → 选择文件夹，数据以真实文件落盘：
  ```
  你选择的文件夹/
  ├── hr-data.json      # 全部业务数据
  ├── hr-config.json    # 系统参数与个人信息
  └── attachments/      # 证件、附件等二进制文件
  ```
  支持自动同步、从文件夹恢复、数据拷贝与迁移。

## 🔄 更新机制

系统设置 → 检查更新（或启动时静默检查），自动对比 GitHub 仓库 `version.json`：

- 检测到新版本 → 弹窗展示更新说明 → 确认后自动下载新文件并刷新
- 更新仅替换应用文件，**不影响本地数据**

## 🛠 技术栈

- 原生 HTML / CSS / JavaScript（零构建、零第三方运行时依赖）
- IndexedDB + localStorage（数据持久化）
- File System Access API（文件存储模式）
- Service Worker + Web App Manifest（PWA 离线）
- Notification API（系统通知）

## 📦 目录结构

```
hr-workbench/
├── index.html              # 应用入口
├── manifest.webmanifest    # PWA 清单
├── sw.js                   # Service Worker（离线缓存）
├── start.bat               # 本地启动脚本
├── version.json            # 版本与更新清单
├── css/style.css           # 样式
├── js/
│   ├── app.js              # 启动入口
│   ├── db.js               # IndexedDB 数据访问层
│   ├── filestore.js        # 文件存储引擎
│   ├── updater.js          # 更新检测与执行
│   ├── ui.js               # 通用 UI 组件
│   ├── router.js           # 路由与菜单
│   ├── seed.js             # 种子数据
│   ├── utils.js            # 工具函数
│   └── pages/              # 各功能页面
└── icons/                  # PWA 图标
```

## 🤝 参与贡献

欢迎提交 Issue 与 Pull Request，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📜 许可证

[MIT](LICENSE)
