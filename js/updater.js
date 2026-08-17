/* ============================================================
 * updater.js — 检查更新与自动更新（全局命名空间 HR.updater）
 *
 * 机制：
 *  1. 访问远程仓库 https://raw.githubusercontent.com/<repo>/<branch>/version.json
 *     获取最新版本信息（版本号 + 更新说明 + 文件清单）
 *  2. 与本地版本（localStorage hr.app.version）对比，判定是否有更新
 *  3. 有更新时：逐文件从远程下载 → 写入 Cache Storage（覆盖同路径缓存）
 *     → 删除旧版本缓存 → 更新本地版本号 → 提示刷新页面
 *
 * 安全：仅拉取应用代码文件（version.json 白名单），不接触业务数据
 *      （业务数据在 IndexedDB / 用户文件夹，更新不影响）。
 * ============================================================ */
(function (global) {
  'use strict';

  var VERSION_KEY = 'hr.app.version';
  var CACHE_PREFIX = 'hr-workbench-v';

  var updater = {
    repo: 'MuYu-Zh/hr-workbench',
    branch: 'main',
    rawBase: 'https://raw.githubusercontent.com/MuYu-Zh/hr-workbench/main'
  };

  /** 远程 base URL（可配置仓库） */
  updater.remoteBase = function () {
    return 'https://raw.githubusercontent.com/' + updater.repo + '/' + updater.branch;
  };

  /* ---------- 版本工具 ---------- */
  /** 读取本地版本号 */
  updater.localVersion = function () {
    try { return localStorage.getItem(VERSION_KEY) || '0.0.0'; } catch (e) { return '0.0.0'; }
  };

  /** 初始化本地版本（用本地 version.json，若尚未记录） */
  updater.initLocalVersion = function () {
    return fetch('version.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (v && v.version) {
          if (!updater.localVersion() || updater.localVersion() === '0.0.0') {
            try { localStorage.setItem(VERSION_KEY, v.version); } catch (e) { /* 忽略 */ }
          }
          return v.version;
        }
        return updater.localVersion();
      })
      .catch(function () { return updater.localVersion(); });
  };

  /** semver 比较：a>b 返回 1，相等 0，a<b 返回 -1 */
  function compareVersions(a, b) {
    var pa = String(a || '0').split('.').map(function (x) { return parseInt(x, 10) || 0; });
    var pb = String(b || '0').split('.').map(function (x) { return parseInt(x, 10) || 0; });
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var va = pa[i] || 0, vb = pb[i] || 0;
      if (va > vb) return 1;
      if (va < vb) return -1;
    }
    return 0;
  }
  updater.compare = compareVersions;

  /** 拉取远程 version.json */
  updater.fetchRemote = function () {
    return fetch(updater.remoteBase() + '/version.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('无法获取远程版本信息（HTTP ' + r.status + '）');
        return r.json();
      });
  };

  /**
   * 检查更新
   * @returns Promise<{hasUpdate, current, latest, notes, files, remote}>
   */
  updater.check = function () {
    var cur = updater.localVersion();
    return updater.fetchRemote().then(function (remote) {
      if (!remote || !remote.version) throw new Error('远程版本信息格式不正确');
      var has = compareVersions(remote.version, cur) > 0;
      return {
        hasUpdate: has,
        current: cur,
        latest: remote.version,
        notes: remote.notes || [],
        files: remote.files || [],
        remote: remote
      };
    });
  };

  /**
   * 执行更新：下载新文件 → 覆盖缓存 → 清旧缓存 → 记录版本
   * @param {object} info updater.check() 的返回值（或含 files/latest/remote）
   */
  updater.apply = function (info) {
    if (!info || !info.files || !info.files.length) {
      return Promise.reject(new Error('更新清单为空'));
    }
    var latest = info.latest || (info.remote && info.remote.version);
    var files = info.files;
    var cacheName = CACHE_PREFIX + latest;

    if (!('caches' in global)) {
      // 无 Cache API（非 secure context）：回退为提示手动刷新
      try { localStorage.setItem(VERSION_KEY, latest); } catch (e) { /* 忽略 */ }
      return Promise.resolve({ mode: 'version-only' });
    }

    return global.caches.open(cacheName).then(function (cache) {
      // 逐文件从远程下载并写入缓存（key=同源路径，value=远程内容）
      var jobs = files.map(function (f) {
        var remoteUrl = updater.remoteBase() + '/' + f;
        return fetch(remoteUrl, { cache: 'no-store' }).then(function (resp) {
          if (!resp.ok) throw new Error('下载 ' + f + ' 失败（HTTP ' + resp.status + '）');
          // 以同源相对路径为 key（与 SW fetch 拦截匹配）
          var req = (typeof Request !== 'undefined') ? new Request('./' + f, { mode: 'no-cors' }) : './' + f;
          return cache.put(req, resp);
        });
      });
      return Promise.all(jobs);
    }).then(function () {
      // 删除旧版本缓存
      return global.caches.keys().then(function (keys) {
        return Promise.all(
          keys.filter(function (k) {
            return k.indexOf(CACHE_PREFIX) === 0 && k !== cacheName;
          }).map(function (k) { return global.caches.delete(k); })
        );
      });
    }).then(function () {
      // 记录新版本
      try { localStorage.setItem(VERSION_KEY, latest); } catch (e) { /* 忽略 */ }
      // 通知 Service Worker 更新接管
      if ('serviceWorker' in navigator) {
        return navigator.serviceWorker.getRegistration().then(function (reg) {
          if (!reg) return;
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          return reg.update().catch(function () { /* SW 更新失败不阻断 */ });
        });
      }
    }).then(function () {
      return { mode: 'cache', version: latest };
    });
  };

  /** 清理更新资源（caches）——供设置页"清除缓存"等场景 */
  updater.purgeCache = function () {
    if (!('caches' in global)) return Promise.resolve();
    return global.caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return global.caches.delete(k); }));
    });
  };

  global.HR = global.HR || {};
  global.HR.updater = updater;
})(window);
