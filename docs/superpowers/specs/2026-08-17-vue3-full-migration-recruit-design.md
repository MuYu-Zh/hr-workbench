# Vue 3 + Vite 全项目迁移 + 招聘管理 设计文档

日期：2026-08-17  
状态：已确认  
方案：Vue 3 + Vite + Element Plus + ECharts 全项目迁移，并新增招聘管理模块

## 1. 背景与目标

当前 `hr-workbench` 为原生 HTML/CSS/JS 单页应用，已有以下模块：

- 工作总览
- 组织架构
- 员工档案管理（花名册、离职档案、信息维护、附件归档）
- 待办 & 备忘录
- 常用网址
- 系统设置
- 最近新增：xlsx 批量导入、组织架构树与预览

本次目标：

1. 将整个项目迁移到 **Vue 3 + Vite**。
2. 引入 **Element Plus** 作为 UI 组件库。
3. 引入 **ECharts** 用于招聘渠道统计图表。
4. 完整实现“招聘管理”模块：
   - 招聘需求登记
   - 候选人简历库
   - 面试记录与进度跟踪
   - offer 发放记录
   - 招聘渠道统计
5. 保留现有能力：
   - PWA 离线缓存
   - 文件存储模式（File System Access API）
   - 自动更新
   - Electron 桌面端打包

## 2. 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Vue 3 |
| 构建工具 | Vite |
| 路由 | Vue Router |
| 状态管理 | Pinia |
| UI 组件库 | Element Plus |
| 图表 | ECharts |
| Excel | SheetJS（xlsx.full.min.js） |
| 数据存储 | IndexedDB（沿用 `hr_workbench` 数据库） |
| 本地配置 | localStorage |
| 桌面端 | Electron（保留现有 main/preload） |
| PWA | Service Worker（保留现有 `sw.js` 策略） |

## 3. 工程结构

```text
hr-workbench/
├── index.html                 # Vite 入口
├── src/
│   ├── main.js                # Vue 启动
│   ├── App.vue                # 应用壳（侧边栏 + 顶栏 + 内容区）
│   ├── router/index.js        # 路由表
│   ├── stores/                # Pinia stores
│   │   ├── settings.js
│   │   ├── profile.js
│   │   ├── ui.js
│   │   └── data.js            # 数据变更通知/文件存储同步
│   ├── services/
│   │   ├── db.js              # IndexedDB 数据访问层
│   │   ├── filestore.js       # 文件存储模式
│   │   ├── updater.js         # 自动更新
│   │   ├── desktop.js         # Electron preload 封装
│   │   ├── importExport.js    # xlsx/CSV 导入导出
│   │   └── recruitStats.js    # 招聘渠道统计聚合
│   ├── components/            # 通用组件
│   ├── views/
│   │   ├── Dashboard.vue
│   │   ├── Org.vue
│   │   ├── Employee/
│   │   │   ├── Roster.vue
│   │   │   ├── Resigned.vue
│   │   │   ├── Profile.vue
│   │   │   └── Attachments.vue
│   │   ├── Recruit/
│   │   │   ├── Requirements.vue
│   │   │   ├── Candidates.vue
│   │   │   ├── Interviews.vue
│   │   │   ├── Offers.vue
│   │   │   └── Channels.vue
│   │   ├── Todo/
│   │   │   ├── Daily.vue
│   │   │   ├── Memos.vue
│   │   │   └── Reminders.vue
│   │   ├── Links.vue
│   │   └── Settings.vue
│   └── styles/                # 全局样式
├── public/
│   ├── sw.js
│   ├── version.json
│   ├── manifest.webmanifest
│   └── icons/
├── electron/
│   ├── main.js
│   └── preload.js
├── vite.config.js
└── package.json
```

## 4. 路由与菜单

