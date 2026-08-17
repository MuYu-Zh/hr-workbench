/* ============================================================
 * ui.js — 通用 UI 组件（全局命名空间 HR.ui）
 *  modal 弹窗 / form 表单构建 / table 表格渲染 / toast / confirm / pager
 * ============================================================ */
(function (global) {
  'use strict';

  var ui = {};

  /* ---------- Toast ---------- */
  ui.toast = function (msg, type) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    var ico = { ok: '✓', warn: '⚠', err: '✕' }[type || 'ok'] || '✓';
    el.innerHTML = '<span>' + ico + '</span><span>' + HR.utils.esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 320);
    }, 2600);
  };

  ui.toastOk = function (m) { ui.toast(m, 'ok'); };
  ui.toastWarn = function (m) { ui.toast(m, 'warn'); };
  ui.toastErr = function (m) { ui.toast(m, 'err'); };

  /* ---------- Modal ---------- */
  /**
   * 打开弹窗
   * @param {object} opts { title, size: sm|md|lg|xl, body: HTMLElement|string, foot: HTMLElement|string|null, onClose }
   * @returns {object} { mask, modal, close }
   */
  ui.modal = function (opts) {
    var root = document.getElementById('modal-root');
    var mask = document.createElement('div');
    mask.className = 'modal-mask';

    var modal = document.createElement('div');
    modal.className = 'modal ' + (opts.size ? 'modal-' + opts.size : 'modal-md');
    if (opts.size === 'xl') modal.className = 'modal modal-xl';

    var head = document.createElement('div');
    head.className = 'modal-head';
    head.innerHTML = '<h3>' + HR.utils.esc(opts.title || '') + '</h3>';
    var closeBtn = document.createElement('span');
    closeBtn.className = 'm-close';
    closeBtn.innerHTML = '✕';
    closeBtn.title = '关闭';
    head.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    modal.appendChild(head);
    modal.appendChild(body);

    if (opts.foot) {
      var foot = document.createElement('div');
      foot.className = 'modal-foot';
      if (typeof opts.foot === 'string') foot.innerHTML = opts.foot;
      else foot.appendChild(opts.foot);
      modal.appendChild(foot);
    }

    mask.appendChild(modal);
    root.appendChild(mask);

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      mask.remove();
      if (opts.onClose) opts.onClose();
    }
    closeBtn.onclick = close;
    mask.addEventListener('mousedown', function (e) {
      if (e.target === mask) close();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    return { mask: mask, modal: modal, body: body, close: close };
  };

  /* ---------- Confirm ---------- */
  /**
   * 确认框（二次确认）
   * @param {object} opts { title, msg, sub, danger, okText, onOk }
   */
  ui.confirm = function (opts) {
    var msgEl = document.createElement('div');
    msgEl.className = 'confirm-box';
    msgEl.innerHTML = '<div class="c-msg">' + (opts.msg || '确定执行该操作吗？') + '</div>' +
      (opts.sub ? '<div class="c-sub">' + HR.utils.esc(opts.sub) + '</div>' : '');

    var okBtn = document.createElement('button');
    okBtn.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-deep');
    okBtn.innerHTML = opts.okText || '确定';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.innerHTML = '取消';

    var m = ui.modal({
      title: opts.title || '操作确认',
      size: 'sm',
      body: msgEl,
      foot: (function () {
        var f = document.createElement('div');
        f.style.display = 'flex';
        f.style.gap = '10px';
        f.appendChild(cancelBtn);
        f.appendChild(okBtn);
        return f;
      })()
    });

    cancelBtn.onclick = m.close;
    okBtn.onclick = function () {
      var r = opts.onOk && opts.onOk();
      if (r !== false) m.close();
    };
  };

  /* ---------- 表单字段定义 → 构建 ---------- */
  /**
   * 字段定义：
   * { key, label, type: text|number|date|select|textarea|password|email|tel|radio|hidden,
   *   required, options: [{value,label}], value, placeholder, hint, full, group(分区标题), rows }
   */
  ui.form = function (fields, values) {
    var grid = document.createElement('div');
    grid.className = 'form-grid';
    var map = {}; // key → input 元素

    fields.forEach(function (f) {
      if (f.group) {
        var sec = document.createElement('div');
        sec.className = 'f-section';
        sec.textContent = f.group;
        grid.appendChild(sec);
        return;
      }
      var wrap = document.createElement('div');
      wrap.className = 'f-group' + (f.full ? ' full' : '');

      if (f.type !== 'hidden') {
        var label = document.createElement('label');
        label.innerHTML = HR.utils.esc(f.label || f.key || '') + (f.required ? '<span class="req">*</span>' : '');
        wrap.appendChild(label);
      }

      var val = (values && values[f.key] !== undefined) ? values[f.key] : (f.value !== undefined ? f.value : '');
      var input;

      if (f.type === 'select') {
        input = document.createElement('select');
        var opts = f.options || [];
        if (!f.required) opts = [{ value: '', label: '— 请选择 —' }].concat(opts);
        opts.forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          if (String(o.value) === String(val)) opt.selected = true;
          input.appendChild(opt);
        });
      } else if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = f.rows || 3;
        input.value = val === null || val === undefined ? '' : val;
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        input.value = val === null || val === undefined ? '' : val;
      }

      if (f.type !== 'hidden') {
        input.placeholder = f.placeholder || '';
        if (f.hint) {
          var hint = document.createElement('div');
          hint.className = 'hint';
          hint.textContent = f.hint;
          wrap.appendChild(hint);
        }
      }

      input.dataset.field = f.key;
      wrap.appendChild(input);
      map[f.key] = input;
      grid.appendChild(wrap);
    });

    return { el: grid, get: getFormValues, fields: map, validate: function () { return validateForm(fields, map); } };

    function getFormValues() {
      var out = {};
      fields.forEach(function (f) {
        var el = map[f.key];
        if (!el) return;
        if (el.type === 'checkbox') out[f.key] = el.checked;
        else out[f.key] = el.value.trim !== undefined ? el.value.trim() : el.value;
      });
      return out;
    }

    function validateForm(fieldDefs, fieldMap) {
      var errors = [];
      fieldDefs.forEach(function (f) {
        if (!f.required) return;
        var el = fieldMap[f.key];
        if (!el) return;
        var v = el.value.trim !== undefined ? el.value.trim() : el.value;
        if (!v) {
          errors.push((f.label || f.key) + ' 为必填项');
          el.style.borderColor = '#c2503f';
          el.addEventListener('input', function h() {
            el.style.borderColor = '';
            el.removeEventListener('input', h);
          }, { once: true });
        }
      });
      return errors;
    }
  };

  /* ---------- 表格渲染 ---------- */
  /**
   * columns: [{ key, label, width, render(row), align, mono, sortable }]
   */
  ui.table = function (columns, rows, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    var tbl = document.createElement('table');
    tbl.className = 'tbl';

    var thead = document.createElement('thead');
    var trh = document.createElement('tr');
    columns.forEach(function (c) {
      var th = document.createElement('th');
      th.textContent = c.label;
      if (c.width) th.style.width = c.width;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    tbl.appendChild(thead);

    var tbody = document.createElement('tbody');
    if (!rows || rows.length === 0) {
      var trEmpty = document.createElement('tr');
      var tdEmpty = document.createElement('td');
      tdEmpty.colSpan = columns.length;
      tdEmpty.className = 'empty-tip';
      tdEmpty.innerHTML = '<span class="e-ico">' + (opts.emptyIcon || '🗂') + '</span>' + (opts.emptyText || '暂无数据');
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
    } else {
      rows.forEach(function (row, ri) {
        var tr = document.createElement('tr');
        tr.dataset.index = ri;
        columns.forEach(function (c) {
          var td = document.createElement('td');
          var content = c.render ? c.render(row) : (row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '—');
          if (c.mono) td.className = 'num';
          if (c.align) td.style.textAlign = c.align;
          if (typeof content === 'string' || typeof content === 'number') {
            td.innerHTML = content;
          } else if (content instanceof Node) {
            td.appendChild(content);
          } else {
            td.textContent = content;
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);

    // 行点击
    if (opts.onRowClick) {
      tbody.addEventListener('click', function (e) {
        var tr = e.target.closest('tr');
        if (!tr || !tr.dataset.index) return;
        if (e.target.closest('.row-actions')) return; // 操作列不触发行点击
        opts.onRowClick(rows[+tr.dataset.index], tr, e);
      });
    }
    return wrap;
  };

  /* ---------- 分页 ---------- */
  ui.pager = function (opts) {
    var total = opts.total, page = opts.page, pageSize = opts.pageSize, onChange = opts.onChange;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    var wrap = document.createElement('div');
    wrap.className = 'pager';

    var info = document.createElement('span');
    info.className = 'pg-info';
    info.textContent = '共 ' + total + ' 条 · 第 ' + page + '/' + pages + ' 页';
    wrap.appendChild(info);

    function btn(label, disabled, current) {
      var b = document.createElement('button');
      b.className = 'pg-btn' + (current ? ' current' : '');
      b.innerHTML = label;
      b.disabled = !!disabled;
      return b;
    }

    var prev = btn('‹', page <= 1);
    prev.onclick = function () { if (page > 1) onChange(page - 1); };
    wrap.appendChild(prev);

    var start = Math.max(1, page - 2);
    var end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    for (var i = start; i <= end; i++) {
      (function (p) {
        var b = btn(p, false, p === page);
        b.onclick = function () { if (p !== page) onChange(p); };
        wrap.appendChild(b);
      })(i);
    }

    var next = btn('›', page >= pages);
    next.onclick = function () { if (page < pages) onChange(page + 1); };
    wrap.appendChild(next);

    return wrap;
  };

  /* ---------- 工具按钮组 ---------- */
  ui.linkBtn = function (text, cls, onclick) {
    var a = document.createElement('span');
    a.className = 'act-link' + (cls ? ' ' + cls : '');
    a.textContent = text;
    a.onclick = onclick;
    return a;
  };

  /* ---------- 徽章 ---------- */
  ui.badge = function (text, type) {
    var b = document.createElement('span');
    b.className = 'badge ' + (type || 'gray');
    b.textContent = text;
    return b;
  };

  /* ---------- 弹窗内确认后提交的标准表单弹窗 ---------- */
  /**
   * 通用表单弹窗
   * opts: { title, size, fields, values, okText, onSave(values) → Promise|void, width }
   */
  ui.formModal = function (opts) {
    var form = ui.form(opts.fields, opts.values);
    var body = document.createElement('div');
    body.appendChild(form.el);

    var okBtn = document.createElement('button');
    okBtn.className = 'btn btn-deep';
    okBtn.innerHTML = opts.okText || '保存';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.innerHTML = '取消';

    var m = ui.modal({
      title: opts.title,
      size: opts.size || 'md',
      body: body,
      foot: (function () {
        var f = document.createElement('div');
        f.style.display = 'flex';
        f.style.gap = '10px';
        f.appendChild(cancelBtn);
        f.appendChild(okBtn);
        return f;
      })()
    });
    if (opts.width) m.modal.style.maxWidth = opts.width;

    cancelBtn.onclick = m.close;
    okBtn.onclick = function () {
      var errors = form.validate();
      if (errors.length) {
        ui.toastErr(errors[0]);
        return;
      }
      var values = form.get();
      okBtn.disabled = true;
      var r = opts.onSave(values);
      if (r && typeof r.then === 'function') {
        r.then(function () { m.close(); }).catch(function (e) {
          okBtn.disabled = false;
          ui.toastErr(e && e.message ? e.message : '保存失败');
        });
      } else {
        m.close();
      }
    };

    // 聚焦第一个输入框
    setTimeout(function () {
      var first = form.el.querySelector('input, select, textarea');
      if (first) first.focus();
    }, 60);

    return m;
  };

  /* ---------- 空态 ---------- */
  ui.empty = function (icon, text) {
    var d = document.createElement('div');
    d.className = 'empty-tip';
    d.innerHTML = '<span class="e-ico">' + (icon || '🗂') + '</span>' + HR.utils.esc(text || '暂无数据');
    return d;
  };

  global.HR = global.HR || {};
  global.HR.ui = ui;
})(window);
