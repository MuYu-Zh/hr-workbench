/* ============================================================
 * org.js — 组织架构模块
 *  1) 组织树维护（新增/编辑/停用/删除）
 *  2) 删除校验：有员工或子节点时禁止删除
 *  3) 组织结构图预览 + 浏览器全屏
 * ============================================================ */
(function (global) {
  'use strict';

  var U = HR.utils, ui = HR.ui, db = HR.db;
  var page = {};
  var state = { collapsedAll: false };

  /* ---------- 树构建 ---------- */
  function buildTree(list) {
    var map = {}, roots = [];
    list.forEach(function (d) { d._children = []; map[d.id] = d; });
    list.forEach(function (d) {
      if (d.parentId && map[d.parentId]) map[d.parentId]._children.push(d);
      else roots.push(d);
    });
    (function sort(nodes) {
      nodes.sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
      nodes.forEach(function (n) { sort(n._children); });
    })(roots);
    return roots;
  }

  function collectDescendants(list, id) {
    var out = [];
    function walk(parentId) {
      list.forEach(function (d) {
        if (d.parentId === parentId && out.indexOf(d.id) < 0) {
          out.push(d.id);
          walk(d.id);
        }
      });
    }
    walk(id);
    return out;
  }

  /* ---------- 页面渲染 ---------- */
  page.render = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">🏢</span>组织架构' +
      '<span class="t-sub">维护公司组织树，并预览组织结构图</span></div>' +
      '<div class="toolbar">' +
      '<button class="btn btn-primary" id="org-add-root">＋ 新增顶级组织</button>' +
      '<button class="btn btn-ghost" id="org-preview">🗂 预览组织结构图</button>' +
      '<button class="btn btn-ghost" id="org-toggle-all">📂 收起全部</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" id="org-reload">⟳ 刷新</button>' +
      '</div>' +
      '<div id="org-tree"></div>' +
      '</div>';

    document.getElementById('org-add-root').onclick = function () { openForm(null, null); };
    document.getElementById('org-preview').onclick = previewChart;
    document.getElementById('org-toggle-all').onclick = function () {
      state.collapsedAll = !state.collapsedAll;
      this.textContent = state.collapsedAll ? '📂 展开全部' : '📂 收起全部';
      loadTree();
    };
    document.getElementById('org-reload').onclick = loadTree;
    loadTree();
  };

  function loadTree() {
    db.getAll('department').then(function (list) {
      var roots = buildTree(list);
      var wrap = document.getElementById('org-tree');
      if (!wrap) return;
      wrap.innerHTML = '';
      if (roots.length === 0) {
        wrap.appendChild(ui.empty('🏢', '暂无组织，点击"新增顶级组织"创建'));
        return;
      }
      var box = document.createElement('div');
      box.className = 'org-tree-list';
      roots.forEach(function (n) { box.appendChild(renderNode(n, 0)); });
      wrap.appendChild(box);
    });
  }

  function renderNode(node, depth) {
    var row = document.createElement('div');
    row.className = 'org-node';
    var hasChildren = node._children.length > 0;
    row.innerHTML =
      '<div class="org-node-row" style="padding-left:' + (depth * 24 + 10) + 'px">' +
      '<span class="org-toggle">' + (hasChildren ? '▾' : '') + '</span>' +
      '<span class="org-name">' + U.esc(node.name) + '</span>' +
      '<span class="org-status' + (node.status === 'disabled' ? ' disabled' : '') + '">' + (node.status === 'disabled' ? '停用' : '正常') + '</span>' +
      '<span class="org-sort">' + (node.sortOrder || 0) + '</span>' +
      '<span class="org-actions">' +
      '<button type="button" class="btn-link" data-act="add">＋子级</button>' +
      '<button type="button" class="btn-link" data-act="edit">编辑</button>' +
      '<button type="button" class="btn-link" data-act="toggle">' + (node.status === 'disabled' ? '启用' : '停用') + '</button>' +
      '<button type="button" class="btn-link act-danger" data-act="del">删除</button>' +
      '</span>' +
      '</div>';

    row.querySelector('[data-act="add"]').onclick = function () { openForm(null, node.id); };
    row.querySelector('[data-act="edit"]').onclick = function () { openForm(node, null); };
    row.querySelector('[data-act="toggle"]').onclick = function () { toggleStatus(node.id); };
    row.querySelector('[data-act="del"]').onclick = function () { deleteDept(node); };

    if (hasChildren && !state.collapsedAll) {
      var childWrap = document.createElement('div');
      childWrap.className = 'org-children';
      node._children.forEach(function (c) { childWrap.appendChild(renderNode(c, depth + 1)); });
      row.appendChild(childWrap);
    }
    return row;
  }

  /* ---------- 新增/编辑 ---------- */
  function openForm(dept, parentId) {
    var isEdit = !!dept;
    db.getAll('department').then(function (all) {
      var exclude = [];
      if (isEdit) exclude = [dept.id].concat(collectDescendants(all, dept.id));
      var options = [{ value: '', label: '（顶级）' }];
      all.filter(function (d) { return exclude.indexOf(d.id) < 0; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
        .forEach(function (d) {
          options.push({ value: d.id, label: d.name + (d.status === 'disabled' ? '（停用）' : '') });
        });

      var fields = [
        { key: 'name', label: '组织名称', type: 'text', required: true },
        { key: 'parentId', label: '上级组织', type: 'select', options: options },
        { key: 'sortOrder', label: '排序号', type: 'number' },
        { key: 'status', label: '状态', type: 'select', options: [
          { value: 'normal', label: '正常' },
          { value: 'disabled', label: '停用' }
        ] }
      ];
      var values = {
        name: dept ? dept.name : '',
        parentId: dept ? (dept.parentId || '') : (parentId || ''),
        sortOrder: dept ? (dept.sortOrder || 0) : 0,
        status: dept ? (dept.status || 'normal') : 'normal'
      };

      ui.formModal({
        title: isEdit ? '编辑组织 · ' + U.esc(dept.name) : '新增组织',
        size: 'sm',
        fields: fields,
        values: values,
        onSave: function (vals) {
          if (!vals.name || !vals.name.trim()) return Promise.reject(new Error('组织名称不能为空'));
          var rec = Object.assign({}, dept || {}, {
            name: vals.name.trim(),
            parentId: vals.parentId || null,
            sortOrder: Number(vals.sortOrder) || 0,
            status: vals.status || 'normal'
          });
          return (isEdit ? db.put('department', rec) : db.add('department', rec)).then(function () {
            ui.toastOk(isEdit ? '组织已更新' : '组织已创建');
            loadTree();
          });
        }
      });
    });
  }

  /* ---------- 停用/启用 ---------- */
  function toggleStatus(id) {
    db.get('department', id).then(function (rec) {
      if (!rec) { ui.toastErr('组织不存在'); return; }
      rec.status = rec.status === 'disabled' ? 'normal' : 'disabled';
      return db.put('department', rec).then(function () {
        ui.toastOk(rec.status === 'disabled' ? '组织已停用' : '组织已启用');
        loadTree();
      });
    });
  }

  /* ---------- 删除（有员工或子节点禁止删除） ---------- */
  function deleteDept(dept) {
    Promise.all([db.getAll('employee'), db.getAll('department')]).then(function (res) {
      var emps = res[0], depts = res[1];
      var hasEmp = emps.some(function (e) { return e.departmentId === dept.id; });
      var hasChild = depts.some(function (d) { return d.parentId === dept.id; });
      if (hasEmp) {
        ui.toastErr('该组织下存在员工，请先调整员工部门');
        return;
      }
      if (hasChild) {
        ui.toastErr('该组织存在子组织，请先移动或删除子组织');
        return;
      }
      ui.confirm({
        title: '删除组织',
        msg: '确定删除组织 <span class="hl">' + U.esc(dept.name) + '</span> 吗？',
        sub: '删除后不可恢复。',
        danger: true,
        onOk: function () {
          return db.hardDelete('department', dept.id).then(function () {
            ui.toastOk('组织已删除');
            loadTree();
          });
        }
      });
    });
  }

  /* ---------- 组织结构图预览 ---------- */
  function previewChart() {
    db.getAll('department').then(function (list) {
      var roots = buildTree(list);
      if (roots.length === 0) {
        ui.toastWarn('暂无组织数据，请先创建组织');
        return;
      }

      var overlay = document.createElement('div');
      overlay.className = 'org-chart-overlay';
      overlay.innerHTML =
        '<div class="org-chart-head">' +
        '<span class="org-chart-title">🏢 组织架构图</span>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn-sm btn-ghost" id="org-chart-fs">⛶ 进入全屏</button>' +
        '<button class="btn btn-sm btn-ghost" id="org-chart-close">✕ 关闭</button>' +
        '</div>' +
        '<div class="org-chart-body" id="org-chart-body"></div>';
      document.body.appendChild(overlay);

      var body = overlay.querySelector('#org-chart-body');
      roots.forEach(function (r) { body.appendChild(renderChartNode(r)); });

      var fsBtn = overlay.querySelector('#org-chart-fs');
      var closeBtn = overlay.querySelector('#org-chart-close');
      fsBtn.onclick = function () {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (overlay.requestFullscreen) {
          overlay.requestFullscreen();
        } else {
          ui.toastWarn('当前浏览器不支持全屏');
        }
      };
      var fsHandler = function () {
        if (!document.fullscreenElement) {
          fsBtn.textContent = '⛶ 进入全屏';
        } else {
          fsBtn.textContent = '🚪 退出全屏';
        }
      };
      closeBtn.onclick = function () {
        if (document.fullscreenElement) document.exitFullscreen();
        overlay.remove();
        document.removeEventListener('fullscreenchange', fsHandler);
      };
      document.addEventListener('fullscreenchange', fsHandler);
    });
  }

  function renderChartNode(node) {
    var box = document.createElement('div');
    box.className = 'chart-node' + (node.status === 'disabled' ? ' disabled' : '');
    box.innerHTML =
      '<div class="chart-node-name">' + U.esc(node.name) + '</div>' +
      (node.status === 'disabled' ? '<div class="chart-node-status">停用</div>' : '');
    if (node._children.length) {
      var childrenWrap = document.createElement('div');
      childrenWrap.className = 'chart-children';
      node._children.forEach(function (c) { childrenWrap.appendChild(renderChartNode(c)); });
      box.appendChild(childrenWrap);
    }
    return box;
  }

  /* ---------- 注册路由 ---------- */
  HR.router.register('/org', { title: '组织架构', crumb: '组织树维护与预览', render: page.render });

  global.HR.pages = global.HR.pages || {};
  global.HR.pages.org = page;
})(window);
