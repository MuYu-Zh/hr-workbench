/* ============================================================
 * employee.js — 员工档案管理（核心人事板块）
 *  1) 在职员工花名册  2) 离职员工档案  3) 员工基本信息维护  4) 员工证件/附件归档
 * 依据数据模型 v1.2 employee 表结构
 * ============================================================ */
(function (global) {
  'use strict';

  var U = HR.utils, ui = HR.ui, db = HR.db, query = HR.query;
  var page = {};

  /* ---------- 员工表单字段定义（新增/编辑共用） ---------- */
  function employeeFields(emp, depts, positions, grades, eduOpts, empTypeOpts, maritalOpts) {
    return [
      { group: '基本信息' },
      { key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'gender', label: '性别', type: 'select', required: true, options: [{ value: 'male', label: '男' }, { value: 'female', label: '女' }] },
      { key: 'nationality', label: '民族', type: 'text' },
      { key: 'maritalStatus', label: '婚姻状况', type: 'select', options: maritalOpts },
      { key: 'household', label: '户籍', type: 'text' },
      { key: 'birthDate', label: '出生日期', type: 'date' },
      { key: 'idCard', label: '身份证号', type: 'text', hint: '18 位，展示时脱敏' },
      { key: 'phone', label: '手机', type: 'tel', required: true },
      { key: 'homePhone', label: '家庭电话', type: 'tel' },
      { key: 'email', label: '邮箱', type: 'email' },
      { key: 'address', label: '现住址', type: 'text', full: true },
      { group: '工作信息' },
      { key: 'employeeNo', label: '工号', type: 'text', required: true, hint: '唯一，如 EM2025001' },
      { key: 'departmentId', label: '部门', type: 'select', options: depts },
      { key: 'positionId', label: '岗位', type: 'select', options: positions },
      { key: 'gradeId', label: '职级', type: 'select', options: grades },
      { key: 'hireDate', label: '入职日期', type: 'date', required: true },
      { key: 'regularDate', label: '转正日期', type: 'date', hint: '试用期员工留空' },
      { key: 'employmentType', label: '用工形式', type: 'select', options: empTypeOpts },
      { group: '教育背景' },
      { key: 'education', label: '学历', type: 'select', options: eduOpts },
      { key: 'school', label: '毕业院校', type: 'text' },
      { key: 'major', label: '专业', type: 'text' },
      { key: 'graduateDate', label: '毕业时间', type: 'date' },
      { group: '其他' },
      { key: 'bankCardNo', label: '发薪银行卡号', type: 'text', hint: '仅发薪使用' },
      { key: 'socialAccountNo', label: '社保账号', type: 'text' },
      { key: 'fundAccountNo', label: '公积金账号', type: 'text' },
      { key: 'emergencyContact', label: '紧急联系人', type: 'text', placeholder: '姓名 / 电话 / 关系', hint: '格式：张三 / 138xxxx / 父亲', full: true },
      { key: 'remark', label: '备注', type: 'textarea', full: true }
    ];
  }

  /* ---------- 载入表单辅助数据 ---------- */
  function loadFormData() {
    return Promise.all([
      query.deptOptions(),
      query.positionOptions(),
      query.gradeOptions(),
      query.dictOptions('education'),
      query.dictOptions('employment_type'),
      query.dictOptions('marital_status')
    ]).then(function (r) {
      return { depts: r[0], positions: r[1], grades: r[2], eduOpts: r[3], empTypeOpts: r[4], maritalOpts: r[5] };
    });
  }

  /* ---------- 员工字段标准化（表单值 → 存储记录） ---------- */
  function normalizeEmp(values, existing) {
    var rec = Object.assign({}, existing || {}, values);
    // 紧急联系人字符串 → 对象
    if (typeof rec.emergencyContact === 'string' && rec.emergencyContact) {
      var parts = rec.emergencyContact.split('/').map(function (s) { return s.trim(); });
      rec.emergencyContact = { name: parts[0] || '', phone: parts[1] || '', relation: parts[2] || '' };
    } else if (!rec.emergencyContact) {
      rec.emergencyContact = { name: '', phone: '', relation: '' };
    }
    if (!rec.status) rec.status = 'active';
    return rec;
  }

  /* ---------- 员工详情弹窗 ---------- */
  function showDetail(emp) {
    var body = document.createElement('div');
    var idRow = function (label, val, full) {
      return '<div class="detail-row' + (full ? ' full' : '') + '"><span class="d-label">' + label + '</span><span class="d-value">' + (val || '—') + '</span></div>';
    };

    Promise.all([
      db.get('department', emp.departmentId),
      db.get('position', emp.positionId),
      db.get('grade', emp.gradeId)
    ]).then(function (res) {
      var dept = res[0], pos = res[1], grade = res[2];
      var ec = emp.emergencyContact || {};
      var html =
        '<div class="detail-grid">' +
        '<div class="detail-title">基本信息</div>' +
        idRow('姓名', U.esc(emp.name)) +
        idRow('性别', emp.gender === 'male' ? '男' : '女') +
        idRow('工号', '<span class="mono">' + U.esc(emp.employeeNo || '—') + '</span>') +
        idRow('出生日期', U.esc(emp.birthDate || '—') + (emp.birthDate ? '（' + (U.calcAge(emp.birthDate) ?? '—') + ' 岁）' : '')) +
        idRow('民族', U.esc(emp.nationality || '—')) +
        idRow('婚姻状况', { single: '未婚', married: '已婚', divorced: '离异', other: '其他' }[emp.maritalStatus] || '—') +
        idRow('身份证号', U.maskIdCard(emp.idCard)) +
        idRow('手机', U.maskPhone(emp.phone)) +
        idRow('邮箱', U.esc(emp.email || '—')) +
        idRow('现住址', U.esc(emp.address || '—'), true) +
        idRow('紧急联系人', U.esc([ec.name, ec.phone, ec.relation].filter(Boolean).join(' / ') || '—')) +
        '<div class="detail-title">工作信息</div>' +
        idRow('部门', U.esc(dept ? dept.name : '—')) +
        idRow('岗位', U.esc(pos ? pos.name : '—')) +
        idRow('职级', U.esc(grade ? grade.code + ' ' + grade.name : '—')) +
        idRow('入职日期', U.esc(emp.hireDate || '—')) +
        idRow('转正日期', U.esc(emp.regularDate || '试用中')) +
        idRow('用工形式', { fulltime: '全职', intern: '实习', parttime: '兼职' }[emp.employmentType] || '—') +
        idRow('状态', emp.status === 'active' ? '<span class="badge ok">在职</span>' : '<span class="badge gray">已离职</span>') +
        '<div class="detail-title">教育背景</div>' +
        idRow('学历', U.esc(emp.education || '—')) +
        idRow('毕业院校', U.esc(emp.school || '—')) +
        idRow('专业', U.esc(emp.major || '—')) +
        idRow('毕业时间', U.esc(emp.graduateDate || '—')) +
        (emp.remark ? '<div class="detail-title">备注</div>' + idRow('备注', U.esc(emp.remark), true) : '') +
        '</div>';
      body.innerHTML = html;
    });

    var m = ui.modal({ title: '员工详情 · ' + U.esc(emp.name), size: 'lg', body: body });
  }

  /* ---------- 新增 / 编辑员工弹窗 ---------- */
  function openEmployeeForm(emp, onSaved) {
    loadFormData().then(function (d) {
      var fields = employeeFields(emp, d.depts, d.positions, d.grades, d.eduOpts, d.empTypeOpts, d.maritalOpts);
      var values = Object.assign({}, emp || {});
      if (values.emergencyContact && typeof values.emergencyContact === 'object') {
        var ec = values.emergencyContact;
        values.emergencyContact = [ec.name, ec.phone, ec.relation].filter(Boolean).join(' / ');
      }

      ui.formModal({
        title: emp ? '编辑员工 · ' + U.esc(emp.name) : '新增员工',
        size: 'xl',
        width: '960px',
        fields: fields,
        values: values,
        okText: emp ? '保存修改' : '创建档案',
        onSave: function (vals) {
          // 校验
          if (vals.idCard && !U.validIdCard(vals.idCard)) return Promise.reject(new Error('身份证号格式不正确（18 位）'));
          if (vals.phone && !U.validPhone(vals.phone)) return Promise.reject(new Error('手机号格式不正确'));
          if (vals.email && !U.validEmail(vals.email)) return Promise.reject(new Error('邮箱格式不正确'));

          var rec = normalizeEmp(vals, emp);
          // 唯一性校验（工号，排除软删除）
          return db.getAll('employee').then(function (all) {
            var dup = all.some(function (e) {
              return e.employeeNo === rec.employeeNo && e.id !== rec.id;
            });
            if (dup) throw new Error('工号 ' + rec.employeeNo + ' 已存在');
            if (emp) {
              return db.put('employee', rec).then(function () { ui.toastOk('员工档案已更新'); onSaved && onSaved(); });
            } else {
              return db.add('employee', rec).then(function () { ui.toastOk('员工档案已创建'); onSaved && onSaved(); });
            }
          });
        }
      });
    });
  }

  /* ---------- 在职员工花名册 ---------- */
  var rosterState = { page: 1, pageSize: 10, keyword: '', dept: '', status: '' };

  page.renderRoster = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">👥</span>在职员工花名册' +
      '<span class="t-sub">在册 ' + '<span id="roster-total">—</span>' + ' 人</span></div>' +
      '<div class="toolbar">' +
      '<input class="search-input" id="roster-kw" placeholder="搜索姓名 / 工号 / 手机号">' +
      '<select class="filter-sel" id="roster-dept"><option value="">全部部门</option></select>' +
      '<button class="btn btn-primary" id="roster-add">＋ 新增员工</button>' +
      '<button class="btn btn-ghost" id="roster-export">⬇ 导出 CSV</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" id="roster-reload">⟳ 刷新</button>' +
      '</div>' +
      '<div id="roster-table"></div>' +
      '<div id="roster-pager"></div>' +
      '</div>';

    // 部门下拉
    query.deptOptions().then(function (opts) {
      var sel = document.getElementById('roster-dept');
      opts.forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value; opt.textContent = o.label;
        sel.appendChild(opt);
      });
      sel.value = rosterState.dept;
    });

    document.getElementById('roster-kw').value = rosterState.keyword;
    document.getElementById('roster-kw').addEventListener('input', function () {
      rosterState.keyword = this.value.trim();
      rosterState.page = 1;
      loadRoster();
    });
    document.getElementById('roster-dept').addEventListener('change', function () {
      rosterState.dept = this.value;
      rosterState.page = 1;
      loadRoster();
    });
    document.getElementById('roster-add').onclick = function () {
      openEmployeeForm(null, function () { rosterState.page = 1; loadRoster(); });
    };
    document.getElementById('roster-export').onclick = exportRoster;
    document.getElementById('roster-reload').onclick = loadRoster;

    loadRoster();
  };

  function loadRoster() {
    var st = rosterState;
    db.query('employee', {
      filter: function (e) {
        if (e.status !== 'active') return false;
        if (st.dept && e.departmentId !== st.dept) return false;
        if (st.keyword) {
          var kw = st.keyword.toLowerCase();
          var hit = (e.name || '').toLowerCase().indexOf(kw) >= 0 ||
            (e.employeeNo || '').toLowerCase().indexOf(kw) >= 0 ||
            (e.phone || '').indexOf(kw) >= 0;
          if (!hit) return false;
        }
        return true;
      },
      sort: 'hireDate', dir: 'desc'
    }).then(function (r) {
      var all = r.list;
      var total = all.length;
      var start = (st.page - 1) * st.pageSize;
      var rows = all.slice(start, start + st.pageSize);
      document.getElementById('roster-total').textContent = total;
      renderRosterTable(rows, total);
    });
  }

  function renderRosterTable(rows, total) {
    var columns = [
      { key: 'employeeNo', label: '工号', mono: true, render: function (e) { return '<span class="mono">' + U.esc(e.employeeNo || '—') + '</span>'; } },
      { key: 'name', label: '姓名', render: function (e) { return '<strong>' + U.esc(e.name) + '</strong>' + (e.regularDate ? '' : ' <span class="badge gold">试用</span>'); } },
      { key: 'gender', label: '性别', render: function (e) { return e.gender === 'male' ? '男' : '女'; } },
      { key: 'dept', label: '部门' },
      { key: 'pos', label: '岗位' },
      { key: 'grade', label: '职级' },
      { key: 'hireDate', label: '入职日期', mono: true },
      { key: 'phone', label: '手机', render: function (e) { return U.maskPhone(e.phone); } },
      { key: 'education', label: '学历' },
      { key: 'ops', label: '操作', render: function (e) {
        var div = document.createElement('div');
        div.className = 'row-actions';
        div.appendChild(ui.linkBtn('详情', '', function () { showDetail(e); }));
        div.appendChild(ui.linkBtn('编辑', '', function () { openEmployeeForm(e, loadRoster); }));
        div.appendChild(ui.linkBtn('证件', '', function () { HR.router.go('/employee/attachments?emp=' + e.id); }));
        div.appendChild(ui.linkBtn('离职', 'act-danger', function () { doResign(e); }));
        div.appendChild(ui.linkBtn('删除', 'act-danger', function () { doDelete(e); }));
        return div;
      } }
    ];

    // 异步补全名称列
    Promise.all([
      db.getAll('department'), db.getAll('position'), db.getAll('grade')
    ]).then(function (res) {
      var deptMap = {}, posMap = {}, gradeMap = {};
      res[0].forEach(function (d) { deptMap[d.id] = d.name; });
      res[1].forEach(function (p) { posMap[p.id] = p.name; });
      res[2].forEach(function (g) { gradeMap[g.id] = g.code + ' · ' + g.name; });

      var cols2 = columns.map(function (c) {
        if (c.key === 'dept') return Object.assign({}, c, { render: function (e) { return U.esc(deptMap[e.departmentId] || '—'); } });
        if (c.key === 'pos') return Object.assign({}, c, { render: function (e) { return U.esc(posMap[e.positionId] || '—'); } });
        if (c.key === 'grade') return Object.assign({}, c, { render: function (e) { return U.esc(gradeMap[e.gradeId] || '—'); } });
        return c;
      });

      var tableEl = ui.table(cols2, rows, { emptyText: '暂无在职员工，点击"新增员工"创建', emptyIcon: '👥' });
      var wrap = document.getElementById('roster-table');
      wrap.innerHTML = '';
      wrap.appendChild(tableEl);
      document.getElementById('roster-pager').innerHTML = '';
      document.getElementById('roster-pager').appendChild(
        ui.pager({
          total: total, page: rosterState.page, pageSize: rosterState.pageSize,
          onChange: function (p) { rosterState.page = p; loadRoster(); }
        })
      );
    });
  }

  /* ---------- 离职流程（花名册 → 发起离职审批，一期简化：直接转离职交接） ---------- */
  function doResign(emp) {
    var msgEl = document.createElement('div');
    msgEl.className = 'confirm-box';
    msgEl.innerHTML = '<div class="c-msg">确认将 <span class="hl">' + U.esc(emp.name) + '</span>（' + U.esc(emp.employeeNo) + '）办理离职吗？</div>' +
      '<div class="c-sub">办理后员工状态变为"离职交接中"，完成交接后转入离职档案。</div>';

    var form = ui.form([
      { key: 'resignDate', label: '离职日期', type: 'date', required: true, value: U.today() },
      { key: 'type', label: '离职类型', type: 'select', required: true, options: [
        { value: 'voluntary', label: '主动离职' }, { value: 'involuntary', label: '被动离职' }, { value: 'negotiated', label: '协商解除' }] },
      { key: 'reason', label: '离职原因', type: 'textarea', rows: 2 },
      { key: 'handoverBy', label: '工作交接人', type: 'text' }
    ], { resignDate: U.today(), type: 'voluntary' });

    var body = document.createElement('div');
    body.appendChild(msgEl);
    body.appendChild(form.el);

    var okBtn = document.createElement('button');
    okBtn.className = 'btn btn-deep';
    okBtn.innerHTML = '确认离职';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.innerHTML = '取消';

    var m = ui.modal({ title: '办理离职 · ' + U.esc(emp.name), size: 'sm', body: body, foot: (function () {
      var f = document.createElement('div'); f.style.display = 'flex'; f.style.gap = '10px';
      f.appendChild(cancelBtn); f.appendChild(okBtn); return f;
    })() });

    cancelBtn.onclick = m.close;
    okBtn.onclick = function () {
      var errs = form.validate();
      if (errs.length) { ui.toastErr(errs[0]); return; }
      var vals = form.get();
      db.get('employee', emp.id).then(function (rec) {
        if (!rec) { ui.toastErr('员工不存在'); return; }
        rec.status = 'resigning';
        rec.resignInfo = Object.assign({}, rec.resignInfo || {}, {
          date: vals.resignDate, type: vals.type, reason: vals.reason,
          handoverBy: vals.handoverBy, handoverDone: false, handoverDate: ''
        });
        rec.resignDate = vals.resignDate;
        return db.put('employee', rec).then(function () {
          // 写状态留痕
          db.add('status_log', { bizType: 'employee', bizId: rec.id, from: 'active', to: 'resigning', at: U.now(), operator: (HR.profile.get().name || '本地用户') });
          ui.toastOk('已办理离职，状态：离职交接中');
          m.close();
          loadRoster();
        });
      });
    };
  }

  /* ---------- 删除（软删除） ---------- */
  function doDelete(emp) {
    ui.confirm({
      title: '删除员工档案',
      msg: '确定删除 <span class="hl">' + U.esc(emp.name) + '</span> 的档案吗？',
      sub: '删除后档案进入回收（软删除），可在数据清理中彻底清除。',
      danger: true,
      onOk: function () {
        return db.softDelete('employee', emp.id).then(function () {
          db.add('status_log', { bizType: 'employee', bizId: emp.id, from: 'active', to: 'deleted', at: U.now(), operator: (HR.profile.get().name || '本地用户') });
          ui.toastOk('档案已删除（软删除）');
          loadRoster();
        });
      }
    });
  }

  /* ---------- 花名册导出 CSV ---------- */
  function exportRoster() {
    db.query('employee', { filter: function (e) { return e.status === 'active'; }, sort: 'employeeNo' })
      .then(function (r) {
        return Promise.all([db.getAll('department'), db.getAll('position'), db.getAll('grade')]).then(function (res) {
          var deptMap = {}, posMap = {}, gradeMap = {};
          res[0].forEach(function (d) { deptMap[d.id] = d.name; });
          res[1].forEach(function (p) { posMap[p.id] = p.name; });
          res[2].forEach(function (g) { gradeMap[g.id] = g.code + ' ' + g.name; });
          var rows = r.list.map(function (e) {
            return [
              e.employeeNo, e.name, e.gender === 'male' ? '男' : '女', e.nationality,
              deptMap[e.departmentId] || '', posMap[e.positionId] || '', gradeMap[e.gradeId] || '',
              e.hireDate, e.regularDate || '试用中', { fulltime: '全职', intern: '实习', parttime: '兼职' }[e.employmentType] || '',
              e.education, e.school, e.major, e.phone, e.email, e.address
            ];
          });
          U.exportCSV('在职员工花名册_' + U.today() + '.csv',
            ['工号', '姓名', '性别', '民族', '部门', '岗位', '职级', '入职日期', '转正日期', '用工形式', '学历', '毕业院校', '专业', '手机', '邮箱', '现住址'],
            rows);
          ui.toastOk('已导出 ' + rows.length + ' 条花名册数据');
        });
      });
  }

  /* ---------- 离职员工档案 ---------- */
  var resignState = { page: 1, pageSize: 10, keyword: '' };

  page.renderResigned = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">🚪</span>离职员工档案' +
      '<span class="t-sub">含离职交接中与已离职</span></div>' +
      '<div class="toolbar">' +
      '<input class="search-input" id="resigned-kw" placeholder="搜索姓名 / 工号 / 离职原因">' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" id="resigned-reload">⟳ 刷新</button>' +
      '</div>' +
      '<div id="resigned-table"></div>' +
      '<div id="resigned-pager"></div>' +
      '</div>';

    document.getElementById('resigned-kw').value = resignState.keyword;
    document.getElementById('resigned-kw').addEventListener('input', function () {
      resignState.keyword = this.value.trim();
      resignState.page = 1;
      loadResigned();
    });
    document.getElementById('resigned-reload').onclick = loadResigned;
    loadResigned();
  };

  function loadResigned() {
    var st = resignState;
    db.query('employee', {
      filter: function (e) {
        if (e.status === 'active') return false;
        if (st.keyword) {
          var kw = st.keyword.toLowerCase();
          var hit = (e.name || '').toLowerCase().indexOf(kw) >= 0 ||
            (e.employeeNo || '').toLowerCase().indexOf(kw) >= 0 ||
            ((e.resignInfo && e.resignInfo.reason) || '').indexOf(kw) >= 0;
          if (!hit) return false;
        }
        return true;
      },
      sort: 'resignDate', dir: 'desc'
    }).then(function (r) {
      var total = r.total;
      var start = (st.page - 1) * st.pageSize;
      var rows = r.list.slice(start, start + st.pageSize);
      Promise.all([db.getAll('department'), db.getAll('position'), db.getAll('grade')]).then(function (res) {
        var deptMap = {}, posMap = {}, gradeMap = {};
        res[0].forEach(function (d) { deptMap[d.id] = d.name; });
        res[1].forEach(function (p) { posMap[p.id] = p.name; });
        res[2].forEach(function (g) { gradeMap[g.id] = g.code; });

        var columns = [
          { key: 'employeeNo', label: '工号', mono: true },
          { key: 'name', label: '姓名', render: function (e) { return '<strong>' + U.esc(e.name) + '</strong>'; } },
          { key: 'dept', label: '原部门', render: function (e) { return U.esc(deptMap[e.departmentId] || '—'); } },
          { key: 'status', label: '状态', render: function (e) {
            return e.status === 'resigning'
              ? '<span class="badge warn">离职交接中</span>'
              : '<span class="badge gray">已离职</span>';
          } },
          { key: 'resignDate', label: '离职日期', mono: true, render: function (e) { return U.esc(e.resignDate || (e.resignInfo && e.resignInfo.date) || '—'); } },
          { key: 'type', label: '离职类型', render: function (e) {
            var t = e.resignInfo && e.resignInfo.type;
            return { voluntary: '主动', involuntary: '被动', negotiated: '协商' }[t] || '—';
          } },
          { key: 'reason', label: '离职原因', render: function (e) { return U.esc((e.resignInfo && e.resignInfo.reason) || '—'); } },
          { key: 'handover', label: '交接情况', render: function (e) {
            var ri = e.resignInfo || {};
            return ri.handoverDone
              ? '<span class="badge ok">已交接</span><span class="muted" style="font-size:11px;margin-left:4px">' + U.esc(ri.handoverBy || '') + '</span>'
              : '<span class="badge warn">待交接</span>';
          } },
          { key: 'ops', label: '操作', render: function (e) {
            var div = document.createElement('div');
            div.className = 'row-actions';
            div.appendChild(ui.linkBtn('详情', '', function () { showDetail(e); }));
            if (e.status === 'resigning') {
              div.appendChild(ui.linkBtn('完成交接', '', function () { completeHandover(e); }));
            }
            div.appendChild(ui.linkBtn('恢复在职', '', function () { restoreEmp(e); }));
            return div;
          } }
        ];
        var tableEl = ui.table(columns, rows, { emptyText: '暂无离职员工档案', emptyIcon: '🚪' });
        var wrap = document.getElementById('resigned-table');
        wrap.innerHTML = '';
        wrap.appendChild(tableEl);
        document.getElementById('resigned-pager').innerHTML = '';
        document.getElementById('resigned-pager').appendChild(ui.pager({
          total: total, page: resignState.page, pageSize: resignState.pageSize,
          onChange: function (p) { resignState.page = p; loadResigned(); }
        }));
      });
    });
  }

  function completeHandover(emp) {
    ui.confirm({
      title: '完成离职交接',
      msg: '确认 <span class="hl">' + U.esc(emp.name) + '</span> 已完成全部工作交接与物品归还？',
      sub: '完成后员工状态由"离职交接中"转为"已离职"，档案转入离职员工档案。',
      onOk: function () {
        return db.get('employee', emp.id).then(function (rec) {
          rec.status = 'resigned';
          rec.resignInfo = Object.assign({}, rec.resignInfo || {}, { handoverDone: true, handoverDate: U.today() });
          return db.put('employee', rec).then(function () {
            db.add('status_log', { bizType: 'employee', bizId: rec.id, from: 'resigning', to: 'resigned', at: U.now(), operator: (HR.profile.get().name || '本地用户') });
            ui.toastOk('交接完成，已转入离职档案');
            loadResigned();
          });
        });
      }
    });
  }

  function restoreEmp(emp) {
    ui.confirm({
      title: '恢复为在职',
      msg: '确定将 <span class="hl">' + U.esc(emp.name) + '</span> 恢复为在职员工吗？',
      sub: '沿用原工号，历史档案保留。',
      onOk: function () {
        return db.get('employee', emp.id).then(function (rec) {
          rec.status = 'active';
          return db.put('employee', rec).then(function () {
            db.add('status_log', { bizType: 'employee', bizId: rec.id, from: 'resigned', to: 'active', at: U.now(), operator: (HR.profile.get().name || '本地用户') });
            ui.toastOk('已恢复在职');
            loadResigned();
          });
        });
      }
    });
  }

  /* ---------- 员工基本信息维护（选择员工 → 编辑） ---------- */
  page.renderProfile = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">📝</span>员工基本信息维护' +
      '<span class="t-sub">选择员工后编辑其全部档案字段</span></div>' +
      '<div class="toolbar">' +
      '<input class="search-input" id="profile-kw" placeholder="搜索姓名 / 工号">' +
      '<button class="btn btn-primary" id="profile-add">＋ 新增员工</button>' +
      '<span class="spacer"></span>' +
      '</div>' +
      '<div id="profile-list"></div>' +
      '</div>';

    document.getElementById('profile-kw').addEventListener('input', loadProfileList);
    document.getElementById('profile-add').onclick = function () {
      openEmployeeForm(null, loadProfileList);
    };
    loadProfileList();
  };

  function loadProfileList() {
    var kw = (document.getElementById('profile-kw').value || '').trim().toLowerCase();
    db.query('employee', {
      filter: function (e) {
        if (e.status !== 'active') return false;
        if (kw) {
          return (e.name || '').toLowerCase().indexOf(kw) >= 0 ||
            (e.employeeNo || '').toLowerCase().indexOf(kw) >= 0;
        }
        return true;
      },
      sort: 'employeeNo', dir: 'asc'
    }).then(function (r) {
      var list = r.list;
      var wrap = document.getElementById('profile-list');
      if (list.length === 0) {
        wrap.innerHTML = '';
        wrap.appendChild(ui.empty('👥', '暂无在职员工'));
        return;
      }
      Promise.all([db.getAll('department'), db.getAll('position'), db.getAll('grade')]).then(function (res) {
        var deptMap = {}, posMap = {}, gradeMap = {};
        res[0].forEach(function (d) { deptMap[d.id] = d.name; });
        res[1].forEach(function (p) { posMap[p.id] = p.name; });
        res[2].forEach(function (g) { gradeMap[g.id] = g.code; });

        var columns = [
          { key: 'employeeNo', label: '工号', mono: true },
          { key: 'name', label: '姓名', render: function (e) { return '<strong>' + U.esc(e.name) + '</strong>' + (e.regularDate ? '' : ' <span class="badge gold">试用</span>'); } },
          { key: 'dept', label: '部门', render: function (e) { return U.esc(deptMap[e.departmentId] || '—'); } },
          { key: 'pos', label: '岗位', render: function (e) { return U.esc(posMap[e.positionId] || '—'); } },
          { key: 'grade', label: '职级', render: function (e) { return U.esc(gradeMap[e.gradeId] || '—'); } },
          { key: 'hireDate', label: '入职日期', mono: true },
          { key: 'ops', label: '操作', render: function (e) {
            var div = document.createElement('div');
            div.className = 'row-actions';
            div.appendChild(ui.linkBtn('编辑档案', '', function () { openEmployeeForm(e, loadProfileList); }));
            return div;
          } }
        ];
        wrap.innerHTML = '';
        wrap.appendChild(ui.table(columns, list, { emptyText: '暂无数据' }));
      });
    });
  }

  /* ---------- 员工证件 / 附件归档 ---------- */
  var attachState = { empId: location.hash.match(/emp=([^&]+)/) ? decodeURIComponent(location.hash.match(/emp=([^&]+)/)[1]) : '' };

  page.renderAttachments = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">📎</span>员工证件 / 附件归档' +
      '<span class="t-sub">上传、预览、下载证件与附件</span></div>' +
      '<div class="toolbar">' +
      '<select class="filter-sel" id="attach-emp"><option value="">— 选择员工 —</option></select>' +
      '<select class="filter-sel" id="attach-cat"><option value="">全部类别</option></select>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" id="attach-reload">⟳ 刷新</button>' +
      '</div>' +
      '<div id="attach-upload" style="display:none"></div>' +
      '<div id="attach-list"></div>' +
      '</div>';

    // 员工下拉
    query.activeEmployees().then(function (emps) {
      var sel = document.getElementById('attach-emp');
      emps.forEach(function (e) {
        var opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name + '（' + e.employeeNo + '）';
        sel.appendChild(opt);
      });
      if (attachState.empId) sel.value = attachState.empId;
    });

    // 类别下拉
    query.dictOptions('attachment_category').then(function (opts) {
      var sel = document.getElementById('attach-cat');
      opts.forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value; opt.textContent = o.label;
        sel.appendChild(opt);
      });
    });

    document.getElementById('attach-emp').addEventListener('change', function () {
      attachState.empId = this.value;
      loadAttachments();
    });
    document.getElementById('attach-cat').addEventListener('change', loadAttachments);
    document.getElementById('attach-reload').onclick = loadAttachments;

    loadAttachments();
  };

  function loadAttachments() {
    var empId = attachState.empId;
    var cat = document.getElementById('attach-cat') ? document.getElementById('attach-cat').value : '';
    var uploadZone = document.getElementById('attach-upload');
    var listEl = document.getElementById('attach-list');

    if (!empId) {
      uploadZone.style.display = 'none';
      listEl.innerHTML = '';
      listEl.appendChild(ui.empty('📎', '请先选择员工，再管理其证件与附件'));
      return;
    }

    uploadZone.style.display = '';
    uploadZone.innerHTML = '<div class="upload-zone" id="upload-zone"><span class="u-ico">⬆️</span>点击选择文件 或 拖拽到此处上传（图片 / PDF / Office，≤' +
      (HR.settings.get().attachment.maxSizeMB || 20) + 'MB）</div>' +
      '<input type="file" id="attach-file" multiple style="display:none" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt">';

    var zone = document.getElementById('upload-zone');
    var fileInput = document.getElementById('attach-file');
    zone.onclick = function () { fileInput.click(); };
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('drag'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag');
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    });
    fileInput.onchange = function () {
      if (fileInput.files.length) uploadFiles(fileInput.files);
      fileInput.value = '';
    };

    function uploadFiles(files) {
      Array.prototype.forEach.call(files, function (f) {
        var maxMB = HR.settings.get().attachment.maxSizeMB || 20;
        if (f.size > maxMB * 1024 * 1024) {
          ui.toastErr('文件 ' + f.name + ' 超过 ' + maxMB + 'MB 限制');
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          db.add('attachment', {
            fileName: f.name, mimeType: f.type, size: f.size, blob: f
          }).then(function (att) {
            return db.add('employee_attachment', {
              employeeId: empId, category: cat || 'other', title: f.name,
              attachmentId: att.id, expireDate: '', remark: ''
            });
          }).then(function () {
            ui.toastOk('已上传 ' + f.name);
            loadAttachments();
          }).catch(function (e) { ui.toastErr('上传失败：' + e.message); });
        };
        reader.readAsArrayBuffer(f);
      });
    }

    // 列表
    db.getAllByIndex('employee_attachment', 'employeeId', empId).then(function (list) {
      if (cat) list = list.filter(function (a) { return a.category === cat; });
      if (list.length === 0) {
        listEl.innerHTML = '';
        listEl.appendChild(ui.empty('🗂', '该员工暂无证件 / 附件'));
        return;
      }
      // 加载附件元数据
      var attIds = list.map(function (a) { return a.attachmentId; }).filter(Boolean);
      Promise.all(attIds.map(function (id) { return db.get('attachment', id); })).then(function (atts) {
        var attMap = {};
        atts.forEach(function (a) { if (a) attMap[a.id] = a; });
        query.dictOptions('attachment_category').then(function (catOpts) {
          var catMap = {};
          catOpts.forEach(function (c) { catMap[c.value] = c.label; });
          var columns = [
            { key: 'title', label: '文件名', render: function (a) {
              var att = attMap[a.attachmentId];
              var ico = att ? fileIco(att.mimeType) : '📄';
              return ico + ' <span>' + U.esc(a.title) + '</span>';
            } },
            { key: 'category', label: '类别', render: function (a) { return '<span class="tag">' + U.esc(catMap[a.category] || a.category) + '</span>'; } },
            { key: 'size', label: '大小', mono: true, render: function (a) { return U.fmtSize(attMap[a.attachmentId] && attMap[a.attachmentId].size); } },
            { key: 'expireDate', label: '有效期至', mono: true, render: function (a) {
              if (!a.expireDate) return '—';
              var d = U.daysFromToday(a.expireDate);
              var cls = d < 0 ? 'danger' : (d <= 30 ? 'warn' : 'ok');
              return '<span class="badge ' + cls + '">' + U.esc(a.expireDate) + (d !== null ? '（' + (d < 0 ? '已过期' : d + ' 天') + '）' : '') + '</span>';
            } },
            { key: 'remark', label: '备注' },
            { key: 'ops', label: '操作', render: function (a) {
              var div = document.createElement('div');
              div.className = 'row-actions';
              if (attMap[a.attachmentId]) {
                div.appendChild(ui.linkBtn('预览', '', function () { previewAttachment(attMap[a.attachmentId]); }));
                div.appendChild(ui.linkBtn('下载', '', function () { downloadAttachment(attMap[a.attachmentId]); }));
              }
              div.appendChild(ui.linkBtn('编辑', '', function () { editAttachmentMeta(a); }));
              div.appendChild(ui.linkBtn('删除', 'act-danger', function () { deleteAttachment(a); }));
              return div;
            } }
          ];
          listEl.innerHTML = '';
          listEl.appendChild(ui.table(columns, list, { emptyText: '暂无附件' }));
        });
      });
    });
  }

  function fileIco(mime) {
    if (!mime) return '📄';
    if (mime.indexOf('image') >= 0) return '🖼';
    if (mime.indexOf('pdf') >= 0) return '📕';
    if (mime.indexOf('word') >= 0 || mime.indexOf('doc') >= 0) return '📘';
    if (mime.indexOf('excel') >= 0 || mime.indexOf('sheet') >= 0) return '📗';
    return '📄';
  }

  function downloadAttachment(att) {
    var blob = att.blob;
    if (!(blob instanceof Blob)) blob = new Blob([blob], { type: att.mimeType || 'application/octet-stream' });
    U.downloadBlob(blob, att.fileName);
  }

  function previewAttachment(att) {
    var blob = att.blob instanceof Blob ? att.blob : new Blob([att.blob], { type: att.mimeType || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var isImage = (att.mimeType || '').indexOf('image') >= 0;
    var body = document.createElement('div');
    if (isImage) {
      var img = document.createElement('img');
      img.src = url;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      body.appendChild(img);
    } else {
      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.width = '100%';
      iframe.style.height = '60vh';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      body.appendChild(iframe);
    }
    var m = ui.modal({ title: '预览 · ' + att.fileName, size: 'lg', body: body });
    m.modal.addEventListener('remove', function () { URL.revokeObjectURL(url); });
  }

  function editAttachmentMeta(a) {
    ui.formModal({
      title: '编辑附件信息',
      size: 'sm',
      fields: [
        { key: 'category', label: '类别', type: 'select', options: [], required: true },
        { key: 'expireDate', label: '有效期至', type: 'date', hint: '证书类到期提醒用，可留空' },
        { key: 'remark', label: '备注', type: 'text' }
      ],
      values: a,
      onSave: function (vals) {
        return db.get('employee_attachment', a.id).then(function (rec) {
          return db.put('employee_attachment', Object.assign({}, rec, vals)).then(function () {
            ui.toastOk('附件信息已更新');
            loadAttachments();
          });
        });
      }
    });
    // 类别下拉需要异步填充
    setTimeout(function () {
      query.dictOptions('attachment_category').then(function (opts) {
        var sel = document.querySelector('#modal-root select[data-field="category"]');
        if (!sel) return;
        sel.innerHTML = '';
        opts.forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o.value; opt.textContent = o.label;
          sel.appendChild(opt);
        });
        sel.value = a.category || '';
      });
    }, 80);
  }

  function deleteAttachment(a) {
    ui.confirm({
      title: '删除附件',
      msg: '确定删除附件 <span class="hl">' + U.esc(a.title) + '</span> 吗？',
      danger: true,
      onOk: function () {
        return db.softDelete('employee_attachment', a.id).then(function () {
          ui.toastOk('附件已删除');
          loadAttachments();
        });
      }
    });
  }

  /* ---------- 注册路由 ---------- */
  HR.router.register('/employee/roster', { title: '在职员工花名册', crumb: '员工档案管理', render: page.renderRoster });
  HR.router.register('/employee/resigned', { title: '离职员工档案', crumb: '员工档案管理', render: page.renderResigned });
  HR.router.register('/employee/profile', { title: '员工基本信息维护', crumb: '员工档案管理', render: page.renderProfile });
  HR.router.register('/employee/attachments', { title: '员工证件 / 附件归档', crumb: '员工档案管理', render: page.renderAttachments });

  global.HR.pages = global.HR.pages || {};
  global.HR.pages.employee = page;
})(window);
