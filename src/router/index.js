import { createRouter, createWebHashHistory } from 'vue-router'

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