| 菜单 | 路由 | 组件 |
| --- | --- | --- |
| 工作总览 | `/dashboard` | Dashboard.vue |
| 组织架构 | `/org` | Org.vue |
| 员工档案管理 | `/employee/roster` | Roster.vue |
| | `/employee/resigned` | Resigned.vue |
| | `/employee/profile` | Profile.vue |
| | `/employee/attachments` | Attachments.vue |
| 招聘管理 | `/recruit/requirements` | Requirements.vue |
| | `/recruit/candidates` | Candidates.vue |
| | `/recruit/interviews` | Interviews.vue |
| | `/recruit/offers` | Offers.vue |
| | `/recruit/channels` | Channels.vue |
| 待办 & 备忘录 | `/todo/daily` | Daily.vue |
| | `/todo/memos` | Memos.vue |
| | `/todo/reminders` | Reminders.vue |
| 常用网址 | `/links` | Links.vue |
| 系统设置 | `/settings` | Settings.vue |

菜单顺序：

1. 工作总览
2. 组织架构
3. 员工档案管理
4. 招聘管理
5. 待办 & 备忘录
6. 常用网址
7. 系统设置（底部）

## 5. 数据层

### 5.1 数据库

- 沿用 IndexedDB 数据库名 `hr_workbench`
- `DB_VERSION` 升级到 `3`
- 迁移脚本：
  - 保留现有 store：`department / employee / employee_attachment / attachment / todo / memo / reminder / quick_link / sys_dict / status_log`
  - 新增招聘 store：
    - `recruit_requirement`
    - `candidate`
    - `interview`
    - `offer`
  - 新增 `sys_dict` 的 `recruit_channel` 渠道字典种子

### 5.2 招聘数据表

#### `recruit_requirement` 招聘需求

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| reqNo | string | 需求编号 |
| departmentId | string | 需求部门 |
| positionName | string | 招聘岗位 |
| headcount | number | 招聘人数 |
| urgency | string | high / medium / low |
| expectedDate | string | 期望到岗日期 |
| reason | string | 新增 / 替换 |
| jobDesc | string | 岗位职责与要求 |
| budget | number | 招聘预算 |
| status | string | draft / approving / recruiting / closed |
| createdAt / updatedAt / deleted | - | 通用字段 |

#### `candidate` 候选人

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| name | string | 姓名 |
| gender | string | 男 / 女 |
| phone | string | 电话 |
| email | string | 邮箱 |
| appliedPosition | string | 应聘岗位 |
| source | string | 来源渠道（sys_dict recruit_channel） |
| education | string | 学历 |
| workYears | number | 工作年限 |
| resumeAttachmentId | string | 简历附件 id（可空） |
| status | string | pending / screening / interviewing / hired / rejected / onboarded |
| requirementId | string | 关联招聘需求（可空） |
| employeeId | string | 入职建档后回填（可空） |

#### `interview` 面试记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| candidateId | string | 候选人 |
| positionName | string | 应聘岗位快照 |
| round | number | 轮次 1/2/3 |
| interviewer | string | 面试官 |
| interviewDate | string | 面试日期 |
| method | string | onsite / video / phone |
| comment | string | 评价 |
| result | string | pass / pending / fail |
| nextStep | string | 下一轮安排 |

#### `offer` offer 发放记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 主键 |
| candidateId | string | 候选人 |
| employeeId | string | 入职建档后回填（可空） |
| positionName | string | 应聘岗位 |
| offerDate | string | offer 日期 |
| salary | object | { base, performance, allowance } |
| onboardDate | string | 入职日期 |
| expireDate | string | 有效期 |
| status | string | issued / accepted / rejected / expired |

## 6. 招聘模块设计

### 6.1 招聘需求登记

- 字段：需求编号、需求部门、招聘岗位、招聘人数、紧急程度、期望到岗日期、招聘原因、岗位职责、预算、状态
- 操作：新增、编辑、删除、状态流转、搜索筛选
- 状态流转为手动：草稿 → 审批中 → 招聘中 → 已关闭

### 6.2 候选人简历库

- 字段：姓名、性别、电话、邮箱、应聘岗位、来源渠道、学历、工作年限、状态、关联招聘需求、简历附件
- 操作：
  - 新增 / 编辑 / 删除
  - 状态变更
  - 搜索筛选
  - CSV 导出
  - xlsx 导入（按手机号去重）
  - 简历附件上传 / 预览 / 下载
