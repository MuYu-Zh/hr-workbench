/* ============================================================
 * links.js — 常用网址（原有板块，保留）
 *  收藏社保官网、公积金中心、个税系统、招聘平台、OA 系统等快捷链接
 * ============================================================ */
(function (global) {
  'use strict';

  var U = HR.utils, ui = HR.ui, db = HR.db;
  var page = {};

  page.render = function (root) {
    root.innerHTML =
      '<div class="card">' +
      '<div class="card-title"><span class="t-ico">🔗</span>常用网址' +
      '<span class="t-sub">社保、公积金、个税、招聘、OA 快捷入口</span></div>' +
      '<div class="toolbar">' +
      '<select class="filter-sel" id="link-cat"><option value="">全部分类</option></select>' +
      '<button class="btn btn-primary" id="link-add">＋ 新增链接</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-ghost" id="link-reload">⟳ 刷新</button>' +
      '</div>' +
      '<div id="link-grid" class="link-grid"></div>' +
      '</div>';

    // 分类下拉
    queryCategoryOptions().then(function (opts) {
      var sel = document.getElementById('link-cat');
      opts.forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value; opt.textContent = o.label;
        sel.appendChild(opt);
      });
    });

    document.getElementById('link-cat').addEventListener('change', loadLinks);
    document.getElementById('link-add').onclick = function () { openLinkForm(null); };
    document.getElementById('link-reload').onclick = loadLinks;

    loadLinks();
  };

  function queryCategoryOptions() {
    return HR.query.dictOptions('link_category');
  }

  function loadLinks() {
    var cat = document.getElementById('link-cat') ? document.getElementById('link-cat').value : '';
    var catMapPromise = queryCategoryOptions().then(function (opts) {
      var m = {}; opts.forEach(function (o) { m[o.value] = o.label; }); return m;
    });

    db.query('quick_link', { filter: function (l) {
      if (cat && l.category !== cat) return false;
      return true;
    }, sort: 'sortOrder', dir: 'asc' }).then(function (r) {
      return catMapPromise.then(function (catMap) {
        var wrap = document.getElementById('link-grid');
        if (r.list.length === 0) {
          wrap.innerHTML = '';
          wrap.appendChild(ui.empty('🔗', '暂无快捷链接'));
          return;
        }
        wrap.innerHTML = '';
        r.list.forEach(function (l) {
          var card = document.createElement('div');
          card.className = 'link-card';
          card.innerHTML =
            '<div class="l-name"><span class="l-ico">' + U.esc(l.icon || '🌐') + '</span>' + U.esc(l.name) + '</div>' +
            '<div class="l-url">' + U.esc(l.url) + '</div>' +
            '<span class="badge gray l-cat">' + U.esc(catMap[l.category] || l.category || '其他') + '</span>' +
            '<div class="l-ops">' +
            '<button class="btn btn-sm btn-ghost" data-op="edit">编辑</button>' +
            '<button class="btn btn-sm btn-danger" data-op="del">删除</button>' +
            '</div>';
          // 整卡点击打开
          card.addEventListener('click', function (e) {
            if (e.target.closest('[data-op]')) return;
            if (l.url) window.open(l.url, '_blank', 'noopener');
          });
          card.querySelector('[data-op="edit"]').addEventListener('click', function () { openLinkForm(l); });
          card.querySelector('[data-op="del"]').addEventListener('click', function () { deleteLink(l); });
          wrap.appendChild(card);
        });
      });
    });
  }

  function openLinkForm(link) {
    queryCategoryOptions().then(function (catOpts) {
      ui.formModal({
        title: link ? '编辑链接' : '新增链接',
        size: 'sm',
        fields: [
          { key: 'name', label: '名称', type: 'text', required: true, placeholder: '如：BOSS直聘' },
          { key: 'url', label: '网址', type: 'text', required: true, placeholder: 'https://...' },
          { key: 'category', label: '分类', type: 'select', required: true, options: catOpts },
          { key: 'icon', label: '图标', type: 'text', placeholder: 'emoji，如 🌐', hint: '可留空，默认 🌐' },
          { key: 'remark', label: '备注', type: 'text' }
        ],
        values: link,
        onSave: function (vals) {
          if (!/^https?:\/\/.+/i.test(vals.url)) {
            return Promise.reject(new Error('网址需以 http(s):// 开头'));
          }
          if (link) {
            return db.put('quick_link', Object.assign({}, link, vals)).then(function () {
              ui.toastOk('链接已更新'); loadLinks();
            });
          }
          return db.getAll('quick_link').then(function (all) {
            var maxOrder = all.reduce(function (m, l) { return Math.max(m, l.sortOrder || 0); }, 0);
            return db.add('quick_link', Object.assign({ sortOrder: maxOrder + 1 }, vals)).then(function () {
              ui.toastOk('链接已添加'); loadLinks();
            });
          });
        }
      });
    });
  }

  function deleteLink(link) {
    ui.confirm({
      title: '删除链接',
      msg: '确定删除快捷链接 <span class="hl">' + U.esc(link.name) + '</span> 吗？',
      danger: true,
      onOk: function () {
        return db.softDelete('quick_link', link.id).then(function () { ui.toastOk('已删除'); loadLinks(); });
      }
    });
  }

  HR.router.register('/links', { title: '常用网址', crumb: '快捷入口', render: page.render });

  global.HR.pages = global.HR.pages || {};
  global.HR.pages.links = page;
})(window);
