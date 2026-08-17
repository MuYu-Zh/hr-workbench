# 安全说明 (Security Policy)

## 支持的版本 (Supported Versions)

本项目为个人使用的单页应用，当前维护最新主分支（`main`）。

| 版本 | 支持状态 |
|---|---|
| main（最新） | ✅ 积极维护 |
| 历史 release | ⚠️ 仅关键安全问题修复 |

## 安全设计说明

- 所有数据保存在用户本地（IndexedDB / 用户指定文件夹），**不上传任何服务器**。
- 更新机制仅从 GitHub 仓库拉取**应用代码文件**，不涉及业务数据。
- 敏感字段（身份证号、手机号）在列表中默认脱敏展示。
- 可选本地密码锁保护（密码以哈希形式存于本地浏览器）。

## 报告漏洞 (Reporting a Vulnerability)

如发现安全漏洞，请**不要**在公开 Issue 中披露。请通过以下方式私密报告：

- 创建 [Security Advisory](https://github.com/MuYu-Zh/hr-workbench/security/advisories)（GitHub 私密安全通告）
- 或发送邮件至仓库所有者邮箱（见 GitHub 主页）

我们会在确认后尽快修复并发布补丁版本。
