import { db } from './db'

const DICT_SEED = [
  { group: 'education', value: '博士', label: '博士' },
  { group: 'education', value: '硕士', label: '硕士' },
  { group: 'education', value: '本科', label: '本科' },
  { group: 'education', value: '大专', label: '大专' },
  { group: 'education', value: '高中', label: '高中' },
  { group: 'education', value: '中专', label: '中专' },
  { group: 'employment_type', value: 'fulltime', label: '全职' },
  { group: 'employment_type', value: 'intern', label: '实习' },
  { group: 'employment_type', value: 'parttime', label: '兼职' },
  { group: 'marital_status', value: 'single', label: '未婚' },
  { group: 'marital_status', value: 'married', label: '已婚' },
  { group: 'marital_status', value: 'divorced', label: '离异' },
  { group: 'marital_status', value: 'other', label: '其他' },
  { group: 'employee_status', value: 'active', label: '在职' },
  { group: 'employee_status', value: 'resigning', label: '离职交接中' },
  { group: 'employee_status', value: 'resigned', label: '已离职' },
  { group: 'attachment_category', value: 'id_card', label: '身份证' },
  { group: 'attachment_category', value: 'diploma', label: '学历证书' },
  { group: 'attachment_category', value: 'cert', label: '资格证书' },
  { group: 'attachment_category', value: 'contract', label: '劳动合同' },
  { group: 'attachment_category', value: 'photo', label: '证件照' },
  { group: 'attachment_category', value: 'resume', label: '简历' },
  { group: 'attachment_category', value: 'other', label: '其他' },
  { group: 'link_category', value: 'social_security', label: '社保官网' },
  { group: 'link_category', value: 'fund', label: '公积金中心' },
  { group: 'link_category', value: 'tax', label: '个税系统' },
  { group: 'link_category', value: 'recruiting', label: '招聘平台' },
  { group: 'link_category', value: 'oa', label: 'OA 系统' },
  { group: 'link_category', value: 'other', label: '其他' },
  { group: 'priority', value: 'high', label: '高' },
  { group: 'priority', value: 'medium', label: '中' },
  { group: 'priority', value: 'low', label: '低' },
  { group: 'recruit_channel', value: 'boss', label: 'BOSS直聘' },
  { group: 'recruit_channel', value: 'liepin', label: '猎聘' },
  { group: 'recruit_channel', value: 'zhilian', label: '智联招聘' },
  { group: 'recruit_channel', value: '51job', label: '前程无忧' },
  { group: 'recruit_channel', value: 'internal', label: '内部推荐' },
  { group: 'recruit_channel', value: 'campus', label: '校园招聘' },
  { group: 'recruit_channel', value: 'headhunter', label: '猎头' },
  { group: 'recruit_channel', value: 'other', label: '其他' },
  { group: 'recruit_requirement_status', value: 'draft', label: '草稿' },
  { group: 'recruit_requirement_status', value: 'approving', label: '审批中' },
  { group: 'recruit_requirement_status', value: 'recruiting', label: '招聘中' },
  { group: 'recruit_requirement_status', value: 'closed', label: '已关闭' },
  { group: 'candidate_status', value: 'pending', label: '待筛选' },
  { group: 'candidate_status', value: 'screening', label: '初筛通过' },
  { group: 'candidate_status', value: 'interviewing', label: '面试中' },
  { group: 'candidate_status', value: 'hired', label: '已录用' },
  { group: 'candidate_status', value: 'rejected', label: '已淘汰' },
  { group: 'candidate_status', value: 'onboarded', label: '已入职' },
  { group: 'interview_result', value: 'pass', label: '通过' },
  { group: 'interview_result', value: 'pending', label: '待定' },
  { group: 'interview_result', value: 'fail', label: '不通过' },
  { group: 'offer_status', value: 'issued', label: '已发放' },
  { group: 'offer_status', value: 'accepted', label: '已接受' },
  { group: 'offer_status', value: 'rejected', label: '已拒绝' },
  { group: 'offer_status', value: 'expired', label: '已过期' },
  { group: 'attendance_request_type', value: 'leave', label: '请假' },
  { group: 'attendance_request_type', value: 'overtime', label: '加班' },
  { group: 'attendance_request_type', value: 'business_trip', label: '出差' },
  { group: 'leave_type', value: 'annual', label: '年假' },
  { group: 'leave_type', value: 'sick', label: '病假' },
  { group: 'leave_type', value: 'personal', label: '事假' },
  { group: 'leave_type', value: 'marriage', label: '婚假' },
  { group: 'leave_type', value: 'maternity', label: '产假' },
  { group: 'leave_type', value: 'compensatory', label: '调休' },
  { group: 'leave_type', value: 'other', label: '其他' },
  { group: 'attendance_remedy_timepoint', value: 'on', label: '上班卡' },
  { group: 'attendance_remedy_timepoint', value: 'off', label: '下班卡' },
  { group: 'attendance_anomaly_type', value: 'late', label: '迟到' },
  { group: 'attendance_anomaly_type', value: 'early_leave', label: '早退' },
  { group: 'attendance_anomaly_type', value: 'missing_punch', label: '缺卡' },
  { group: 'attendance_anomaly_type', value: 'absenteeism', label: '旷工' },
  { group: 'attendance_anomaly_type', value: 'overtime_abnormal', label: '异常加班' },
  { group: 'attendance_anomaly_type', value: 'duplicate', label: '重复打卡' },
  { group: 'attendance_request_status', value: 'draft', label: '草稿' },
  { group: 'attendance_request_status', value: 'pending', label: '待审批' },
  { group: 'attendance_request_status', value: 'approved', label: '已通过' },
  { group: 'attendance_request_status', value: 'rejected', label: '已驳回' }
]

