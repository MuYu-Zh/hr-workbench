/* ============================================================
 * seed.js — 种子数据与系统参数（全局命名空间 HR.seed / HR.settings）
 *  - 首次打开时初始化：sys_dict 字典、默认部门/岗位/职级、常用网址
 *  - localStorage 管理：hr.settings / hr.profile / hr.ui.state
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- localStorage 封装 ---------- */
  var LS = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem(key);
        if (v === null) return fallback;
        return JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 忽略 */ }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* 忽略 */ }
    }
  };

  /* ---------- 系统参数默认值（依据数据模型 §1.2 hr.settings 键结构） ---------- */
  var DEFAULT_SETTINGS = {
    remindDays: { contract: [60, 30], cert: 30, birthday: 7, probation: 15 },
    attendance: { lateThresholdMin: 5, defaultStart: '09:00', defaultEnd: '18:00' },
    social: {
      pension: { company: 16, personal: 8 },
      medical: { company: 9, personal: 2 },
      unemployment: { company: 0.5, personal: 0.5 },
      injury: { company: 0.4, personal: 0 },
      maternity: { company: 0.8, personal: 0 }
    },
    fund: { companyRate: 12, personalRate: 12 },
    perf: { gradeRules: [{ grade: 'S', min: 90, label: '卓越' }, { grade: 'A', min: 80, label: '优秀' }, { grade: 'B', min: 70, label: '良好' }, { grade: 'C', min: 60, label: '待改进' }, { grade: 'D', min: 0, label: '不合格' }], maxScore: 100 },
    payslip: { roundTo: 0.01 },
    attachment: { maxSizeMB: 20 }
  };

  var settings = {
    get: function () { return Object.assign({}, DEFAULT_SETTINGS, LS.get('hr.settings', {})); },
    set: function (patch) {
      var cur = settings.get();
      var next = Object.assign({}, cur, patch);
      LS.set('hr.settings', next);
      return next;
    },
    reset: function () { LS.remove('hr.settings'); return settings.get(); },
    _defaults: DEFAULT_SETTINGS
  };

  var profile = {
    get: function () { return LS.get('hr.profile', { name: '', title: 'HR 管理', phone: '', email: '', passwordHash: '' }); },
    set: function (patch) {
      var cur = profile.get();
      var next = Object.assign({}, cur, patch);
      LS.set('hr.profile', next);
      return next;
    }
  };

  var uiState = {
    get: function () { return LS.get('hr.ui.state', { openGroups: {}, active: 'dashboard' }); },
    set: function (patch) {
      var cur = uiState.get();
      var next = Object.assign({}, cur, patch);
      LS.set('hr.ui.state', next);
      return next;
    }
  };

  /* ---------- 种子字典数据 ---------- */
  var DICT_SEED = [
    // 学历
    { group: 'education', value: '博士', label: '博士' },
    { group: 'education', value: '硕士', label: '硕士' },
    { group: 'education', value: '本科', label: '本科' },
    { group: 'education', value: '大专', label: '大专' },
    { group: 'education', value: '高中', label: '高中' },
    { group: 'education', value: '中专', label: '中专' },
    // 用工形式
    { group: 'employment_type', value: 'fulltime', label: '全职' },
    { group: 'employment_type', value: 'intern', label: '实习' },
    { group: 'employment_type', value: 'parttime', label: '兼职' },
    // 婚姻状况
    { group: 'marital_status', value: 'single', label: '未婚' },
    { group: 'marital_status', value: 'married', label: '已婚' },
    { group: 'marital_status', value: 'divorced', label: '离异' },
    { group: 'marital_status', value: 'other', label: '其他' },
    // 员工状态
    { group: 'employee_status', value: 'active', label: '在职' },
    { group: 'employee_status', value: 'resigning', label: '离职交接中' },
    { group: 'employee_status', value: 'resigned', label: '已离职' },
    // 附件分类
    { group: 'attachment_category', value: 'id_card', label: '身份证' },
    { group: 'attachment_category', value: 'diploma', label: '学历证书' },
    { group: 'attachment_category', value: 'cert', label: '资格证书' },
    { group: 'attachment_category', value: 'contract', label: '劳动合同' },
    { group: 'attachment_category', value: 'photo', label: '证件照' },
    { group: 'attachment_category', value: 'resume', label: '简历' },
    { group: 'attachment_category', value: 'other', label: '其他' },
    // 网址分类
    { group: 'link_category', value: 'social_security', label: '社保官网' },
    { group: 'link_category', value: 'fund', label: '公积金中心' },
    { group: 'link_category', value: 'tax', label: '个税系统' },
    { group: 'link_category', value: 'recruiting', label: '招聘平台' },
    { group: 'link_category', value: 'oa', label: 'OA 系统' },
    { group: 'link_category', value: 'other', label: '其他' },
    // 待办优先级
    { group: 'priority', value: 'high', label: '高' },
    { group: 'priority', value: 'medium', label: '中' },
    { group: 'priority', value: 'low', label: '低' }
  ];

  /* 默认部门 */
  var DEPT_SEED = [
    { name: '综合管理部', parentId: null },
    { name: '人力资源部', parentId: null },
    { name: '财务部', parentId: null },
    { name: '市场部', parentId: null },
    { name: '技术部', parentId: null }
  ];

  /* 默认岗位（含序列） */
  var POSITION_SEED = [
    { name: 'HR 专员', departmentId: null, series: 'functional' },
    { name: '招聘专员', departmentId: null, series: 'functional' },
    { name: '薪酬专员', departmentId: null, series: 'functional' },
    { name: '行政专员', departmentId: null, series: 'functional' },
    { name: '会计', departmentId: null, series: 'functional' },
    { name: '出纳', departmentId: null, series: 'functional' },
    { name: '市场专员', departmentId: null, series: 'functional' },
    { name: '产品经理', departmentId: null, series: 'professional' },
    { name: '前端工程师', departmentId: null, series: 'professional' },
    { name: '后端工程师', departmentId: null, series: 'professional' },
    { name: '测试工程师', departmentId: null, series: 'professional' },
    { name: '部门经理', departmentId: null, series: 'management' },
    { name: '总监', departmentId: null, series: 'management' }
  ];

  /* 默认职级 */
  var GRADE_SEED = [
    { code: 'P1', name: '初级专员', series: 'professional', order: 1 },
    { code: 'P2', name: '专员', series: 'professional', order: 2 },
    { code: 'P3', name: '高级专员', series: 'professional', order: 3 },
    { code: 'P4', name: '资深专员', series: 'professional', order: 4 },
    { code: 'P5', name: '专家', series: 'professional', order: 5 },
    { code: 'P6', name: '高级专家', series: 'professional', order: 6 },
    { code: 'M1', name: '主管', series: 'management', order: 10 },
    { code: 'M2', name: '经理', series: 'management', order: 11 },
    { code: 'M3', name: '高级经理', series: 'management', order: 12 },
    { code: 'M4', name: '总监', series: 'management', order: 13 },
    { code: 'M5', name: '副总裁', series: 'management', order: 14 }
  ];

  /* 默认常用网址 */
  var LINK_SEED = [
    { name: '人力资源社会保障部', url: 'https://www.mohrss.gov.cn', category: 'social_security', icon: '🏛️' },
    { name: '全国社保公共服务平台', url: 'https://si.12333.gov.cn', category: 'social_security', icon: '🛡️' },
    { name: '全国住房公积金', url: 'https://www.mohurd.gov.cn', category: 'fund', icon: '🏠' },
    { name: '自然人电子税务局', url: 'https://etax.chinatax.gov.cn', category: 'tax', icon: '🧾' },
    { name: '个人所得税 APP 官网', url: 'https://www.chinatax.gov.cn', category: 'tax', icon: '💰' },
    { name: 'BOSS直聘', url: 'https://www.zhipin.com', category: 'recruiting', icon: '💼' },
    { name: '猎聘', url: 'https://www.liepin.com', category: 'recruiting', icon: '🔍' },
    { name: '智联招聘', url: 'https://www.zhaopin.com', category: 'recruiting', icon: '📋' }
  ];

  /** 首次初始化：若字典为空则写入种子数据 */
  function seedIfEmpty() {
    return HR.db.getAll('sys_dict').then(function (dicts) {
      var jobs = [];
      if (dicts.length === 0) {
        jobs.push(HR.db.bulkAdd('sys_dict', DICT_SEED.map(function (d, i) {
          return Object.assign({ sortOrder: i, builtin: true }, d);
        })));
      }
      return HR.db.getAll('department').then(function (depts) {
        if (depts.length === 0) {
          var deptRecs = DEPT_SEED.map(function (d) {
            return Object.assign({ status: 'normal', sortOrder: 0, establishedDate: HR.utils.toDateStr(new Date()) }, d);
          });
          jobs.push(HR.db.bulkAdd('department', deptRecs));
        }
        return HR.db.getAll('position');
      }).then(function (positions) {
        if (positions.length === 0) {
          jobs.push(HR.db.bulkAdd('position', POSITION_SEED.map(function (p) {
            return Object.assign({ status: 'active', sortOrder: 0 }, p);
          })));
        }
        return HR.db.getAll('grade');
      }).then(function (grades) {
        if (grades.length === 0) {
          jobs.push(HR.db.bulkAdd('grade', GRADE_SEED.map(function (g) {
            return Object.assign({}, g);
          })));
        }
        return HR.db.getAll('quick_link');
      }).then(function (links) {
        if (links.length === 0) {
          jobs.push(HR.db.bulkAdd('quick_link', LINK_SEED.map(function (l, i) {
            return Object.assign({ sortOrder: i }, l);
          })));
        }
        return Promise.all(jobs);
      });
    });
  }

  /** 载入演示员工数据（用户可主动触发） */
  function loadDemoEmployees() {
    var demo = [
      {
        employeeNo: 'EM2024001', name: '陈静', gender: 'female', nationality: '汉族', maritalStatus: 'married',
        household: '北京市朝阳区', birthDate: '1992-05-12', idCard: '110101199205120022', phone: '13800138001',
        homePhone: '010-55667788', email: 'chenjing@example.com', address: '北京市朝阳区建国路88号',
        emergencyContact: { name: '陈父', phone: '13900139000', relation: '父亲' },
        departmentId: null, positionId: null, gradeId: null, hireDate: '2024-03-01', regularDate: '2024-09-01',
        employmentType: 'fulltime', education: '本科', school: '北京师范大学', major: '人力资源管理',
        graduateDate: '2014-06-30', bankCardNo: '6222020200000000001', socialAccountNo: '110101199205120022',
        fundAccountNo: '110101199205120022', status: 'active', remark: ''
      },
      {
        employeeNo: 'EM2024002', name: '王浩', gender: 'male', nationality: '汉族', maritalStatus: 'single',
        household: '上海市浦东新区', birthDate: '1995-11-03', idCard: '310101199511030033', phone: '13800138002',
        homePhone: '', email: 'wanghao@example.com', address: '上海市浦东新区世纪大道100号',
        emergencyContact: { name: '王母', phone: '13900139001', relation: '母亲' },
        departmentId: null, positionId: null, gradeId: null, hireDate: '2024-06-15', regularDate: '2024-12-15',
        employmentType: 'fulltime', education: '硕士', school: '上海交通大学', major: '计算机科学与技术',
        graduateDate: '2023-06-30', bankCardNo: '6222020200000000002', socialAccountNo: '310101199511030033',
        fundAccountNo: '310101199511030033', status: 'active', remark: ''
      },
      {
        employeeNo: 'EM2023003', name: '李婷', gender: 'female', nationality: '汉族', maritalStatus: 'single',
        household: '广州市天河区', birthDate: '1998-02-20', idCard: '440101199802200044', phone: '13800138003',
        homePhone: '', email: 'liting@example.com', address: '广州市天河区体育西路',
        emergencyContact: { name: '李父', phone: '13900139002', relation: '父亲' },
        departmentId: null, positionId: null, gradeId: null, hireDate: '2025-01-08', regularDate: '',
        employmentType: 'fulltime', education: '本科', school: '中山大学', major: '市场营销',
        graduateDate: '2023-06-30', bankCardNo: '6222020200000000003', socialAccountNo: '440101199802200044',
        fundAccountNo: '440101199802200044', status: 'active', remark: '试用期'
      },
      {
        employeeNo: 'EM2022004', name: '张伟', gender: 'male', nationality: '汉族', maritalStatus: 'married',
        household: '深圳市南山区', birthDate: '1988-07-25', idCard: '440301198807250055', phone: '13800138004',
        homePhone: '', email: 'zhangwei@example.com', address: '深圳市南山区科技园',
        emergencyContact: { name: '张妻', phone: '13900139003', relation: '配偶' },
        departmentId: null, positionId: null, gradeId: null, hireDate: '2022-10-10', regularDate: '2023-04-10',
        employmentType: 'fulltime', education: '本科', school: '华南理工大学', major: '软件工程',
        graduateDate: '2011-06-30', bankCardNo: '6222020200000000004', socialAccountNo: '440301198807250055',
        fundAccountNo: '440301198807250055', status: 'resigned',
        resignInfo: { date: '2025-06-30', type: 'voluntary', reason: '个人原因', handoverDone: true, handoverBy: '陈静', handoverDate: '2025-06-28' },
        resignDate: '2025-06-30', remark: ''
      }
    ];
    return HR.db.getAll('employee').then(function (emps) {
      if (emps.length > 0) {
        return { skipped: true, count: emps.length };
      }
      // 关联默认部门/岗位/职级
      return Promise.all([
        HR.db.getAll('department'),
        HR.db.getAll('position'),
        HR.db.getAll('grade')
      ]).then(function (res) {
        var depts = res[0], positions = res[1], grades = res[2];
        var byName = function (arr, name) {
          return arr.find(function (x) { return x.name === name; });
        };
        demo.forEach(function (d) {
          d.departmentId = (depts[1] || {}).id;         // 人力资源部
          d.positionId = (byName(positions, 'HR 专员') || positions[0] || {}).id;
          d.gradeId = (byName(grades, 'P2') || grades[1] || {}).id;
        });
        return HR.db.bulkAdd('employee', demo);
      }).then(function () { return { skipped: false, count: demo.length }; });
    });
  }

  global.HR = global.HR || {};
  global.HR.seed = { seedIfEmpty: seedIfEmpty, loadDemoEmployees: loadDemoEmployees };
  global.HR.settings = settings;
  global.HR.profile = profile;
  global.HR.uiState = uiState;
  global.HR.ls = LS;
})(window);
