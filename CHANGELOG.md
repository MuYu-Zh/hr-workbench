# 更新日志

本项目的版本变更记录。版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2025-08-17

### 新增
- **桌面安装包**：Electron 壳 + electron-builder，支持 Windows（NSIS 安装包/便携版）与 macOS（DMG，Intel + Apple Silicon）
- **CI 自动构建**：GitHub Actions workflow（`.github/workflows/build-desktop.yml`），推送 `v*` tag 自动构建并发布到 GitHub Release

## [1.0.0] - 2025-08-17

### 新增（一期功能）
- **工作总览**：在职/入职/离职统计、近 6 月趋势图、生日·转正提醒、今日待办看板
- **员工档案管理**：在职花名册（搜索/筛选/导出）、离职档案（交接流程）、基本信息维护、证件/附件归档
- **待办 & 备忘录**：每日待办、备忘录笔记、重要事项提醒（支持系统通知）
- **常用网址**：分类快捷链接管理
- **系统设置**：个人信息、密码锁、全量备份/恢复、CSV 导出、基础参数配置

### 平台能力
- PWA 化：可安装为独立应用，Service Worker 离线缓存
- 文件存储模式：数据以真实文件落盘到用户指定文件夹（File System Access API）
- 更新机制：对接 GitHub 仓库自动检测与更新

### 技术说明
- 纯原生 HTML/CSS/JS，零构建、零第三方运行时依赖
- 数据存储：IndexedDB + localStorage（默认）/ 文件存储模式
- 二期模块（招聘/考勤/薪资/绩效/培训/合同/社保/组织/异动）菜单已预留
