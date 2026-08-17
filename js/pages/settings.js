/* ============================================================
 * settings.js — 系统设置（侧边栏底部）
 *  1) 个人信息修改  2) 密码设置（本地密码锁）  3) 数据导出/导入备份
 *  4) 基础参数配置（提醒天数、考勤、社保公积金比例、绩效等级、附件上限）
 * ============================================================ */
(function (global) {
  'use strict';

  var U = HR.utils, ui = HR.ui, db = HR.db;
  var page = {};

  page.render = function (root) {
    root.innerHTML =
      '<div class="grid grid-2">' +
      '  <div class="card"><div class="card-title"><span class="t-ico">👤</span>个人信息</div><div id="set-profile"></div></div>' +
      '  <div class="card"><div class="card-title"><span class="t-ico">🔒</span>密码设置</div><div id="set-password"></div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:18px"><div class="card-title"><span class="t-ico">📁</span>数据存储位置' +
      '<span class="t-sub">文件存储模式：数据以 hr-data.json + attachments 目录真实落盘</span></div><div id="set-filestore"></div></div>' +
      '<div class="grid grid-2" style="margin-top:18px">' +
      '  <div class="card"><div class="card-title"><span class="t-ico">💾</span>数据备份与恢复</div><div id="set-backup"></div></div>' +
      '  <div class="card"><div class="card-title"><span class="t-ico">📊</span>数据导出</div><div id="set-export"></div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:18px"><div class="card-title"><span class="t-ico">🔄</span>检查更新' +
      '<span class="t-sub">对接 GitHub 仓库，自动检测并更新应用</span></div><div id="set-updater"></div></div>' +
      '<div class="card" style="margin-top:18px"><div class="card-title"><span class="t-ico">⚙️</span>基础参数配置</div><div id="set-params"></div></div>';

    renderProfile();
    renderPassword();
    renderFileStore();
    renderBackup();
    renderExport();
    renderUpdater();
    renderParams();
  };

  /* ---------- 检查更新模块 ---------- */
  function renderUpdater() {
    var box = document.getElementById('set-updater');
    var up = HR.updater;
    var cur = up.localVersion();
    var isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    var html = '<div class="set-row"><div class="set-main"><div class="set-name">当前版本：v' + U.esc(cur) + '</div>' +
      '<div class="set-desc">' + (isSecure ? '更新源：' + U.esc(up.repo) + '（' + U.esc(up.branch) + ' 分支）' : 'file:// 环境无法更新，请通过 start.bat 启动后使用') + '</div></div>' +
      (isSecure ? '<button class="btn btn-sm btn-deep" id="upd-check">🔍 检查更新</button>' : '') + '</div>' +
      '<div id="upd-result"></div>';

    box.innerHTML = html;

    var btn = document.getElementById('upd-check');
    if (btn) {
      btn.onclick = function () {
        btn.disabled = true;
        btn.textContent = '检查中…';
        document.getElementById('upd-result').innerHTML = '<div class="muted" style="padding:8px 4px;font-size:12.5px">正在连接 GitHub 仓库…</div>';
        up.check().then(function (info) {
          var res = document.getElementById('upd-result');
          if (!info.hasUpdate) {
            res.innerHTML = '<div class="set-row"><div class="set-main"><div class="set-name" style="color:var(--ok)">✅ 已是最新版本</div>' +
              '<div class="set-desc">当前 v' + U.esc(info.current) + '，远程 v' + U.esc(info.latest) + '</div></div></div>';
          } else {
            var notesHtml = (info.notes || []).map(function (n) {
              return '<div style="padding:3px 0">· ' + U.esc(n) + '</div>';
            }).join('');
            res.innerHTML = '<div class="set-row"><div class="set-main"><div class="set-name" style="color:var(--accent-deep)">🆕 发现新版本 v' + U.esc(info.latest) + '</div>' +
              '<div class="set-desc">当前 v' + U.esc(info.current) + ' → 最新 v' + U.esc(info.latest) + '</div>' +
              '<div class="set-desc" style="margin-top:6px;background:var(--card-soft);border:1px solid var(--line-soft);border-radius:8px;padding:8px 12px">' + notesHtml + '</div></div>' +
              '<button class="btn btn-sm btn-deep" id="upd-apply">⬇ 立即更新</button>' +
              '<button class="btn btn-sm btn-ghost" id="upd-dismiss">稍后再说</button></div>';
            document.getElementById('upd-apply').onclick = function () { doUpdate(info); };
            document.getElementById('upd-dismiss').onclick = function () {
              res.innerHTML = '<div class="muted" style="padding:8px 4px;font-size:12.5px">已忽略，可在下次启动或手动检查时再更新。</div>';
            };
          }
        }).catch(function (e) {
          document.getElementById('upd-result').innerHTML =
            '<div class="set-row"><div class="set-main"><div class="set-name" style="color:var(--danger)">⚠️ 检查更新失败</div>' +
            '<div class="set-desc">' + U.esc(e.message || '网络错误') + '<br>请确认网络可访问 GitHub（raw.githubusercontent.com）。</div></div></div>';
        }).then(function () {
          btn.disabled = false;
          btn.textContent = '🔍 检查更新';
        });
      };
    }
  }

  /** 静默检查发现新版本时的浮层提示（启动时） */
  page.silentUpdateTip = function (info) {
    var tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;top:70px;right:20px;z-index:350;background:#242a26;color:#fff;' +
      'padding:14px 18px;border-radius:12px;font-size:13px;max-width:340px;box-shadow:0 16px 40px -10px rgba(0,0,0,.5);' +
      'border-left:3px solid #d9a441;line-height:1.7;animation:toastIn .3s cubic-bezier(.2,.9,.3,1.15);';
    var notes = (info.notes || []).slice(0, 3).map(function (n) {
      return '<div style="color:rgba(255,255,255,.75);font-size:12px">· ' + U.esc(n) + '</div>';
    }).join('');
    tip.innerHTML =
      '<div style="font-weight:600;margin-bottom:6px">🆕 发现新版本 v' + U.esc(info.latest) + '</div>' +
      notes +
      '<div style="margin-top:12px;display:flex;gap:8px">' +
      '<button id="tip-update" style="flex:1;background:#d9a441;color:#241a05;border:none;border-radius:8px;padding:7px 0;font-size:12.5px;cursor:pointer;font-weight:600">立即更新</button>' +
      '<button id="tip-later" style="flex:1;background:rgba(255,255,255,.12);color:#fff;border:none;border-radius:8px;padding:7px 0;font-size:12.5px;cursor:pointer">稍后</button>' +
      '</div>';
    document.body.appendChild(tip);

    tip.querySelector('#tip-update').onclick = function () {
      tip.remove();
      doUpdate(info);
    };
    tip.querySelector('#tip-later').onclick = function () { tip.remove(); };
    // 10 秒后自动收起
    setTimeout(function () {
      if (tip.parentNode) tip.remove();
    }, 20000);
  };

  /** 执行更新 */
  function doUpdate(info) {
    ui.confirm({
      title: '确认更新',
      msg: '将更新到 <span class="hl">v' + U.esc(info.latest) + '</span>，确定立即下载安装吗？',
      sub: '更新仅替换应用文件，您的数据（IndexedDB / 存储文件夹）不受影响。更新完成后页面将自动刷新。',
      onOk: function () {
        var res = document.getElementById('upd-result');
        if (res) res.innerHTML = '<div class="muted" style="padding:8px 4px;font-size:12.5px">正在下载更新文件…</div>';
        return HR.updater.apply(info).then(function () {
          ui.toastOk('更新完成，正在刷新…');
          setTimeout(function () { location.reload(); }, 1200);
        }).catch(function (e) {
          ui.toastErr('更新失败：' + (e.message || '未知错误'));
          if (res) res.innerHTML = '<div class="set-row"><div class="set-main"><div class="set-name" style="color:var(--danger)">⚠️ 更新失败</div>' +
            '<div class="set-desc">' + U.esc(e.message || '未知错误') + '</div></div></div>';
        });
      }
    });
  }

  /* ---------- 数据存储位置（文件存储模式） ---------- */
  function renderFileStore() {
    var box = document.getElementById('set-filestore');
    var fs = HR.filestore;
    var st = fs.getState();

    var html = '';
    if (!fs.supported) {
      html += '<div class="set-row"><div class="set-main"><div class="set-name">文件存储模式不可用</div>' +
        '<div class="set-desc">当前浏览器/环境不支持 File System Access API。<br>' +
        '请使用 Chrome 或 Edge 浏览器，并通过 <b>localhost 或 https</b> 访问本工作台（双击 index.html 的 file:// 方式不支持）。<br>' +
        '当前数据仍安全保存在浏览器 IndexedDB 中，可用下方"全量备份"导出。</div></div></div>';
      box.innerHTML = html;
      return;
    }

    if (st.enabled) {
      html += '<div class="set-row"><div class="set-main"><div class="set-name">✅ 已启用文件存储</div>' +
        '<div class="set-desc">存储文件夹：<b>' + U.esc(st.dirName) + '</b><br>' +
        '数据实时落盘到该文件夹（hr-data.json + attachments/ 附件目录），可拷贝、迁移、用任何文本工具查看。<br>' +
        '上次同步：' + (st.lastSyncAt ? U.fmtDateTime(st.lastSyncAt) : '启动后尚未同步') + '</div></div>' +
        '<button class="btn btn-sm btn-deep" id="fs-sync">立即同步</button>' +
        '<button class="btn btn-sm btn-ghost" id="fs-import">从文件夹恢复</button>' +
        '<button class="btn btn-sm btn-danger" id="fs-off">停止文件存储</button></div>';
    } else {
      html += '<div class="set-row"><div class="set-main"><div class="set-name">当前使用浏览器内置存储（IndexedDB）</div>' +
        '<div class="set-desc">数据存在浏览器中，刷新/关闭不丢失，但文件不可见、换电脑需手动迁移。<br>' +
        '选择"启用文件存储"后，数据将以真实文件写入你指定的文件夹（推荐）。</div></div>' +
        '<button class="btn btn-sm btn-deep" id="fs-on">📁 选择文件夹并启用</button></div>';
    }
    box.innerHTML = html;

    var onBtn = document.getElementById('fs-on');
    var syncBtn = document.getElementById('fs-sync');
    var importBtn = document.getElementById('fs-import');
    var offBtn = document.getElementById('fs-off');

    if (onBtn) {
      onBtn.onclick = function () {
        fs.pickFolder().then(function (name) {
          ui.toastOk('文件存储已启用：' + name);
          renderFileStore();
        }).catch(function (e) {
          if (e && e.name === 'AbortError') return; // 用户取消
          ui.toastErr(e && e.message ? e.message : '启用失败');
        });
      };
    }
    if (syncBtn) {
      syncBtn.onclick = function () {
        syncBtn.disabled = true;
        fs.syncNow().then(function () {
          ui.toastOk('已同步到文件夹');
          renderFileStore();
        }).catch(function (e) { ui.toastErr(e.message); })
          .then(function () { syncBtn.disabled = false; });
      };
    }
    if (importBtn) {
      importBtn.onclick = function () {
        ui.confirm({
          title: '从文件夹恢复',
          msg: '确定从文件夹中的 hr-data.json <span class="hl">覆盖当前数据</span>吗？',
          sub: '当前浏览器中的数据将被文件夹里的数据替换，此操作不可撤销。建议先"立即同步"备份当前数据。',
          danger: true,
          onOk: function () {
            return fs.restoreFromFolder().then(function () {
              ui.toastOk('已从文件夹恢复');
              setTimeout(function () { location.reload(); }, 800);
            });
          }
        });
      };
    }
    if (offBtn) {
      offBtn.onclick = function () {
        ui.confirm({
          title: '停止文件存储',
          msg: '确定停止文件存储模式吗？',
          sub: '停止后数据不再自动写入文件夹，改回浏览器 IndexedDB 存储。文件夹中已同步的数据仍保留，可随时重新启用。',
          onOk: function () {
            fs.disable();
            ui.toastOk('已停止文件存储（数据仍在 IndexedDB）');
            renderFileStore();
          }
        });
      };
    }
  }

  /* ---------- 1) 个人信息 ---------- */
  function renderProfile() {
    var p = HR.profile.get();
    var box = document.getElementById('set-profile');
    box.innerHTML =
      '<div class="set-row"><div class="set-main"><div class="set-name">' + U.esc(p.name || '人事专员') + '</div>' +
      '<div class="set-desc">' + U.esc(p.title || '人事专员') + '</div></div></div>' +
      '<div class="set-row"><div class="set-main"><div class="set-name">联系方式</div>' +
      '<div class="set-desc">' + U.esc(p.phone || '未填写') + ' · ' + U.esc(p.email || '未填写') + '</div></div>' +
      '<button class="btn btn-sm btn-ghost" id="profile-edit">编辑</button></div>';

    document.getElementById('profile-edit').onclick = function () {
      ui.formModal({
        title: '修改个人信息',
        size: 'sm',
        fields: [
          { key: 'name', label: '姓名', type: 'text', required: true },
          { key: 'title', label: '职位', type: 'text' },
          { key: 'phone', label: '手机', type: 'tel' },
          { key: 'email', label: '邮箱', type: 'email' }
        ],
        values: p,
        onSave: function (vals) {
          if (vals.email && !U.validEmail(vals.email)) return Promise.reject(new Error('邮箱格式不正确'));
          HR.profile.set(vals);
          ui.toastOk('个人信息已更新');
          renderProfile();
        }
      });
    };
  }

  /* ---------- 2) 密码设置 ---------- */
  function renderPassword() {
    var p = HR.profile.get();
    var hasPwd = !!p.passwordHash;
    var box = document.getElementById('set-password');
    box.innerHTML =
      '<div class="set-row"><div class="set-main"><div class="set-name">本地密码锁</div>' +
      '<div class="set-desc">' + (hasPwd ? '已启用：打开工作台需输入密码' : '未启用：当前无需密码即可打开') + '</div></div>' +
      (hasPwd
        ? '<button class="btn btn-sm btn-ghost" id="pwd-change">修改</button><button class="btn btn-sm btn-danger" id="pwd-clear">关闭</button>'
        : '<button class="btn btn-sm btn-deep" id="pwd-set">开启</button>') + '</div>';

    var setBtn = document.getElementById('pwd-set');
    var changeBtn = document.getElementById('pwd-change');
    var clearBtn = document.getElementById('pwd-clear');

    function openPwdForm(mode) {
      var fields = [
        { key: 'pwd', label: '新密码', type: 'password', required: true, hint: '至少 4 位' },
        { key: 'pwd2', label: '确认新密码', type: 'password', required: true }
      ];
      if (mode === 'change') {
        fields.unshift({ key: 'old', label: '原密码', type: 'password', required: true });
      }
      ui.formModal({
        title: mode === 'set' ? '开启密码锁' : '修改密码',
        size: 'sm',
        fields: fields,
        onSave: function (vals) {
          if (vals.pwd.length < 4) return Promise.reject(new Error('密码至少 4 位'));
          if (vals.pwd !== vals.pwd2) return Promise.reject(new Error('两次输入的密码不一致'));
          var prof = HR.profile.get();
          if (mode === 'change' && U.hash(vals.old) !== prof.passwordHash) {
            return Promise.reject(new Error('原密码不正确'));
          }
          HR.profile.set({ passwordHash: U.hash(vals.pwd) });
          ui.toastOk(mode === 'set' ? '密码锁已开启' : '密码已修改');
          renderPassword();
        }
      });
    }

    if (setBtn) setBtn.onclick = function () { openPwdForm('set'); };
    if (changeBtn) changeBtn.onclick = function () { openPwdForm('change'); };
    if (clearBtn) clearBtn.onclick = function () {
      ui.confirm({
        title: '关闭密码锁',
        msg: '确定关闭本地密码锁吗？',
        sub: '关闭后打开工作台不再需要密码。',
        danger: true,
        onOk: function () {
          HR.profile.set({ passwordHash: '' });
          ui.toastOk('密码锁已关闭');
          renderPassword();
        }
      });
    };
  }

  /* ---------- 锁屏 ---------- */
  function showLock() {
    var mask = document.createElement('div');
    mask.className = 'lock-mask';
    mask.innerHTML =
      '<div class="lock-box">' +
      '<div class="lock-mark">🔒</div>' +
      '<h2>人事工作台</h2>' +
      '<p>请输入密码解锁</p>' +
      '<input type="password" id="lock-input" placeholder="••••••">' +
      '<div class="lock-err" id="lock-err"></div>' +
      '<button class="btn btn-deep" style="width:100%;justify-content:center" id="lock-btn">解锁</button>' +
      '</div>';
    document.body.appendChild(mask);
    var input = mask.querySelector('#lock-input');
    input.focus();
    function tryUnlock() {
      var prof = HR.profile.get();
      if (U.hash(input.value) === prof.passwordHash) {
        mask.remove();
        ui.toastOk('欢迎回来，' + (prof.name || '人事专员'));
      } else {
        mask.querySelector('#lock-err').textContent = '密码错误，请重试';
        input.value = '';
        input.focus();
      }
    }
    mask.querySelector('#lock-btn').onclick = tryUnlock;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });
  }
  page.showLock = showLock;

  /* ---------- 3) 数据备份与恢复 ---------- */
  function renderBackup() {
    var box = document.getElementById('set-backup');
    box.innerHTML =
      '<div class="set-row"><div class="set-main"><div class="set-name">全量备份</div>' +
      '<div class="set-desc">导出全部业务数据 + 附件 + 配置（JSON）</div></div>' +
      '<button class="btn btn-sm btn-deep" id="backup-do">导出备份</button></div>' +
      '<div class="set-row"><div class="set-main"><div class="set-name">恢复备份</div>' +
      '<div class="set-desc">从备份 JSON 恢复全部数据（覆盖当前）</div></div>' +
      '<button class="btn btn-sm btn-ghost" id="backup-restore">选择文件</button></div>' +
      '<input type="file" id="backup-file" accept=".json" style="display:none">';

    document.getElementById('backup-do').onclick = doBackup;
    var fileInput = document.getElementById('backup-file');
    document.getElementById('backup-restore').onclick = function () { fileInput.click(); };
    fileInput.onchange = function () {
      if (fileInput.files.length) restoreBackup(fileInput.files[0]);
      fileInput.value = '';
    };
  }

  /** 全量导出：数据 + 附件（base64）+ 配置 */
  function doBackup() {
    ui.toastWarn('正在打包备份…');
    var stores = db.listStores();
    var data = { app: 'hr_workbench', version: 1, exportedAt: U.fmtDateTime(U.now()), stores: {} };
    var jobs = stores.map(function (name) {
      return db.getAll(name, { includeDeleted: true }).then(function (list) {
        // 附件表特殊处理：Blob → base64
        if (name === 'attachment') {
          return Promise.all(list.map(function (att) {
            if (att.blob && att.blob instanceof Blob) {
              return blobToBase64(att.blob).then(function (b64) {
                return Object.assign({}, att, { _b64: b64 });
              });
            }
            return att;
          })).then(function (converted) {
            data.stores[name] = converted;
          });
        }
        data.stores[name] = list;
      });
    });
    Promise.all(jobs).then(function () {
      var payload = {
        meta: { app: data.app, version: data.version, exportedAt: data.exportedAt },
        stores: data.stores,
        config: {
          settings: HR.settings.get(),
          profile: HR.profile.get(),
          uiState: HR.uiState.get()
        }
      };
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      U.downloadBlob(blob, '人事工作台备份_' + U.today() + '.json');
      ui.toastOk('备份已导出');
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result.split(',')[1]); };
      reader.onerror = function () { resolve(''); };
      reader.readAsDataURL(blob);
    });
  }

  function restoreBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var payload = JSON.parse(reader.result);
        if (!payload.stores || payload.meta && payload.meta.app !== 'hr_workbench') {
          ui.toastErr('备份文件格式不正确');
          return;
        }
        ui.confirm({
          title: '恢复备份',
          msg: '确定从备份恢复全部数据吗？',
          sub: '当前所有数据将被备份内容覆盖，此操作不可撤销。建议先导出一份当前备份。',
          danger: true,
          onOk: function () {
            ui.toastWarn('正在恢复…');
            // 附件 base64 → Blob
            var jobs = Object.keys(payload.stores).map(function (name) {
              var list = payload.stores[name] || [];
              if (name === 'attachment') {
                return Promise.all(list.map(function (att) {
                  if (att._b64) {
                    var binary = atob(att._b64);
                    var arr = new Uint8Array(binary.length);
                    for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                    return Object.assign({}, att, { blob: new Blob([arr], { type: att.mimeType || 'application/octet-stream' }) });
                  }
                  return att;
                })).then(function (converted) {
                  return db.clear(name).then(function () { return db.bulkAdd(name, converted); });
                });
              }
              return db.clear(name).then(function () { return db.bulkAdd(name, list); });
            });
            Promise.all(jobs).then(function () {
              if (payload.config) {
                if (payload.config.settings) HR.settings.set(payload.config.settings);
                if (payload.config.profile) HR.profile.set(payload.config.profile);
              }
              ui.toastOk('备份恢复完成');
              setTimeout(function () { location.hash = '#/dashboard'; location.reload(); }, 800);
            }).catch(function (e) { ui.toastErr('恢复失败：' + e.message); });
          }
        });
      } catch (e) {
        ui.toastErr('备份文件解析失败：' + e.message);
      }
    };
    reader.readAsText(file);
  }

  /* ---------- 4) 数据导出（分模块 CSV） ---------- */
  function renderExport() {
    var box = document.getElementById('set-export');
    box.innerHTML =
      '<div class="set-row"><div class="set-main"><div class="set-name">在职员工花名册</div>' +
      '<div class="set-desc">导出 CSV（Excel 可直接打开）</div></div>' +
      '<button class="btn btn-sm btn-ghost" data-export="roster">导出</button></div>' +
      '<div class="set-row"><div class="set-main"><div class="set-name">离职员工档案</div>' +
      '<div class="set-desc">导出 CSV</div></div>' +
      '<button class="btn btn-sm btn-ghost" data-export="resigned">导出</button></div>' +
      '<div class="set-row"><div class="set-main"><div class="set-name">待办事项</div>' +
      '<div class="set-desc">导出 CSV</div></div>' +
      '<button class="btn btn-sm btn-ghost" data-export="todo">导出</button></div>' +
      '<div class="set-row"><div class="set-main"><div class="set-name">常用网址</div>' +
      '<div class="set-desc">导出 CSV</div></div>' +
      '<button class="btn btn-sm btn-ghost" data-export="links">导出</button></div>';

    box.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.onclick = function () { exportModule(btn.dataset.export); };
    });
  }

  function exportModule(which) {
    var jobs = {
      roster: function () {
        return db.query('employee', { filter: function (e) { return e.status === 'active'; }, sort: 'employeeNo' })
          .then(function (r) {
            U.exportCSV('在职员工花名册_' + U.today() + '.csv',
              ['工号', '姓名', '性别', '民族', '出生日期', '身份证号', '手机', '邮箱', '部门', '岗位', '职级', '入职日期', '转正日期', '学历', '学校', '专业'],
              r.list.map(function (e) {
                return [e.employeeNo, e.name, e.gender === 'male' ? '男' : '女', e.nationality, e.birthDate, e.idCard, e.phone, e.email, e.departmentId, e.positionId, e.gradeId, e.hireDate, e.regularDate, e.education, e.school, e.major];
              }));
            ui.toastOk('已导出 ' + r.total + ' 条');
          });
      },
      resigned: function () {
        return db.query('employee', { filter: function (e) { return e.status !== 'active'; }, sort: 'resignDate', dir: 'desc' })
          .then(function (r) {
            U.exportCSV('离职员工档案_' + U.today() + '.csv',
              ['工号', '姓名', '离职日期', '离职类型', '离职原因', '交接人', '交接完成', '状态'],
              r.list.map(function (e) {
                var ri = e.resignInfo || {};
                return [e.employeeNo, e.name, e.resignDate || ri.date, ri.type, ri.reason, ri.handoverBy, ri.handoverDone ? '是' : '否', e.status === 'resigned' ? '已离职' : '交接中'];
              }));
            ui.toastOk('已导出 ' + r.total + ' 条');
          });
      },
      todo: function () {
        return db.query('todo', { sort: 'date', dir: 'desc' }).then(function (r) {
          U.exportCSV('待办事项_' + U.today() + '.csv',
            ['日期', '内容', '优先级', '分类', '完成', '提醒时间'],
            r.list.map(function (t) {
              return [t.date, t.content, { high: '高', medium: '中', low: '低' }[t.priority] || t.priority, t.category, t.done ? '是' : '否', t.remindAt ? U.fmtDateTime(t.remindAt) : ''];
            }));
          ui.toastOk('已导出 ' + r.total + ' 条');
        });
      },
      links: function () {
        return db.query('quick_link', { sort: 'sortOrder' }).then(function (r) {
          U.exportCSV('常用网址_' + U.today() + '.csv', ['名称', '网址', '分类', '备注'],
            r.list.map(function (l) { return [l.name, l.url, l.category, l.remark]; }));
          ui.toastOk('已导出 ' + r.total + ' 条');
        });
      }
    };
    (jobs[which] || function () {} )();
  }

  /* ---------- 5) 基础参数配置 ---------- */
  function renderParams() {
    var s = HR.settings.get();
    var box = document.getElementById('set-params');
    var form = ui.form([
      { group: '提醒天数' },
      { key: 'birthday', label: '生日提醒（天）', type: 'number', value: s.remindDays.birthday },
      { key: 'probation', label: '转正提醒（天）', type: 'number', value: s.remindDays.probation },
      { key: 'cert', label: '证件到期提醒（天）', type: 'number', value: s.remindDays.cert },
      { group: '考勤规则（二期生效）' },
      { key: 'lateMin', label: '迟到阈值（分钟）', type: 'number', value: s.attendance.lateThresholdMin },
      { key: 'start', label: '默认上班时间', type: 'text', value: s.attendance.defaultStart },
      { key: 'end', label: '默认下班时间', type: 'text', value: s.attendance.defaultEnd },
      { group: '社保公积金比例（%，二期生效）' },
      { key: 'pension', label: '养老（单位/个人）', type: 'text', value: s.social.pension.company + '/' + s.social.pension.personal },
      { key: 'medical', label: '医疗（单位/个人）', type: 'text', value: s.social.medical.company + '/' + s.social.medical.personal },
      { key: 'fundRate', label: '公积金（单位/个人）', type: 'text', value: s.fund.companyRate + '/' + s.fund.personalRate },
      { group: '其他' },
      { key: 'maxSizeMB', label: '附件上限（MB）', type: 'number', value: s.attachment.maxSizeMB }
    ]);
    box.innerHTML = '';
    box.appendChild(form.el);
    var foot = document.createElement('div');
    foot.className = 'toolbar';
    foot.style.marginTop = '14px';
    var saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-deep';
    saveBtn.innerHTML = '保存参数';
    var resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-ghost';
    resetBtn.innerHTML = '恢复默认';
    foot.appendChild(saveBtn);
    foot.appendChild(resetBtn);
    box.appendChild(foot);

    saveBtn.onclick = function () {
      var v = form.get();
      var next = {
        remindDays: { contract: s.remindDays.contract, cert: +v.cert || 30, birthday: +v.birthday || 7, probation: +v.probation || 15 },
        attendance: { lateThresholdMin: +v.lateMin || 5, defaultStart: v.start || '09:00', defaultEnd: v.end || '18:00' },
        social: {
          pension: parseRatio(v.pension, [16, 8]),
          medical: parseRatio(v.medical, [9, 2]),
          unemployment: s.social.unemployment,
          injury: s.social.injury,
          maternity: s.social.maternity
        },
        fund: parseRatio(v.fundRate, [12, 12]).length === 2
          ? { companyRate: parseRatio(v.fundRate, [12, 12])[0], personalRate: parseRatio(v.fundRate, [12, 12])[1] }
          : s.fund,
        perf: s.perf,
        payslip: s.payslip,
        attachment: { maxSizeMB: +v.maxSizeMB || 20 }
      };
      HR.settings.set(next);
      ui.toastOk('参数已保存');
    };
    resetBtn.onclick = function () {
      ui.confirm({
        title: '恢复默认参数',
        msg: '确定将所有参数恢复为默认值吗？',
        onOk: function () {
          HR.settings.reset();
          ui.toastOk('已恢复默认');
          renderParams();
        }
      });
    };
  }

  function parseRatio(str, def) {
    if (!str) return def;
    var parts = String(str).split('/').map(function (p) { return parseFloat(p); });
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return def;
    return parts;
  }

  HR.router.register('/settings', { title: '系统设置', crumb: '个人信息 · 密码 · 备份 · 参数', render: page.render });

  global.HR.pages = global.HR.pages || {};
  global.HR.pages.settings = page;
})(window);
