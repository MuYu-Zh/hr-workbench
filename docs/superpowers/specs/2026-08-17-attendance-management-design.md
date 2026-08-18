# 考勤管理模块 设计文档

日期：2026-08-17  
状态：已确认  
方案：在当前 Vue 3 + Vite 项目中直接实现，内置钉钉考勤 xlsx 导入器

## 1. 背景与目标

在 `hr-workbench` 中实现完整的“考勤管理”模块，覆盖：

1. 月度考勤汇总表
2. 请假 / 加班 / 出差申请审批
3. 补卡申请记录
4. 考勤异常预警
5. 排班管理

同时考虑考勤数据可能来自**企业微信、钉钉的考勤 .xlsx 导出**，本期先以**钉钉格式**为主，支持两类文件：

- 每日打卡明细 / 流水
- 月度汇总导出

## 2. 数据模型与存储

### 2.1 数据库升级

- `DB_VERSION` 从 `3` 升到 `4`
- 新增以下 store：

| store | 用途 | 关键字段 |
| --- | --- | --- |
| `attendance_request` | 请假 / 加班 / 出差申请 | employeeId, type, leaveType, startTime, endTime, duration, reason, status |
| `attendance_remedy` | 补卡申请 | employeeId, remedyDate, timePoint, reason, status |
| `attendance_anomaly` | 考勤异常 | employeeId, date, type, detail, handled, handleNote |
| `shift` | 班次字典 | name, startTime, endTime, flexible, color |
| `schedule` | 排班明细 | employeeId, workDate, shiftId, departmentId |
| `attendance_monthly` | 月度考勤汇总 | employeeId, month, expectedDays, actualDays, lateCount, earlyCount, absentDays, leaveDays, overtimeHours, tripDays, anomalyCount, manualAdjusted |

### 2.2 状态字典

在 `sys_dict` 中补充：

- `attendance_request_type`：leave / overtime / business_trip
- `leave_type`：annual / sick / personal / marriage / maternity / compensatory / other
- `attendance_remedy_timepoint`：on / off
- `attendance_anomaly_type`：late / early_leave / missing_punch / absenteeism / overtime_abnormal / duplicate
- `attendance_request_status`：draft / pending / approved / rejected

### 2.3 通用约定

- 所有新表沿用 `id / createdAt / updatedAt / deleted`
- date-only 字段统一存 `YYYY-MM-DD` 字符串
- 审批类状态手动维护，不引入审批留痕表

## 3. 钉钉考勤 xlsx 导入

### 3.1 导入入口

- 月度考勤汇总页提供“导入钉钉考勤数据”按钮
- 支持 `.xlsx` / `.xls`
- 自动识别文件类型：
  1. 打卡明细 / 流水
  2. 月度汇总

### 3.2 员工匹配

- 优先按工号匹配系统内员工
- 工号不存在时按姓名匹配
- 匹配不到的行标记为“未匹配”，不阻断其他数据

### 3.3 打卡明细导入

- 识别常见钉钉表头：姓名、工号、日期、班次、上班打卡、下班打卡、打卡结果等
- 每条记录写入/更新 `attendance_monthly` 对应员工、月份的原始打卡数据
- 同员工同日期以最后一次导入为准

### 3.4 月度汇总导入

- 识别常见钉钉汇总表头：姓名、工号、月份、出勤天数、迟到次数、早退次数、缺卡次数、请假天数等
- 直接写入 `attendance_monthly`
- 已存在记录时覆盖更新

### 3.5 导入结果反馈

- 成功导入 N 条
- 新增员工汇总 N 条
- 更新员工汇总 N 条
- 未匹配员工 N 条（附姓名/工号）
- 解析失败行 N 条（附行号和原因）

### 3.6 模板适配

- 钉钉导出格式可能随版本变化
- 先按通用字段名做模糊匹配（列名包含“工号”“姓名”“日期”“上班”“下班”等）
- 后续如有真实样本，可精确对齐列名

## 4. 月度考勤汇总生成与手动修正

### 4.1 生成方式

- 导入钉钉月度汇总
- 从打卡明细自动计算
- 手动录入 / 修正

### 4.2 页面功能

- 月份选择器（默认当月）
- 汇总表按员工展示：
  - 工号、姓名、部门
  - 应出勤 / 实际出勤
  - 迟到 / 早退 / 缺卡 / 旷工
  - 请假天数 / 加班时长 / 出差天数
  - 异常次数
- 操作：
  - 导入钉钉考勤数据
  - 从打卡明细自动计算
  - 手动编辑汇总
  - 导出 CSV

### 4.3 自动计算规则（一期简化）

- 应出勤天数 = 排班中工作日数量（无排班时按周一至周五计算）
- 实际出勤 = 有上下班打卡记录的天数
- 迟到 / 早退：根据班次上下班时间与打卡时间比较
- 请假天数 = 已通过请假申请单覆盖的工作日天数
- 加班时长 = 已通过加班申请单的时长
- 出差天数 = 已通过出差申请单的天数
- 异常次数 = 当月未处理异常数量

## 5. 子页面设计

### 5.1 月度考勤汇总表

- 月份筛选
- 汇总表 + 导出 CSV
- 导入钉钉考勤数据
- 从打卡明细自动计算
- 手动编辑汇总

### 5.2 请假 / 加班 / 出差申请审批

- 申请单列表：员工、类型、起止时间、时长、事由、状态
- 新增 / 编辑 / 删除
- 状态手动流转：草稿 → 待审批 → 已通过 / 已驳回
- 已通过申请单参与月度汇总计算

### 5.3 补卡申请记录

- 列表：员工、补卡日期、补卡时间点、原因、状态
- 新增 / 编辑 / 删除
- 状态手动流转
- 补卡通过后，对应日期异常自动标记已处理

### 5.4 考勤异常预警

- 列表：员工、日期、异常类型、明细、处理状态
- 支持新增 / 编辑 / 删除
- 支持批量标记已处理
- 支持筛选未处理
- 联动：月度汇总异常次数读取该表

### 5.5 排班管理

- 班次设置：班次名称、上下班时间、是否弹性、颜色
- 排班表：按员工 × 日期安排班次
- 用于月度汇总“应出勤天数”和“迟到/早退”判定

## 6. 涉及文件（预期）

- `src/services/db.js`：DB_VERSION、store 定义、升级迁移
- `src/services/seed.js`：补充考勤状态字典
- `src/services/dingtalkImport.js`：钉钉 xlsx 解析与导入
- `src/services/attendanceCalc.js`：月度汇总自动计算
- `src/views/Attendance/Monthly.vue`
- `src/views/Attendance/Requests.vue`
- `src/views/Attendance/Remedy.vue`
- `src/views/Attendance/Anomalies.vue`
- `src/views/Attendance/Schedule.vue`
- `src/router/index.js`：将考勤占位页替换为实际组件

## 7. 不在本期范围

- 企业微信考勤格式导入
- 完整审批流（仅手动状态流转）
- 复杂考勤规则（如弹性工时、跨天排班）
- 考勤导出为 xlsx（本期仅 CSV）

## 8. 测试要点

- 数据库升级后新增考勤 store 正常
- 钉钉打卡明细导入、月度汇总导入正常
- 员工匹配（工号优先/姓名兜底）正确
- 月度汇总自动计算与手动修正正常
- 申请单/补卡/异常/排班增删改查正常
- 补卡通过后异常自动处理正常
- 构建通过，PWA/Electron 不回归
