/* ============================================================
 * dashboard.js — 工作总览（首页仪表盘）+ 共享数据查询助手
 * ============================================================ */
(function (global) {
  'use strict';

  var U = HR.utils, ui = HR.ui, db = HR.db;

  /* ========== 共享查询助手（暴露给其他页面使用） ========== */
  var query = {};

  /** 字典 options：group → [{value,label}] */
  query.dictOptions = function (group) {
    return db.getAllByIndex('sys_dict', 'group', group)
      .then(function (list) {
        list.sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
        return list.map(function (d) { return { value: d.value, label: d.label }; });
      });
  };

  /** 部门 options（含全部部门名 → id 映射） */
  query.deptOptions = function () {
    return db.getAll('department').then(function (list) {
      return list.map(function (d) {
        return { value: d.id, label: d.name + (d.status === 'disabled' ? '（停用）' : '') };
      });
    });
  };

  /** 名称映射：ids → name */
  query.nameOf = function (store, id) {
    if (!id) return '';
    return db.get(store, id).then(function (r) { return r ? (r.name || r.code || '') : ''; });
  };

  /** 获取所有在职员工（status=active，含试用期） */
  query.activeEmployees = function () {
    return db.query('employee', { filter: function (e) { return e.status === 'active'; } })
      .then(function (r) { return r.list; });
  };

  /** 获取所有员工（含离职，供离职档案用） */
  query.allEmployees = function () {
    return db.query('employee', { filter: function (e) { return true; }, sort: 'employeeNo', dir: 'asc' })
      .then(function (r) { return r.list; });
  };

  /** 员工名（带工号） */
  query.empName = function (emp) {
    if (!emp) return '—';
    return emp.name + ' <span class="mono muted" style="font-size:11px">' + U.esc(emp.employeeNo || '') + '</span>';
  };

  /** 统计助手：员工状态分布 */
  query.empStats = function () {
    return db.getAll('employee').then(function (list) {
      var active = 0, resigning = 0, resigned = 0;
      list.forEach(function (e) {
        if (e.status === 'active') active++;
        else if (e.status === 'resigning') resigning++;
        else if (e.status === 'resigned') resigned++;
      });
      return { active: active, resigning: resigning, resigned: resigned, total: list.length };
    });
  };

  /** 本月入职/离职统计 + 近6月趋势 */
  query.empTrend = function () {
    return db.getAll('employee').then(function (list) {
      var curMonth = U.curMonth();
      var cur = { hire: 0, resign: 0 };
      var months = U.recentMonths(6);
      var trend = months.map(function (m) { return { ym: m.ym, label: m.label, hire: 0, resign: 0 }; });

      list.forEach(function (e) {
        var h = (e.hireDate || '').slice(0, 7);
        var r = (e.resignDate || (e.resignInfo && e.resignInfo.date) || '').slice(0, 7);
        var t = trend.find(function (x) { return x.ym === h; });
        if (t) t.hire++;
        if (h === curMonth) cur.hire++;
        var tr = trend.find(function (x) { return x.ym === r; });
        if (tr) tr.resign++;
        if (r === curMonth) cur.resign++;
      });
      return { cur: cur, trend: trend };
    });
  };

  /** 提醒聚合：生日 / 转正 / 试用期（一期无合同模块，合同到期提醒二期接入） */
  query.reminders = function () {
    var s = HR.settings.get();
    var bDays = s.remindDays.birthday || 7;
    var pDays = s.remindDays.probation || 15;
    var cDays = s.remindDays.contract || [60, 30];

    return db.getAll('employee').then(function (list) {
      var items = [];
      list.forEach(function (e) {
        if (e.status !== 'active') return;
        // 生日（按今年计算）
        if (e.birthDate) {
          var b = U.toDate(e.birthDate);
          var thisYear = new Date();
          var bd = new Date(thisYear.getFullYear(), b.getMonth(), b.getDate());
          var diff = Math.round((bd - new Date(thisYear.getFullYear(), thisYear.getMonth(), thisYear.getDate())) / 86400000);
          if (diff < 0) bd = new Date(thisYear.getFullYear() + 1, b.getMonth(), b.getDate());
          diff = Math.round((bd - new Date(thisYear.getFullYear(), thisYear.getMonth(), thisYear.getDate())) / 86400000);
          if (diff <= bDays) {
            items.push({
              type: 'birthday', emp: e, date: U.toDateStr(bd), days: diff,
              label: '生日', ico: '🎂',
              level: diff <= 2 ? 'soon' : (diff <= bDays ? 'warn' : 'normal')
            });
          }
        }
        // 试用期结束提醒（未转正 & 有 hireDate）
        if (!e.regularDate && e.hireDate) {
          var probEnd = new Date(U.toDate(e.hireDate).getTime());
          // 默认试用期 3 个月（可用参数配置，一期固定 90 天）
          probEnd.setDate(probEnd.getDate() + 90);
          var pDiff = U.daysFromToday(U.toDateStr(probEnd));
          if (pDiff !== null && pDiff <= pDays) {
            items.push({
              type: 'probation', emp: e, date: U.toDateStr(probEnd), days: pDiff,
              label: '转正', ico: '📌',
              level: pDiff < 0 ? 'past' : (pDiff <= 10 ? 'soon' : 'warn')
            });
          }
        }
      });
      items.sort(function (a, b) { return a.days - b.days; });
      return items;
    });
  };

  /** 今日待办 */
  query.todayTodos = function () {
    var today = U.today();
    return db.query('todo', {
      filter: function (t) { return t.date === today && !t.done; },
      sort: 'priority', dir: 'desc',
      sortMap: { high: 3, medium: 2, low: 1 }
    }).then(function (r) { return r.list; });
  };

  /** 待审批数量（一期无审批单据，返回 0，二期接入） */
  query.pendingApprovals = function () {
    return Promise.resolve({ count: 0, items: [] });
  };

  /** 考勤异常数量（一期无考勤模块，返回 0，二期接入） */
  query.anomalyCount = function () {
    return Promise.resolve(0);
  };

  global.HR.query = query;

  /* ========== 仪表盘页面 ========== */
  var page = {};

  page.render = function (root) {
    root.innerHTML = '<div class="grid grid-4" id="stat-cards"></div>' +
      '<div class="grid grid-2" style="margin-top:18px">' +
      '  <div class="card" id="trend-card"></div>' +
      '  <div class="card" id="remind-card"></div>' +
      '</div>' +
      '<div class="grid grid-2" style="margin-top:18px">' +
      '  <div class="card" id="todo-card"></div>' +
      '  <div class="card" id="approve-card"></div>' +
      '</div>';

    var cards = [
      { id: 'stat-active', tone: 'gold', ico: '👥', label: '在职人数', href: '/employee/roster' },
      { id: 'stat-resign', tone: 'coral', ico: '🚪', label: '本月离职', href: '/employee/resigned' },
      { id: 'stat-hire', tone: 'green', ico: '✨', label: '本月入职', href: '/employee/roster' },
      { id: 'stat-anomaly', tone: 'red', ico: '⚠️', label: '考勤异常待处理', href: '/attendance/anomaly' }
    ];

    var statWrap = document.getElementById('stat-cards');
    cards.forEach(function (c) {
      statWrap.insertAdjacentHTML('beforeend',
        '<div class="stat-card tone-' + c.tone + '" data-href="' + c.href + '">' +
        '<div class="s-acc"></div>' +
        '<div class="s-label"><span class="s-ico">' + c.ico + '</span>' + c.label + '</div>' +
        '<div class="s-value" id="' + c.id + '">—</div>' +
        '<div class="s-foot" id="' + c.id + '-foot"></div>' +
        '</div>');
    });

    // 点击跳转
    statWrap.querySelectorAll('.stat-card').forEach(function (el) {
      el.addEventListener('click', function () {
        var href = el.dataset.href;
        if (HR.router.getPages()[href]) HR.router.go(href);
        else HR.ui.toastWarn('该模块二期开放');
      });
    });

    renderStats();
    renderTrend();
    renderReminders();
    renderTodo();
    renderApprovals();
  };

  function renderStats() {
    Promise.all([query.empStats(), query.empTrend(), query.anomalyCount()])
      .then(function (res) {
        var stats = res[0], trend = res[1], anomaly = res[2];
        document.getElementById('stat-active').textContent = stats.active;
        document.getElementById('stat-active').nextElementSibling.textContent = '试用中 ' + countProbation() + ' 人 · 离职交接 ' + stats.resigning + ' 人';
        document.getElementById('stat-hire').textContent = trend.cur.hire;
        document.getElementById('stat-resign').textContent = trend.cur.resign;
        document.getElementById('stat-anomaly').textContent = anomaly;
        document.getElementById('stat-anomaly').nextElementSibling.textContent = '二期接入考勤数据';
      });
  }

  function countProbation() {
    return 0; // 一期简化：试用期人数由 reminders 计算，此处占位（二期按 probation 表统计）
  }

  function renderTrend() {
    query.empTrend().then(function (res) {
      var card = document.getElementById('trend-card');
      var max = 1;
      res.trend.forEach(function (t) { max = Math.max(max, t.hire, t.resign); });
      var html = '<div class="card-title"><span class="t-ico">📈</span>近 6 月入职 / 离职趋势<span class="t-sub">按月统计</span></div>' +
        '<div class="bars">';
      res.trend.forEach(function (t) {
        var hh = Math.max(4, Math.round(t.hire / max * 100));
        var rh = Math.max(4, Math.round(t.resign / max * 100));
        html += '<div class="bar-col">' +
          '<div class="bar-track">' +
          '<div class="bar-fill coral" style="height:' + rh + '%" title="离职 ' + t.resign + '"></div>' +
          '<div class="bar-fill gold" style="height:' + hh + '%" title="入职 ' + t.hire + '"></div>' +
          '</div>' +
          '<div class="bar-label">' + t.label + '</div>' +
          '</div>';
      });
      html += '</div><div class="mt12 muted" style="font-size:12px">🟡 入职 &nbsp;🟠 离职</div>';
      card.innerHTML = html;
    });
  }

  function renderReminders() {
    query.reminders().then(function (items) {
      var card = document.getElementById('remind-card');
      var html = '<div class="card-title"><span class="t-ico">🔔</span>生日 / 转正提醒<span class="t-sub">近 ' +
        (HR.settings.get().remindDays.birthday) + ' 天</span></div>';
      if (items.length === 0) {
        html += '<div class="remind-empty">🎉 近期无生日 / 转正提醒</div>';
      } else {
        html += '<div class="remind-list">';
        items.slice(0, 8).forEach(function (it) {
          var dayText = it.days < 0 ? ('已过 ' + (-it.days) + ' 天') : (it.days === 0 ? '今天' : it.days + ' 天后');
          html += '<div class="remind-item" data-href="/employee/profile">' +
            '<span>' + it.ico + '</span>' +
            '<span class="r-name">' + U.esc(it.emp.name) + ' · ' + it.label + '</span>' +
            '<span class="r-date">' + U.esc(it.date) + '</span>' +
            '<span class="r-days ' + it.level + '">' + dayText + '</span>' +
            '</div>';
        });
        html += '</div>';
      }
      card.innerHTML = html;
      card.querySelectorAll('.remind-item').forEach(function (el) {
        el.addEventListener('click', function () {
          HR.router.go('/employee/roster');
        });
      });
    });
  }

  function renderTodo() {
    query.todayTodos().then(function (todos) {
      var card = document.getElementById('todo-card');
      var html = '<div class="card-title"><span class="t-ico">✅</span>今日待办看板' +
        '<span class="t-sub">' + U.today() + '</span></div>';
      if (todos.length === 0) {
        html += '<div class="remind-empty">今日待办已清空 🎉</div>';
      } else {
        html += '<div class="remind-list">';
        todos.slice(0, 6).forEach(function (t) {
          var prio = { high: ['高', 'danger'], medium: ['中', 'warn'], low: ['低', 'ok'] }[t.priority] || ['中', 'gray'];
          html += '<div class="todo-item">' +
            '<span class="todo-check" data-id="' + t.id + '">✓</span>' +
            '<span class="t-content">' + U.esc(t.content) + '</span>' +
            '<span class="t-prio ' + prio[1] + '">' + prio[0] + '</span>' +
            '</div>';
        });
        html += '</div>';
      }
      card.innerHTML = html;
      card.querySelectorAll('.todo-check').forEach(function (el) {
        el.addEventListener('click', function () {
          db.get('todo', el.dataset.id).then(function (t) {
            if (!t) return;
            t.done = true;
            db.put('todo', t).then(function () {
              ui.toastOk('待办已完成');
              renderTodo();
            });
          });
        });
      });
    });
  }

  function renderApprovals() {
    query.pendingApprovals().then(function (res) {
      var card = document.getElementById('approve-card');
      var html = '<div class="card-title"><span class="t-ico">📋</span>待审批事项<span class="t-sub">' + res.count + ' 项</span></div>';
      if (res.count === 0) {
        html += '<div class="remind-empty">当前无待审批事项 ✅</div>';
      } else {
        html += '<div class="remind-list">';
        res.items.forEach(function (it) {
          html += '<div class="remind-item"><span>📄</span><span class="r-name">' + U.esc(it.name) + '</span><span class="r-date">' + U.esc(it.time) + '</span></div>';
        });
        html += '</div>';
      }
      card.innerHTML = html;
    });
  }

  HR.router.register('/dashboard', {
    title: '工作总览',
    crumb: '首页仪表盘',
    render: page.render
  });

  global.HR.pages = global.HR.pages || {};
  global.HR.pages.dashboard = page;
})(window);
