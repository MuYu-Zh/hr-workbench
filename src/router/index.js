import { createRouter, createWebHashHistory } from 'vue-router'

const ComingSoon = () => import('@/views/ComingSoon.vue')

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '工作总览', crumb: '首页仪表盘', icon: '📊' } },
  { path: '/org', name: 'org', component: () => import('@/views/Org.vue'), meta: { title: '组织架构', crumb: '组织树维护与预览', icon: '🏢' } },
  { path: '/employee/roster', name: 'roster', component: () => import('@/views/Employee/Roster.vue'), meta: { title: '在职员工花名册', crumb: '员工档案管理', icon: '👥' } },
  { path: '/employee/resigned', name: 'resigned', component: () => import('@/views/Employee/Resigned.vue'), meta: { title: '离职员工档案', crumb: '员工档案管理' } },
  { path: '/employee/profile', name: 'profile', component: () => import('@/views/Employee/Profile.vue'), meta: { title: '员工基本信息维护', crumb: '员工档案管理' } },
  { path: '/employee/attachments', name: 'attachments', component: () => import('@/views/Employee/Attachments.vue'), meta: { title: '员工证件 / 附件归档', crumb: '员工档案管理' } },
  { path: '/recruit/requirements', name: 'recruit-requirements', component: () => import('@/views/Recruit/Requirements.vue'), meta: { title: '招聘需求登记', crumb: '招聘管理', icon: '📣' } },
  { path: '/recruit/candidates', name: 'recruit-candidates', component: () => import('@/views/Recruit/Candidates.vue'), meta: { title: '候选人简历库', crumb: '招聘管理' } },
  { path: '/recruit/interviews', name: 'recruit-interviews', component: () => import('@/views/Recruit/Interviews.vue'), meta: { title: '面试记录与进度跟踪', crumb: '招聘管理' } },
  { path: '/recruit/offers', name: 'recruit-offers', component: () => import('@/views/Recruit/Offers.vue'), meta: { title: 'offer 发放记录', crumb: '招聘管理' } },
  { path: '/recruit/channels', name: 'recruit-channels', component: () => import('@/views/Recruit/Channels.vue'), meta: { title: '招聘渠道统计', crumb: '招聘管理' } },
  { path: '/attendance/monthly', name: 'attendance-monthly', component: ComingSoon, meta: { title: '月度考勤汇总表', crumb: '考勤管理', icon: '⏰' } },
  { path: '/attendance/requests', name: 'attendance-requests', component: ComingSoon, meta: { title: '请假 / 加班 / 出差申请审批', crumb: '考勤管理' } },
  { path: '/attendance/remedy', name: 'attendance-remedy', component: ComingSoon, meta: { title: '补卡申请记录', crumb: '考勤管理' } },
  { path: '/attendance/anomaly', name: 'attendance-anomaly', component: ComingSoon, meta: { title: '考勤异常预警', crumb: '考勤管理' } },
  { path: '/attendance/schedule', name: 'attendance-schedule', component: ComingSoon, meta: { title: '排班管理', crumb: '考勤管理' } },
  { path: '/payroll/accounts', name: 'payroll-accounts', component: ComingSoon, meta: { title: '员工薪资台账', crumb: '薪资管理', icon: '💰' } },
  { path: '/payroll/monthly', name: 'payroll-monthly', component: ComingSoon, meta: { title: '月度工资表生成', crumb: '薪资管理' } },
  { path: '/payroll/adjust', name: 'payroll-adjust', component: ComingSoon, meta: { title: '薪资调整记录', crumb: '薪资管理' } },
  { path: '/payroll/deductions', name: 'payroll-deductions', component: ComingSoon, meta: { title: '个税 / 社保代扣明细', crumb: '薪资管理' } },
  { path: '/payroll/payslips', name: 'payroll-payslips', component: ComingSoon, meta: { title: '工资条发放记录', crumb: '薪资管理' } },
  { path: '/perf/cycles', name: 'perf-cycles', component: ComingSoon, meta: { title: '考核周期设置', crumb: '绩效考核', icon: '🎯' } },
  { path: '/perf/reviews', name: 'perf-reviews', component: ComingSoon, meta: { title: '员工绩效考核表', crumb: '绩效考核' } },
  { path: '/perf/summary', name: 'perf-summary', component: ComingSoon, meta: { title: '考核结果汇总', crumb: '绩效考核' } },
  { path: '/perf/interviews', name: 'perf-interviews', component: ComingSoon, meta: { title: '绩效面谈记录', crumb: '绩效考核' } },
  { path: '/perf/distribution', name: 'perf-distribution', component: ComingSoon, meta: { title: '绩效等级分布统计', crumb: '绩效考核' } },
  { path: '/training/plans', name: 'training-plans', component: ComingSoon, meta: { title: '培训计划制定', crumb: '培训与发展', icon: '📚' } },
  { path: '/training/records', name: 'training-records', component: ComingSoon, meta: { title: '培训记录归档', crumb: '培训与发展' } },
  { path: '/training/certs', name: 'training-certs', component: ComingSoon, meta: { title: '员工技能证书管理', crumb: '培训与发展' } },
  { path: '/training/evals', name: 'training-evals', component: ComingSoon, meta: { title: '培训效果评估', crumb: '培训与发展' } },
  { path: '/contract/ledger', name: 'contract-ledger', component: ComingSoon, meta: { title: '合同台账（签订 / 续签 / 变更）', crumb: '劳动合同管理', icon: '📄' } },
  { path: '/contract/expiry', name: 'contract-expiry', component: ComingSoon, meta: { title: '合同到期提醒', crumb: '劳动合同管理' } },
  { path: '/contract/probation', name: 'contract-probation', component: ComingSoon, meta: { title: '试用期管理', crumb: '劳动合同管理' } },
  { path: '/contract/templates', name: 'contract-templates', component: ComingSoon, meta: { title: '合同模板管理', crumb: '劳动合同管理' } },
  { path: '/social/insurance', name: 'social-insurance', component: ComingSoon, meta: { title: '社保缴纳台账', crumb: '社保公积金管理', icon: '🛡️' } },
  { path: '/social/fund', name: 'social-fund', component: ComingSoon, meta: { title: '公积金缴纳台账', crumb: '社保公积金管理' } },
  { path: '/social/declares', name: 'social-declares', component: ComingSoon, meta: { title: '增减员申报记录', crumb: '社保公积金管理' } },
  { path: '/social/base', name: 'social-base', component: ComingSoon, meta: { title: '缴费基数调整记录', crumb: '社保公积金管理' } },
  { path: '/social/claims', name: 'social-claims', component: ComingSoon, meta: { title: '社保待遇申领记录', crumb: '社保公积金管理' } },
  { path: '/transfer/regularize', name: 'transfer-regularize', component: ComingSoon, meta: { title: '转正申请与审批', crumb: '员工异动管理', icon: '🔄' } },
  { path: '/transfer/adjust', name: 'transfer-adjust', component: ComingSoon, meta: { title: '调岗 / 调薪记录', crumb: '员工异动管理' } },
  { path: '/transfer/promotion', name: 'transfer-promotion', component: ComingSoon, meta: { title: '晋升 / 降职记录', crumb: '员工异动管理' } },
  { path: '/transfer/resign', name: 'transfer-resign', component: ComingSoon, meta: { title: '离职申请与交接', crumb: '员工异动管理' } },
  { path: '/todo/daily', name: 'todo-daily', component: () => import('@/views/Todo/Daily.vue'), meta: { title: '人事每日待办事项', crumb: '待办 & 备忘录', icon: '✅' } },
  { path: '/todo/memos', name: 'todo-memos', component: () => import('@/views/Todo/Memos.vue'), meta: { title: '备忘录笔记', crumb: '待办 & 备忘录' } },
  { path: '/todo/reminders', name: 'todo-reminders', component: () => import('@/views/Todo/Reminders.vue'), meta: { title: '重要事项标记提醒', crumb: '待办 & 备忘录' } },
  { path: '/links', name: 'links', component: () => import('@/views/Links.vue'), meta: { title: '常用网址', crumb: '快捷入口', icon: '🔗' } },
  { path: '/settings', name: 'settings', component: () => import('@/views/Settings.vue'), meta: { title: '系统设置', crumb: '个人信息 · 密码 · 备份 · 参数', icon: '⚙️' } }
]