const LINK_SEED = [
  { name: '人力资源社会保障部', url: 'https://www.mohrss.gov.cn', category: 'social_security', icon: '🏛️' },
  { name: '全国社保公共服务平台', url: 'https://si.12333.gov.cn', category: 'social_security', icon: '🛡️' },
  { name: '全国住房公积金', url: 'https://www.mohurd.gov.cn', category: 'fund', icon: '🏠' },
  { name: '自然人电子税务局', url: 'https://etax.chinatax.gov.cn', category: 'tax', icon: '🧾' },
  { name: '个人所得税 APP 官网', url: 'https://www.chinatax.gov.cn', category: 'tax', icon: '💰' },
  { name: 'BOSS直聘', url: 'https://www.zhipin.com', category: 'recruiting', icon: '💼' },
  { name: '猎聘', url: 'https://www.liepin.com', category: 'recruiting', icon: '🔍' },
  { name: '智联招聘', url: 'https://www.zhaopin.com', category: 'recruiting', icon: '📋' }
]

export async function seedIfEmpty() {
  const dicts = await db.getAll('sys_dict')
  const jobs = []
  if (dicts.length === 0) {
    jobs.push(db.bulkAdd('sys_dict', DICT_SEED.map((d, i) => Object.assign({ sortOrder: i, builtin: true }, d))))
  }
  const links = await db.getAll('quick_link')
  if (links.length === 0) {
    jobs.push(db.bulkAdd('quick_link', LINK_SEED.map((l, i) => Object.assign({ sortOrder: i }, l))))
  }
  return Promise.all(jobs)
}

const DEMO_EMPLOYEES = [
  {
    employeeNo: 'EM2024001', name: '陈静', gender: 'female', nationality: '汉族', maritalStatus: 'married',
    household: '北京市朝阳区', birthDate: '1992-05-12', idCard: '110101199205120022', phone: '13800138001',
    homePhone: '010-55667788', email: 'chenjing@example.com', address: '北京市朝阳区建国路88号',
    emergencyContact: { name: '陈父', phone: '13900139000', relation: '父亲' },
    departmentId: null, hireDate: '2024-03-01', regularDate: '2024-09-01',
    employmentType: 'fulltime', education: '本科', school: '北京师范大学', major: '人力资源管理',
    graduateDate: '2014-06-30', bankCardNo: '6222020200000000001', socialAccountNo: '110101199205120022',
    fundAccountNo: '110101199205120022', status: 'active', remark: ''
  },
  {
    employeeNo: 'EM2024002', name: '王浩', gender: 'male', nationality: '汉族', maritalStatus: 'single',
    household: '上海市浦东新区', birthDate: '1995-11-03', idCard: '310101199511030033', phone: '13800138002',
    homePhone: '', email: 'wanghao@example.com', address: '上海市浦东新区世纪大道100号',
    emergencyContact: { name: '王母', phone: '13900139001', relation: '母亲' },
    departmentId: null, hireDate: '2024-06-15', regularDate: '2024-12-15',
    employmentType: 'fulltime', education: '硕士', school: '上海交通大学', major: '计算机科学与技术',
    graduateDate: '2023-06-30', bankCardNo: '6222020200000000002', socialAccountNo: '310101199511030033',
    fundAccountNo: '310101199511030033', status: 'active', remark: ''
  }
]

export async function loadDemoEmployees() {
  // 示例员工只允许写入默认企业，新企业保持空数据空间
  if (db.currentEnterpriseId !== 'default') return { skipped: true, count: 0, reason: '非默认企业不生成示例员工' }
  const emps = await db.getAll('employee')
  if (emps.length > 0) return { skipped: true, count: emps.length }
  await db.bulkAdd('employee', DEMO_EMPLOYEES)
  return { skipped: false, count: DEMO_EMPLOYEES.length }
}

const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v) } catch (e) { return fallback }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) { /* ignore */ }
  },
  remove(key) {
    try { localStorage.removeItem(key) } catch (e) { /* ignore */ }
  }
}

export const ls = LS

export default { seedIfEmpty, loadDemoEmployees, ls }
