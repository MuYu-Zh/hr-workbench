/* ============================================================
 * router.js — 路由与菜单（全局命名空间 HR.router）
 *  - 完整一级/二级菜单结构（保留需求单全部菜单，未实现模块标注"二期"）
 *  - hash 路由： #/dashboard  #/employee/roster ...
 * ============================================================ */
(function (global) {
  'use strict';

  var router = {};

  /* 菜单配置：group=一级分组，items=二级页面 */
  var MENU = [
    { key: 'dashboard', type: 'page', icon: '📊', label: '工作总览', path: '/dashboard' },
    {
      key: 'employee', type: 'group', icon: '👥', label: '员工档案管理',
      items: [
        { key: 'roster', label: '在职员工花名册', path: '/employee/roster' },
        { key: 'resigned', label: '离职员工档案', path: '/employee/resigned' },
        { key: 'profile', label: '员工基本信息维护', path: '/employee/profile' },
        { key: 'attachments', label: '员工证件 / 附件归档', path: '/employee/attachments' }
      ]
    },
    {
      key: 'recruit', type: 'group', icon: '📣', label: '招聘管理', coming: true,
      items: [
        { key: 'req', label: '招聘需求登记', path: '/recruit/req' },
        { key: 'candidates', label: '候选人简历库', path: '/recruit/candidates' },
        { key: 'interviews', label: '面试记录与进度跟踪', path: '/recruit/interviews' },
        { key: 'offers', label: 'offer 发放记录', path: '/recruit/offers' },
        { key: 'channels', label: '招聘渠道统计', path: '/recruit/channels' }
      ]
    },
    {
      key: 'attendance', type: 'group', icon: '⏰', label: '考勤管理', coming: true,
      items: [
        { key: 'monthly', label: '月度考勤汇总表', path: '/attendance/monthly' },
        { key: 'requests', label: '请假 / 加班 / 出差申请审批', path: '/attendance/requests' },
        { key: 'remedy', label: '补卡申请记录', path: '/attendance/remedy' },
        { key: 'anomaly', label: '考勤异常预警', path: '/attendance/anomaly' },
        { key: 'schedule', label: '排班管理', path: '/attendance/schedule' }
      ]
    },
    {
      key: 'payroll', type: 'group', icon: '💰', label: '薪资管理', coming: true,
      items: [
        { key: 'accounts', label: '员工薪资台账', path: '/payroll/accounts' },
        { key: 'monthly', label: '月度工资表生成', path: '/payroll/monthly' },
        { key: 'adjust', label: '薪资调整记录', path: '/payroll/adjust' },
        { key: 'deductions', label: '个税 / 社保代扣明细', path: '/payroll/deductions' },
        { key: 'payslips', label: '工资条发放记录', path: '/payroll/payslips' }
      ]
    },
    {
      key: 'perf', type: 'group', icon: '🎯', label: '绩效考核', coming: true,
      items: [
        { key: 'cycles', label: '考核周期设置', path: '/perf/cycles' },
        { key: 'reviews', label: '员工绩效考核表', path: '/perf/reviews' },
        { key: 'summary', label: '考核结果汇总', path: '/perf/summary' },
        { key: 'interviews', label: '绩效面谈记录', path: '/perf/interviews' },
        { key: 'distribution', label: '绩效等级分布统计', path: '/perf/distribution' }
      ]
    },
    {
      key: 'training', type: 'group', icon: '📚', label: '培训与发展', coming: true,
      items: [
        { key: 'plans', label: '培训计划制定', path: '/training/plans' },
        { key: 'records', label: '培训记录归档', path: '/training/records' },
        { key: 'certs', label: '员工技能证书管理', path: '/training/certs' },
        { key: 'evals', label: '培训效果评估', path: '/training/evals' }
      ]
    },
    {
      key: 'contract', type: 'group', icon: '📄', label: '劳动合同管理', coming: true,
      items: [
        { key: 'ledger', label: '合同台账（签订 / 续签 / 变更）', path: '/contract/ledger' },
        { key: 'expiry', label: '合同到期提醒', path: '/contract/expiry' },
        { key: 'probation', label: '试用期管理', path: '/contract/probation' },
        { key: 'templates', label: '合同模板管理', path: '/contract/templates' }
      ]
    },
    {
      key: 'social', type: 'group', icon: '🛡️', label: '社保公积金管理', coming: true,
      items: [
        { key: 'insurance', label: '社保缴纳台账', path: '/social/insurance' },
        { key: 'fund', label: '公积金缴纳台账', path: '/social/fund' },
        { key: 'declares', label: '增减员申报记录', path: '/social/declares' },
        { key: 'base', label: '缴费基数调整记录', path: '/social/base' },
        { key: 'claims', label: '社保待遇申领记录', path: '/social/claims' }
      ]
    },
    {
      key: 'org', type: 'group', icon: '🏢', label: '组织架构管理', coming: true,
      items: [
        { key: 'departments', label: '部门设置与调整', path: '/org/departments' },
        { key: 'positions', label: '岗位职级体系', path: '/org/positions' },
        { key: 'chart', label: '组织架构图', path: '/org/chart' },
        { key: 'headcount', label: '人员编制管理', path: '/org/headcount' }
      ]
    },
    {
      key: 'transfer', type: 'group', icon: '🔄', label: '员工异动管理', coming: true,
      items: [
        { key: 'regularize', label: '转正申请与审批', path: '/transfer/regularize' },
        { key: 'adjust', label: '调岗 / 调薪记录', path: '/transfer/adjust' },
        { key: 'promotion', label: '晋升 / 降职记录', path: '/transfer/promotion' },
        { key: 'resign', label: '离职申请与交接', path: '/transfer/resign' }
      ]
    },
    {
      key: 'todo', type: 'group', icon: '✅', label: '待办 & 备忘录',
      items: [
        { key: 'daily', label: '人事每日待办事项', path: '/todo/daily' },
        { key: 'memos', label: '备忘录笔记', path: '/todo/memos' },
        { key: 'reminders', label: '重要事项标记提醒', path: '/todo/reminders' }
      ]
    },
    { key: 'links', type: 'page', icon: '🔗', label: '常用网址', path: '/links' }
  ];

  /* 页面注册表：path → { title, render(contentEl) } */
  var PAGES = {};

  router.register = function (path, def) {
    PAGES[path] = def;
  };

  router.getPages = function () { return PAGES; };
  router.getMenu = function () { return MENU; };

  /* ---------- 菜单渲染 ---------- */
  router.renderMenu = function () {
    var menuEl = document.getElementById('menu');
    var footEl = document.getElementById('sidebar-foot');
    var state = HR.uiState.get();
    var groups = state.openGroups || {};
    var activePath = state.active || 'dashboard';

    menuEl.innerHTML = '';
    footEl.innerHTML = '';

    MENU.forEach(function (g) {
      if (g.type === 'page') {
        var btn = document.createElement('button');
        btn.className = 'menu-item' + (activePath === g.path ? ' active' : '');
        btn.innerHTML = '<span class="i-dot"></span><span class="g-ico">' + g.icon + '</span><span>' + HR.utils.esc(g.label) + '</span>';
        btn.onclick = function () { router.go(g.path); };
        menuEl.appendChild(btn);
        return;
      }

      // group
      var section = document.createElement('div');
      section.className = 'menu-section';

      var gBtn = document.createElement('button');
      gBtn.className = 'menu-group' + (groups[g.key] ? ' open' : '');
      gBtn.innerHTML = '<span class="g-ico">' + g.icon + '</span><span>' + HR.utils.esc(g.label) + '</span>' +
        (g.coming ? '<span class="g-arrow" style="color:rgba(255,255,255,.3);font-size:10px">二期</span>' : '<span class="g-arrow">▶</span>');
      gBtn.onclick = function () {
        groups[g.key] = !groups[g.key];
        HR.uiState.set({ openGroups: groups });
        router.renderMenu();
      };
      section.appendChild(gBtn);

      // 若当前激活项属于该组，自动展开
      var hasActive = g.items.some(function (it) { return it.path === activePath; });
      var open = groups[g.key] || hasActive;

      if (open) {
        g.items.forEach(function (it) {
          var itemBtn = document.createElement('button');
          itemBtn.className = 'menu-item' + (activePath === it.path ? ' active' : '') + (g.coming ? ' coming' : '');
          itemBtn.innerHTML = '<span class="i-dot"></span><span>' + HR.utils.esc(it.label) + '</span>';
          itemBtn.onclick = function () {
            if (g.coming) {
              router.go(it.path); // 二期页面也路由，渲染占位
            } else {
              router.go(it.path);
            }
          };
          section.appendChild(itemBtn);
        });
      }

      menuEl.appendChild(section);
    });

    // 底部：系统设置
    var setBtn = document.createElement('button');
    setBtn.className = 'menu-item' + (activePath === '/settings' ? ' active' : '');
    setBtn.innerHTML = '<span class="i-dot"></span><span class="g-ico">⚙️</span><span>系统设置</span>';
    setBtn.onclick = function () { router.go('/settings'); };
    footEl.appendChild(setBtn);
  };

  /* ---------- 路由跳转 ---------- */
  router.go = function (path) {
    location.hash = '#' + path;
  };

  /* ---------- 当前路径 ---------- */
  router.currentPath = function () {
    var h = location.hash || '#/dashboard';
    return h.replace(/^#/, '') || '/dashboard';
  };

  /* ---------- 渲染当前页面 ---------- */
  router.render = function () {
    var path = router.currentPath();
    var content = document.getElementById('content');
    var titleEl = document.getElementById('page-title');
    var crumbEl = document.getElementById('page-crumb');

    var def = PAGES[path];
    if (!def) {
      // 查找菜单项以显示占位
      var found = null;
      MENU.forEach(function (g) {
        if (g.items) {
          g.items.forEach(function (it) { if (it.path === path) found = it; });
        } else if (g.path === path) found = g;
      });
      content.innerHTML = '';
      var page = document.createElement('div');
      page.className = 'page';
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="empty-tip"><span class="e-ico">🚧</span>「' + HR.utils.esc(found ? found.label : path) + '」模块规划于二期开发，敬请期待。</div>';
      page.appendChild(card);
      content.appendChild(page);
      titleEl.textContent = found ? found.label : '人事工作台';
      crumbEl.textContent = '二期规划中';
      HR.uiState.set({ active: path });
      return;
    }

    titleEl.textContent = def.title;
    crumbEl.textContent = def.crumb || '';
    HR.uiState.set({ active: path });

    content.innerHTML = '';
    var pageEl = document.createElement('div');
    pageEl.className = 'page';
    content.appendChild(pageEl);

    def.render(pageEl);
    router.renderMenu();
  };

  /* ---------- hashchange 监听 ---------- */
  router.start = function () {
    window.addEventListener('hashchange', router.render);
    router.render();
  };

  global.HR = global.HR || {};
  global.HR.router = router;
})(window);
