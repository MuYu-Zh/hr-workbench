# 贡献指南 (Contributing)

感谢你对本项目的兴趣！以下是在本仓库贡献代码的规范。

## 开发环境

- Node.js 18+（仅用于本地静态服务与测试脚本）
- 现代浏览器（Chrome / Edge，建议用于 PWA 与文件存储功能）

## 项目约定

- 纯原生 HTML/CSS/JS，**不使用构建工具与运行时框架**（保持零依赖、双击可用）。
- 全局命名空间：`window.HR`（`HR.db` / `HR.ui` / `HR.router` / `HR.pages.*` 等）。
- 每个功能页面位于 `js/pages/<module>.js`，通过 `HR.router.register(path, def)` 注册。
- 所有业务数据读写走 `js/db.js`（IndexedDB 统一访问层），字段约定遵循：
  - 通用字段：`id` / `createdAt` / `updatedAt` / `deleted`（软删除）
  - date-only 存 `'YYYY-MM-DD'` 字符串，datetime 存毫秒时间戳
- 新增功能必须同步更新 `version.json` 中的版本号与文件清单（更新机制依赖）。

## 提交规范

- 分支：从 `main` 拉取 `feat/<功能名>` 或 `fix/<问题名>`。
- Commit message 使用中文或英文，遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：
  ```
  feat: 新增招聘需求登记模块
  fix: 修复花名册分页越界问题
  docs: 更新 README 使用说明
  ```
- 提交前运行测试：
  ```bash
  node tools/test-datalayer.js
  node tools/test-ui.js
  node tools/test-e2e.js
  ```

## 发布新版本流程

1. 更新 `CHANGELOG.md`。
2. 更新 `version.json`（版本号 + 变更说明 + 需要更新的文件清单）。
3. 提交并推送 `main` 分支。
4. 可选：创建 GitHub Release（tag 与 version.json 版本一致）。

## Issue 规范

- Bug 报告：说明复现步骤、浏览器版本、控制台报错。
- 功能建议：描述使用场景与期望行为。