export const menu = [
  { path: '/dashboard', label: '工作总览', icon: '📊' },
  { path: '/org', label: '组织架构', icon: '🏢' },
  {
    label: '员工档案管理', icon: '👥',
    children: [
      { path: '/employee/roster', label: '在职员工花名册' },
      { path: '/employee/resigned', label: '离职员工档案' },
      { path: '/employee/profile', label: '员工基本信息维护' },
      { path: '/employee/attachments', label: '员工证件 / 附件归档' }
    ]
  },
  {
    label: '招聘管理', icon: '📣',
    children: [
      { path: '/recruit/requirements', label: '招聘需求登记' },
      { path: '/recruit/candidates', label: '候选人简历库' },
      { path: '/recruit/interviews', label: '面试记录与进度跟踪' },
      { path: '/recruit/offers', label: 'offer 发放记录' },
      { path: '/recruit/channels', label: '招聘渠道统计' }
    ]
  },
  {
    label: '考勤管理', icon: '⏰',
    children: [
      { path: '/attendance/monthly', label: '月度考勤汇总表' },
      { path: '/attendance/requests', label: '请假 / 加班 / 出差申请审批' },
      { path: '/attendance/remedy', label: '补卡申请记录' },
      { path: '/attendance/anomaly', label: '考勤异常预警' },
      { path: '/attendance/schedule', label: '排班管理' }
    ]
  },
  {
    label: '薪资管理', icon: '💰',
    children: [
      { path: '/payroll/accounts', label: '员工薪资台账' },
      { path: '/payroll/monthly', label: '月度工资表生成' },
      { path: '/payroll/adjust', label: '薪资调整记录' },
      { path: '/payroll/deductions', label: '个税 / 社保代扣明细' },
      { path: '/payroll/payslips', label: '工资条发放记录' }
    ]
  },
  {
    label: '绩效考核', icon: '🎯',
    children: [
      { path: '/perf/cycles', label: '考核周期设置' },
      { path: '/perf/reviews', label: '员工绩效考核表' },
      { path: '/perf/summary', label: '考核结果汇总' },
      { path: '/perf/interviews', label: '绩效面谈记录' },
      { path: '/perf/distribution', label: '绩效等级分布统计' }
    ]
  },
  {
    label: '培训与发展', icon: '📚',
    children: [
      { path: '/training/plans', label: '培训计划制定' },
      { path: '/training/records', label: '培训记录归档' },
      { path: '/training/certs', label: '员工技能证书管理' },
      { path: '/training/evals', label: '培训效果评估' }
    ]
  },
  {
    label: '劳动合同管理', icon: '📄',
    children: [
      { path: '/contract/ledger', label: '合同台账（签订 / 续签 / 变更）' },
      { path: '/contract/expiry', label: '合同到期提醒' },
      { path: '/contract/probation', label: '试用期管理' },
      { path: '/contract/templates', label: '合同模板管理' }
    ]
  },
  {
    label: '社保公积金管理', icon: '🛡️',
    children: [
      { path: '/social/insurance', label: '社保缴纳台账' },
      { path: '/social/fund', label: '公积金缴纳台账' },
      { path: '/social/declares', label: '增减员申报记录' },
      { path: '/social/base', label: '缴费基数调整记录' },
      { path: '/social/claims', label: '社保待遇申领记录' }
    ]
  },
  {
    label: '员工异动管理', icon: '🔄',
    children: [
      { path: '/transfer/regularize', label: '转正申请与审批' },
      { path: '/transfer/adjust', label: '调岗 / 调薪记录' },
      { path: '/transfer/promotion', label: '晋升 / 降职记录' },
      { path: '/transfer/resign', label: '离职申请与交接' }
    ]
  },
  {
    label: '待办 & 备忘录', icon: '✅',
    children: [
      { path: '/todo/daily', label: '人事每日待办事项' },
      { path: '/todo/memos', label: '备忘录笔记' },
      { path: '/todo/reminders', label: '重要事项标记提醒' }
    ]
  },
  { path: '/links', label: '常用网址', icon: '🔗' },
  { path: '/settings', label: '系统设置', icon: '⚙️' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 人事工作台` : '人事工作台'
})

export default router
