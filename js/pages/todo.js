/* ============================================================
 * todo.js — 待办 & 备忘录（原有板块，保留并增强）
 *  1) 人事每日待办事项  2) 备忘录笔记  3) 重要事项标记提醒
 * ============================================================ */
(function (global) {
  'use strict';

  var U = HR.utils, ui = HR.ui, db = HR.db;
  var page = {};

  var PRIO = [
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' }
  ];

  /* ========== 1) 每日待办事项 ========== */
  var todoState = { date: U.today(), filter: 'all', page: 1, pageSize: 20 };

  page.renderDaily = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">✅</span>人事每日待办事项' +
      '<span class="t-sub">按日期管理待办，完成可勾选</span></div>' +
      '<div class="toolbar">' +
      '<input type="date" id="todo-date" class="filter-sel" value="' + todoState.date + '">' +
      '<select id="todo-filter" class="filter-sel">' +
      '<option value="all">全部</option><option value="undone">未完成</option><option value="done">已完成</option>' +
      '</select>' +
      '<button class="btn btn-primary" id="todo-add">＋ 新增待办</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" id="todo-reload">⟳ 刷新</button>' +
      '</div>' +
      '<div id="todo-list"></div>' +
      '<div id="todo-pager"></div>' +
      '</div>';

    document.getElementById('todo-date').value = todoState.date;
    document.getElementById('todo-filter').value = todoState.filter;
    document.getElementById('todo-date').addEventListener('change', function () {
      todoState.date = this.value || U.today();
      todoState.page = 1;
      loadTodos();
    });
    document.getElementById('todo-filter').addEventListener('change', function () {
      todoState.filter = this.value;
      todoState.page = 1;
      loadTodos();
    });
    document.getElementById('todo-add').onclick = function () { openTodoForm(null); };
    document.getElementById('todo-reload').onclick = loadTodos;

    loadTodos();
  };

  function loadTodos() {
    var st = todoState;
    db.query('todo', {
      filter: function (t) {
        if (t.date !== st.date) return false;
        if (st.filter === 'undone' && t.done) return false;
        if (st.filter === 'done' && !t.done) return false;
        return true;
      },
      sort: 'priority', dir: 'desc',
      sortMap: { high: 3, medium: 2, low: 1 }
    }).then(function (r) {
      var total = r.total;
      var start = (st.page - 1) * st.pageSize;
      var rows = r.list.slice(start, start + st.pageSize);
      var wrap = document.getElementById('todo-list');
      if (total === 0) {
        wrap.innerHTML = '';
        wrap.appendChild(ui.empty('🗒', '当天暂无待办事项'));
      } else {
        var html = '<div class="todo-list">';
        rows.forEach(function (t) {
          var prio = { high: ['高', 'high'], medium: ['中', 'medium'], low: ['低', 'low'] }[t.priority] || ['中', 'medium'];
          html += '<div class="todo-item' + (t.done ? ' done' : '') + '" data-id="' + t.id + '">' +
            '<span class="todo-check" data-id="' + t.id + '">✓</span>' +
            '<span class="t-content">' + U.esc(t.content) + '</span>' +
            (t.category ? '<span class="tag">' + U.esc(t.category) + '</span>' : '') +
            '<span class="t-prio ' + prio[1] + '">' + prio[0] + '</span>' +
            '<span class="t-date">' + (t.remindAt ? U.fmtDateTime(t.remindAt) : '') + '</span>' +
            '<span class="row-actions">' +
            '<span class="act-link">编辑</span>' +
            '<span class="act-link act-danger">删除</span>' +
            '</span>' +
            '</div>';
        });
        html += '</div>';
        wrap.innerHTML = html;

        wrap.querySelectorAll('.todo-item').forEach(function (item) {
          var id = item.dataset.id;
          item.querySelector('.todo-check').addEventListener('click', function () {
            toggleTodo(id, !item.classList.contains('done'));
          });
          item.querySelector('.act-link:not(.act-danger)').addEventListener('click', function () {
            db.get('todo', id).then(function (t) { openTodoForm(t); });
          });
          item.querySelector('.act-danger').addEventListener('click', function () {
            deleteTodo(id);
          });
        });
      }
      document.getElementById('todo-pager').innerHTML = '';
      document.getElementById('todo-pager').appendChild(ui.pager({
        total: total, page: st.page, pageSize: st.pageSize,
        onChange: function (p) { todoState.page = p; loadTodos(); }
      }));
    });
  }

  function openTodoForm(todo) {
    ui.formModal({
      title: todo ? '编辑待办' : '新增待办',
      size: 'sm',
      fields: [
        { key: 'content', label: '待办内容', type: 'textarea', required: true, rows: 2 },
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'priority', label: '优先级', type: 'select', required: true, options: PRIO },
        { key: 'category', label: '分类标签', type: 'text', hint: '如：招聘 / 考勤 / 合同' },
        { key: 'remindAt', label: '提醒时间', type: 'text', hint: '格式 YYYY-MM-DD HH:mm，可留空' }
      ],
      values: todo ? todo : { date: todoState.date, priority: 'medium' },
      onSave: function (vals) {
        if (vals.remindAt && !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(vals.remindAt)) {
          return Promise.reject(new Error('提醒时间格式应为 YYYY-MM-DD HH:mm'));
        }
        var rec = Object.assign({}, todo || {}, vals);
        if (rec.remindAt) {
          var parts = rec.remindAt.replace('T', ' ').split(/[ :]/);
          rec.remindAt = new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3], +parts[4]).getTime();
        } else {
          rec.remindAt = 0;
        }
        if (todo) {
          return db.put('todo', rec).then(function () { ui.toastOk('待办已更新'); loadTodos(); });
        }
        return db.add('todo', rec).then(function () { ui.toastOk('待办已创建'); loadTodos(); });
      }
    });
  }

  function toggleTodo(id, done) {
    db.get('todo', id).then(function (t) {
      if (!t) return;
      t.done = done;
      db.put('todo', t).then(function () { loadTodos(); });
    });
  }

  function deleteTodo(id) {
    ui.confirm({
      title: '删除待办',
      msg: '确定删除这条待办吗？',
      danger: true,
      onOk: function () {
        return db.softDelete('todo', id).then(function () { ui.toastOk('已删除'); loadTodos(); });
      }
    });
  }

  /* ========== 2) 备忘录笔记 ========== */
  var memoState = { kw: '', page: 1, pageSize: 12 };

  page.renderMemos = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">📝</span>备忘录笔记' +
      '<span class="t-sub">随手记录，支持置顶与分类</span></div>' +
      '<div class="toolbar">' +
      '<input class="search-input" id="memo-kw" placeholder="搜索标题 / 内容">' +
      '<button class="btn btn-primary" id="memo-add">＋ 新建笔记</button>' +
      '<span class="spacer"></span>' +
      '</div>' +
      '<div id="memo-grid"></div>' +
      '<div id="memo-pager"></div>' +
      '</div>';

    document.getElementById('memo-kw').value = memoState.kw;
    document.getElementById('memo-kw').addEventListener('input', function () {
      memoState.kw = this.value.trim();
      memoState.page = 1;
      loadMemos();
    });
    document.getElementById('memo-add').onclick = function () { openMemoForm(null); };
    loadMemos();
  };

  function loadMemos() {
    var st = memoState;
    db.query('memo', {
      filter: function (m) {
        if (st.kw) {
          var kw = st.kw.toLowerCase();
          return (m.title || '').toLowerCase().indexOf(kw) >= 0 ||
            (m.content || '').toLowerCase().indexOf(kw) >= 0;
        }
        return true;
      }
    }).then(function (r) {
      // 置顶优先，再按更新时间倒序
      var list = r.list.sort(function (a, b) {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      var total = list.length;
      var start = (st.page - 1) * st.pageSize;
      var rows = list.slice(start, start + st.pageSize);
      var wrap = document.getElementById('memo-grid');
      if (total === 0) {
        wrap.innerHTML = '';
        wrap.appendChild(ui.empty('📝', '暂无笔记，点击"新建笔记"开始记录'));
        return;
      }
      wrap.innerHTML = '';
      wrap.className = 'memo-grid';
      rows.forEach(function (m) {
        var card = document.createElement('div');
        card.className = 'memo-card' + (m.pinned ? ' pinned' : '');
        var plain = (m.content || '').replace(/<[^>]*>/g, '');
        card.innerHTML =
          '<div class="m-title">' + (m.pinned ? '<span class="pin-flag">📌</span>' : '') + U.esc(m.title || '无标题') + '</div>' +
          '<div class="m-content">' + U.esc(plain) + '</div>' +
          '<div class="m-foot">' +
          '<span>' + U.esc(m.category || '未分类') + ' · ' + U.fmtDateTime(m.updatedAt || m.createdAt) + '</span>' +
          '<span class="m-ops">' +
          '<span class="act-link">编辑</span>' +
          '<span class="act-link">' + (m.pinned ? '取消置顶' : '置顶') + '</span>' +
          '<span class="act-link act-danger">删除</span>' +
          '</span></div>';
        card.addEventListener('click', function (e) {
          if (e.target.closest('.act-link')) return;
          openMemoForm(m);
        });
        var ops = card.querySelector('.m-ops');
        ops.querySelectorAll('.act-link')[0].addEventListener('click', function () { openMemoForm(m); });
        ops.querySelectorAll('.act-link')[1].addEventListener('click', function () {
          db.get('memo', m.id).then(function (rec) {
            rec.pinned = !rec.pinned;
            db.put('memo', rec).then(function () { loadMemos(); });
          });
        });
        ops.querySelectorAll('.act-link')[2].addEventListener('click', function () { deleteMemo(m.id); });
        wrap.appendChild(card);
      });
      document.getElementById('memo-pager').innerHTML = '';
      document.getElementById('memo-pager').appendChild(ui.pager({
        total: total, page: st.page, pageSize: st.pageSize,
        onChange: function (p) { memoState.page = p; loadMemos(); }
      }));
    });
  }

  function openMemoForm(memo) {
    ui.formModal({
      title: memo ? '编辑笔记' : '新建笔记',
      size: 'md',
      fields: [
        { key: 'title', label: '标题', type: 'text', required: true },
        { key: 'category', label: '分类', type: 'text', placeholder: '如：入职 / 薪酬 / 其他' },
        { key: 'content', label: '内容', type: 'textarea', rows: 8, required: true },
        { key: 'pinned', label: '置顶显示', type: 'select', options: [{ value: '1', label: '是' }, { value: '0', label: '否' }] }
      ],
      values: memo ? Object.assign({}, memo, { pinned: memo.pinned ? '1' : '0' }) : { pinned: '0' },
      onSave: function (vals) {
        var rec = Object.assign({}, memo || {}, vals);
        rec.pinned = vals.pinned === '1';
        if (memo) {
          return db.put('memo', rec).then(function () { ui.toastOk('笔记已更新'); loadMemos(); });
        }
        return db.add('memo', rec).then(function () { ui.toastOk('笔记已创建'); loadMemos(); });
      }
    });
  }

  function deleteMemo(id) {
    ui.confirm({
      title: '删除笔记',
      msg: '确定删除这篇笔记吗？',
      danger: true,
      onOk: function () {
        return db.softDelete('memo', id).then(function () { ui.toastOk('已删除'); loadMemos(); });
      }
    });
  }

  /* ========== 3) 重要事项标记提醒 ========== */
  var remindState = { filter: 'all', page: 1, pageSize: 20 };

  page.renderReminders = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">🔔</span>重要事项标记提醒' +
      '<span class="t-sub">到点提醒，支持重复规则</span></div>' +
      '<div class="toolbar">' +
      '<select id="remind-filter" class="filter-sel">' +
      '<option value="all">全部</option><option value="pending">未提醒</option><option value="reminded">已提醒</option><option value="done">已完成</option>' +
      '</select>' +
      '<button class="btn btn-primary" id="remind-add">＋ 新增提醒</button>' +
      '<button class="btn btn-ghost" id="remind-notify">🔔 启用系统通知</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" id="remind-reload">⟳ 刷新</button>' +
      '</div>' +
      '<div id="remind-list"></div>' +
      '<div id="remind-pager"></div>' +
      '</div>';

    document.getElementById('remind-filter').value = remindState.filter;
    document.getElementById('remind-filter').addEventListener('change', function () {
      remindState.filter = this.value;
      remindState.page = 1;
      loadReminders();
    });
    document.getElementById('remind-add').onclick = function () { openReminderForm(null); };
    document.getElementById('remind-reload').onclick = loadReminders;
    var notifyBtn = document.getElementById('remind-notify');
    if (notifyBtn) {
      notifyBtn.onclick = function () {
        requestNotifyPermission().then(function (ok) {
          if (ok) { ui.toastOk('系统通知已开启：窗口最小化时也能收到提醒'); }
        });
      };
    }

    loadReminders();
  };

  function loadReminders() {
    var st = remindState;
    db.query('reminder', {
      filter: function (r) {
        if (st.filter === 'pending' && r.status !== 'pending') return false;
        if (st.filter === 'reminded' && r.status !== 'reminded') return false;
        if (st.filter === 'done' && r.status !== 'done') return false;
        return true;
      },
      sort: 'remindAt', dir: 'asc'
    }).then(function (r) {
      var total = r.total;
      var start = (st.page - 1) * st.pageSize;
      var rows = r.list.slice(start, start + st.pageSize);
      var wrap = document.getElementById('remind-list');
      if (total === 0) {
        wrap.innerHTML = '';
        wrap.appendChild(ui.empty('🔔', '暂无提醒事项'));
        return;
      }
      var html = '<div class="remind-list">';
      rows.forEach(function (r) {
        var imp = { high: ['重要', 'danger'], medium: ['一般', 'warn'], low: ['轻微', 'ok'] }[r.importance] || ['一般', 'warn'];
        var statusBadge = r.status === 'done'
          ? '<span class="badge ok">已完成</span>'
          : (r.status === 'reminded' ? '<span class="badge warn">已提醒</span>' : '<span class="badge info">待提醒</span>');
        var repeatLabel = { none: '', daily: '每天', weekly: '每周', monthly: '每月' }[r.repeatRule] || '';
        html += '<div class="remind-item" data-id="' + r.id + '">' +
          '<span>📌</span>' +
          '<span class="r-name">' + U.esc(r.title) + (repeatLabel ? ' <span class="tag">' + repeatLabel + '</span>' : '') + '</span>' +
          '<span class="t-prio ' + imp[1] + '">' + imp[0] + '</span>' +
          '<span class="r-date">' + U.fmtDateTime(r.remindAt) + '</span>' +
          statusBadge +
          '<span class="row-actions">' +
          (r.status !== 'done' ? '<span class="act-link">完成</span>' : '') +
          '<span class="act-link">编辑</span>' +
          '<span class="act-link act-danger">删除</span>' +
          '</span></div>';
      });
      html += '</div>';
      wrap.innerHTML = html;

      wrap.querySelectorAll('.remind-item').forEach(function (item) {
        var id = item.dataset.id;
        var acts = item.querySelectorAll('.act-link');
        var idx = 0;
        if (item.querySelectorAll('.act-link')[0].textContent === '完成') {
          acts[0].addEventListener('click', function () { markReminderDone(id); });
          acts[1].addEventListener('click', function () { db.get('reminder', id).then(function (r) { openReminderForm(r); }); });
          acts[2].addEventListener('click', function () { deleteReminder(id); });
        } else {
          acts[0].addEventListener('click', function () { db.get('reminder', id).then(function (r) { openReminderForm(r); }); });
          acts[1].addEventListener('click', function () { deleteReminder(id); });
        }
        void idx;
      });

      document.getElementById('remind-pager').innerHTML = '';
      document.getElementById('remind-pager').appendChild(ui.pager({
        total: total, page: st.page, pageSize: st.pageSize,
        onChange: function (p) { remindState.page = p; loadReminders(); }
      }));
    });
  }

  function openReminderForm(r) {
    ui.formModal({
      title: r ? '编辑提醒' : '新增提醒',
      size: 'sm',
      fields: [
        { key: 'title', label: '事项', type: 'text', required: true },
        { key: 'importance', label: '重要程度', type: 'select', required: true, options: [
          { value: 'high', label: '重要' }, { value: 'medium', label: '一般' }, { value: 'low', label: '轻微' }] },
        { key: 'remindAt', label: '提醒时间', type: 'text', required: true, hint: '格式 YYYY-MM-DD HH:mm' },
        { key: 'repeatRule', label: '重复规则', type: 'select', options: [
          { value: 'none', label: '不重复' }, { value: 'daily', label: '每天' }, { value: 'weekly', label: '每周' }, { value: 'monthly', label: '每月' }] }
      ],
      values: r ? Object.assign({}, r, { remindAt: U.fmtDateTime(r.remindAt) }) : { importance: 'medium', repeatRule: 'none' },
      onSave: function (vals) {
        if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(vals.remindAt)) {
          return Promise.reject(new Error('提醒时间格式应为 YYYY-MM-DD HH:mm'));
        }
        var parts = vals.remindAt.replace('T', ' ').split(/[ :]/);
        var rec = Object.assign({}, r || {}, vals);
        rec.remindAt = new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3], +parts[4]).getTime();
        if (r) {
          return db.put('reminder', rec).then(function () { ui.toastOk('提醒已更新'); loadReminders(); });
        }
        return db.add('reminder', rec).then(function () { ui.toastOk('提醒已创建'); loadReminders(); });
      }
    });
  }

  function markReminderDone(id) {
    db.get('reminder', id).then(function (r) {
      if (!r) return;
      r.status = 'done';
      db.put('reminder', r).then(function () { ui.toastOk('已标记完成'); loadReminders(); });
    });
  }

  function deleteReminder(id) {
    ui.confirm({
      title: '删除提醒',
      msg: '确定删除这条提醒吗？',
      danger: true,
      onOk: function () {
        return db.softDelete('reminder', id).then(function () { ui.toastOk('已删除'); loadReminders(); });
      }
    });
  }

  /* ---------- 系统通知 ---------- */
  function requestNotifyPermission() {
    if (!('Notification' in window)) {
      ui.toastWarn('当前浏览器不支持系统通知');
      return Promise.resolve(false);
    }
    if (Notification.permission === 'granted') return Promise.resolve(true);
    return Notification.requestPermission().then(function (p) { return p === 'granted'; });
  }

  function systemNotify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        var n = new Notification(title, { body: body, icon: 'icons/icon-192.png', tag: 'hr-remind' });
        n.onclick = function () { window.focus(); n.close(); };
      }
    } catch (e) { /* 通知失败不阻断 */ }
  }
  page.requestNotifyPermission = requestNotifyPermission;
  page.systemNotify = systemNotify;

  /* ---------- 提醒检查（定时扫描，到点 toast + 系统通知） ---------- */
  page.checkReminders = function () {
    var now = Date.now();
    db.query('reminder', { filter: function (r) { return r.status === 'pending' && r.remindAt && r.remindAt <= now; } })
      .then(function (r) {
        r.list.forEach(function (item) {
          ui.toast('⏰ 提醒：' + item.title, 'warn');
          systemNotify('人事工作台提醒', item.title);
          item.status = 'reminded';
          db.put('reminder', item);
          // 重复规则：安排下一次
          if (item.repeatRule && item.repeatRule !== 'none') {
            var next = new Date(item.remindAt);
            if (item.repeatRule === 'daily') next.setDate(next.getDate() + 1);
            if (item.repeatRule === 'weekly') next.setDate(next.getDate() + 7);
            if (item.repeatRule === 'monthly') next.setMonth(next.getMonth() + 1);
            db.add('reminder', {
              title: item.title, importance: item.importance,
              remindAt: next.getTime(), repeatRule: item.repeatRule, status: 'pending'
            });
          }
        });
      });
  };

  /* ---------- 注册路由 ---------- */
  HR.router.register('/todo/daily', { title: '人事每日待办事项', crumb: '待办 & 备忘录', render: page.renderDaily });
  HR.router.register('/todo/memos', { title: '备忘录笔记', crumb: '待办 & 备忘录', render: page.renderMemos });
  HR.router.register('/todo/reminders', { title: '重要事项标记提醒', crumb: '待办 & 备忘录', render: page.renderReminders });

  global.HR.pages = global.HR.pages || {};
  global.HR.pages.todo = page;
})(window);