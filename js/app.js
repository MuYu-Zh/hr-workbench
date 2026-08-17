/* ============================================================
 * app.js — 应用启动入口
 *  初始化数据库 → 种子数据 → 文件存储恢复 → 锁屏检查 → 路由渲染 → 提醒定时器
 * ============================================================ */
(function (global) {
  'use strict';

  var U = HR.utils;

  /** 是否 file:// 环境（无 PWA 能力提示） */
  function isFileProtocol() {
    return location.protocol === 'file:';
  }

  /** 注册 Service Worker（仅 secure context） */
  function registerSW() {
    if ('serviceWorker' in navigator && !isFileProtocol()) {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('Service Worker 注册失败:', e);
      });
    }
  }

  /** 环境提示：file:// 下文件存储不可用 */
  function showEnvTip() {
    if (!isFileProtocol()) return;
    var tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:400;background:#242a26;color:#fff;' +
      'padding:12px 16px;border-radius:10px;font-size:12.5px;max-width:320px;box-shadow:0 12px 32px -8px rgba(0,0,0,.4);' +
      'border-left:3px solid #d9a441;line-height:1.7;';
    tip.innerHTML = '💡 当前以文件方式直接打开（file://）。<br>' +
      '如需 <b>PWA 安装</b>、<b>系统通知</b>、<b>自定义数据存储文件夹</b>，' +
      '请通过 <b>start.bat</b> 启动（localhost）后使用。' +
      '<span style="float:right;cursor:pointer;margin-left:10px" onclick="this.parentNode.remove()">✕</span>';
    document.body.appendChild(tip);
  }

  function init() {
    // 顶部日期
    var todayEl = document.getElementById('today');
    if (todayEl) {
      var now = new Date();
      var week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
      todayEl.textContent = U.toDateStr(now) + ' 星期' + week;
    }

    // 打开数据库 → 种子 → 文件存储恢复 → 锁屏 → 路由
    HR.db.open()
      .then(HR.seed.seedIfEmpty)
      .then(function () {
        // 注册文件存储变更钩子（自动同步）
        HR.db.onChange(function () { HR.filestore.notifyChange(); });
        // 尝试恢复上次的文件夹授权
        return HR.filestore.restore().then(function (restored) {
          if (restored) {
            console.log('[filestore] 已恢复存储文件夹授权:', HR.filestore.dirName);
            // 检测文件夹是否有数据文件（用于提示导入）
            return HR.filestore.hasDataFile().then(function (has) {
              if (has && HR.filestore.dirName) {
                // 静默同步一次文件夹中的配置差异由用户在设置页处理；此处不自动覆盖
              }
            });
          }
        });
      })
      .then(function () {
        // 密码锁检查
        var prof = HR.profile.get();
        if (prof.passwordHash) {
          HR.pages.settings.showLock();
        }
        // 渲染菜单与当前页
        HR.router.renderMenu();
        HR.router.start();
        // 提醒定时检查（每 30 秒）
        setInterval(function () { HR.pages.todo.checkReminders(); }, 30000);
      })
      .then(function () {
        // 初始化本地版本号（基于本地 version.json）
        return HR.updater.initLocalVersion();
      })
      .then(function () {
        // 启动后 5 秒静默检查更新（仅 secure context，且不打扰）
        if (location.protocol !== 'file:' && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
          setTimeout(function () {
            HR.updater.check().then(function (info) {
              if (info.hasUpdate) {
                HR.pages.settings.silentUpdateTip(info);
              }
            }).catch(function () { /* 静默失败，不打扰 */ });
          }, 5000);
        }
      })
      .catch(function (err) {
        console.error('初始化失败', err);
        var content = document.getElementById('content');
        content.innerHTML = '<div class="card"><div class="empty-tip"><span class="e-ico">⚠️</span>初始化失败：' +
          U.esc(err && err.message ? err.message : String(err)) + '</div></div>';
      });

    registerSW();
    showEnvTip();
  }

  // DOM 就绪后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