- 渠道来源使用 `sys_dict` 的 `recruit_channel`

### 6.3 面试记录与进度跟踪

- 以候选人为维度展示面试时间线
- 支持新增 / 编辑 / 删除面试记录
- 面试结果联动：
  - 通过 → 候选人状态自动变为 `hired`
  - 不通过 → 候选人状态自动变为 `rejected`

### 6.4 offer 发放记录

- 字段：候选人、应聘岗位、offer 日期、薪资构成、入职日期、有效期、状态
- 操作：新增、编辑、删除、状态变更
- offer 状态改为“已接受”时：
  - 提示用户手动创建员工档案
  - 不自动创建员工

### 6.5 招聘渠道统计

- 按渠道聚合：
  - 简历数 = 候选人总数
  - 面试数 = 有面试记录的候选人去重数
  - 录用数 = 状态为 `hired` 的候选人
  - 入职数 = 状态为 `onboarded` 的候选人
  - 转化率 = 各环节数量 / 简历数
- 展示：表格 + ECharts 柱状图/漏斗图
- 支持按时间段筛选

## 7. 通用交互迁移

| 现有手写实现 | Element Plus 替代 |
| --- | --- |
| `ui.table` | `el-table` |
| `ui.formModal` | `el-dialog` + `el-form` |
| `ui.confirm` | `ElMessageBox.confirm` |
| `ui.toast` | `ElMessage` |
| `ui.pager` | `el-pagination` |
| 手写菜单 | Vue Router + `el-menu` |
| 手写树 | `el-tree`（组织架构） |
| 手写图表 | ECharts |

## 8. PWA / 文件存储 / 自动更新 / Electron

### 8.1 PWA

- 保留 `public/sw.js` 版本化缓存策略
- 构建产物由 Vite 输出到 `dist`
- `version.json` 仍为版本来源
- `sw.js` 内 `SW_REV` 发版时同步更新

### 8.2 文件存储模式

- 迁移 `js/filestore.js` 到 `src/services/filestore.js`
- 保留 File System Access API 授权、自动同步、目录句柄持久化
- 数据变更通过 Pinia/事件触发自动同步

### 8.3 自动更新

- 迁移 `js/updater.js` 到 `src/services/updater.js`
- 保留从 GitHub raw 拉取 `version.json`、写 Cache Storage、提示刷新逻辑

### 8.4 Electron

- 保留 `electron/main.js`、`electron/preload.js`
- 主进程加载 `dist/index.html`
- `package.json` 脚本：
  - `dev`: Vite dev server
  - `build`: Vite build
  - `pack:win`: 先 build 再 electron-builder
  - `pack:mac`: 先 build 再 electron-builder
- `window.desktop` preload 能力保留，Vue 侧通过 `src/services/desktop.js` 封装

## 9. 构建与发布

- Vite 构建输出目录：`dist`
- `electron-builder` 配置基本不变
- GitHub Actions workflow 保留，构建命令调整为 `npm run build` + `npm run pack:win/pack:mac`

## 10. 数据兼容与迁移

- 现有 IndexedDB 数据不丢失
- `DB_VERSION=2 → 3` 仅新增招聘表，不破坏现有表
- 现有 localStorage 配置（settings / profile / ui.state）继续使用
- 旧版原生 JS 文件在迁移完成后移除或归档

## 11. 不在本期范围

- 招聘需求审批流（保持手动状态流转）
- offer 接受后自动创建员工档案（仅提示手动创建）
- 多用户 / 权限体系
- 招聘渠道字典的可视化维护页（本期内置种子，后续可加设置页）

## 12. 测试要点

- 旧数据升级后原有模块数据完整
- 所有旧模块迁移后功能与迁移前一致
- 招聘需求/候选人/面试/offer 增删改查正常
- 面试结果联动候选人状态正常
- offer 已接受提示手动创建员工正常
- 候选人 xlsx 导入、CSV 导出正常
- 渠道统计数量与转化率正确，ECharts 正常渲染
- PWA 离线、文件存储、自动更新、Electron 打包正常
