/* ============================================================
 * filestore.js — 文件存储模式（方案 A：自定义存储路径）
 * 用户通过 File System Access API 选择一个文件夹，工作台数据以
 * 真实文件落盘：  hr-data.json（业务数据 + 附件元数据）
 *                 attachments/<附件id>.<ext>（附件二进制）
 *                 hr-config.json（系统参数/个人信息）
 *  - 目录句柄持久化到 IndexedDB（浏览器重启后自动恢复授权）
 *  - 每次数据变更后防抖自动同步到文件夹
 *  - 启动时可检测文件夹中是否有更新数据并提示导入
 *
 * 注意：File System Access API 仅 Chrome/Edge（secure context，
 * 即 localhost 或 https）可用；file:// 打开时此模块自动禁用。
 * ============================================================ */
(function (global) {
  'use strict';

  var fsApi = global.FileSystemHandle && global.showDirectoryPicker ? true : false;

  var HANDLE_STORE = 'file_store';   // 存目录句柄
  var DATA_FILE = 'hr-data.json';
  var CONFIG_FILE = 'hr-config.json';
  var ATT_DIR = 'attachments';
  var SYNC_DEBOUNCE = 1500;

  var dirHandle = null;   // 当前授权目录句柄
  var syncing = false;
  var syncTimer = null;
  var lastSyncAt = 0;

  var filestore = {
    supported: fsApi,
    enabled: false,
    dirName: ''
  };

  /* ---------- 目录句柄持久化（IndexedDB 中存句柄） ---------- */
  function saveHandle(handle) {
    return HR.db.run('readwrite', [HANDLE_STORE], function (stores) {
      return new Promise(function (resolve) {
        var req = stores[HANDLE_STORE].put({ id: 'workdir', handle: handle, updatedAt: Date.now() });
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { resolve(); };
      });
    }).catch(function () { /* 句柄存储失败不阻断 */ });
  }

  function loadHandle() {
    if (!fsApi) return Promise.resolve(null);
    return HR.db.open().then(function (db) {
      return new Promise(function (resolve) {
        if (!db.objectStoreNames.contains(HANDLE_STORE)) { resolve(null); return; }
        var t = db.transaction(HANDLE_STORE, 'readonly');
        var req = t.objectStore(HANDLE_STORE).get('workdir');
        req.onsuccess = function () {
          var h = req.result && req.result.handle;
          if (h && h.queryPermission) {
            resolve(h);
          } else {
            resolve(null);
          }
        };
        req.onerror = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }

  /* ---------- 授权恢复 ---------- */
  function requestPermission(handle) {
    if (!handle || !handle.queryPermission) return Promise.resolve(false);
    return handle.queryPermission({ mode: 'readwrite' }).then(function (state) {
      if (state === 'granted') return true;
      return handle.requestPermission({ mode: 'readwrite' }).then(function (s2) {
        return s2 === 'granted';
      });
    }).catch(function () { return false; });
  }

  /* ---------- 文件读写工具 ---------- */
  function writeFile(dir, name, content, type) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) {
      return fh.createWritable().then(function (w) {
        return w.write(content).then(function () { return w.close(); });
      });
    });
  }

  function readFileText(dir, name) {
    return dir.getFileHandle(name).then(function (fh) {
      return fh.getFile().then(function (f) { return f.text(); });
    }).catch(function () { return null; });
  }

  function ensureDir(dir, name) {
    return dir.getDirectoryHandle(name, { create: true });
  }

  /* ---------- 导出：IndexedDB → 文件夹 ---------- */
  function exportToFolder(handle) {
    var stores = HR.db.listStores();
    var data = { app: 'hr_workbench', version: 1, exportedAt: new Date().toISOString(), stores: {} };

    return ensureDir(handle, ATT_DIR).then(function (attDir) {
      var jobs = stores.map(function (name) {
        return HR.db.getAll(name, { includeDeleted: true }).then(function (list) {
          if (name === 'attachment') {
            // 附件：元数据进 json，二进制写文件
            var metaJobs = (list || []).map(function (att) {
              if (att.blob && att.blob instanceof Blob) {
                var ext = extOf(att.fileName || att.id);
                var fname = att.id + ext;
                return writeFile(attDir, fname, att.blob, att.mimeType || 'application/octet-stream')
                  .then(function () {
                    return { id: att.id, fileName: att.fileName, mimeType: att.mimeType, size: att.size, _file: fname, createdAt: att.createdAt, updatedAt: att.updatedAt, deleted: att.deleted };
                  })
                  .catch(function () { return att; }); // 单文件失败降级为内嵌
              }
              return att;
            });
            return Promise.all(metaJobs).then(function (converted) {
              data.stores[name] = converted;
            });
          }
          data.stores[name] = list || [];
        });
      });

      return Promise.all(jobs).then(function () {
        var config = {
          settings: HR.settings.get(),
          profile: HR.profile.get(),
          uiState: HR.uiState.get()
        };
        return writeFile(handle, DATA_FILE, JSON.stringify(data), 'application/json')
          .then(function () { return writeFile(handle, CONFIG_FILE, JSON.stringify(config), 'application/json'); });
      });
    });
  }

  function extOf(fname) {
    var m = /(\.[A-Za-z0-9]{1,10})$/.exec(fname || '');
    return m ? m[1] : '';
  }

  /* ---------- 导入：文件夹 → IndexedDB ---------- */
  function importFromFolder(handle) {
    return ensureDir(handle, ATT_DIR).then(function (attDir) {
      return readFileText(handle, DATA_FILE).then(function (json) {
        if (!json) throw new Error('文件夹中未找到 ' + DATA_FILE + ' 数据文件');
        var data;
        try { data = JSON.parse(json); } catch (e) { throw new Error('数据文件解析失败'); }
        if (!data.stores) throw new Error('数据文件格式不正确');

        var stores = Object.keys(data.stores);
        var jobs = stores.map(function (name) {
          var list = data.stores[name] || [];
          if (name === 'attachment') {
            // 从 attachments/ 读取二进制恢复 Blob
            return Promise.all(list.map(function (att) {
              if (att._file) {
                return attDir.getFileHandle(att._file).then(function (fh) {
                  return fh.getFile();
                }).then(function (file) {
                  return Object.assign({}, att, { blob: file });
                }).catch(function () {
                  return att;
                });
              }
              return att;
            })).then(function (converted) {
              return HR.db.clear(name).then(function () { return HR.db.bulkAdd(name, converted); });
            });
          }
          return HR.db.clear(name).then(function () { return HR.db.bulkAdd(name, list); });
        });
        return Promise.all(jobs).then(function () {
          // 恢复配置
          return readFileText(handle, CONFIG_FILE).then(function (cfgJson) {
            if (cfgJson) {
              try {
                var cfg = JSON.parse(cfgJson);
                if (cfg.settings) HR.settings.set(cfg.settings);
                if (cfg.profile) HR.profile.set(cfg.profile);
              } catch (e) { /* 配置损坏忽略 */ }
            }
          });
        });
      });
    });
  }

  /* ---------- 自动同步（防抖） ---------- */
  function scheduleSync() {
    if (!filestore.enabled || !dirHandle) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      syncTimer = null;
      doSync();
    }, SYNC_DEBOUNCE);
  }

  function doSync() {
    if (!filestore.enabled || !dirHandle || syncing) return Promise.resolve();
    syncing = true;
    return exportToFolder(dirHandle).then(function () {
      lastSyncAt = Date.now();
    }).catch(function (e) {
      console.warn('[filestore] 自动同步失败:', e);
      throw e;
    }).then(function () {
      syncing = false;
    }, function (e) {
      syncing = false;
      throw e;
    });
  }

  /* ---------- 公开 API ---------- */
  /** 选择文件夹并启用文件存储模式 */
  filestore.pickFolder = function () {
    if (!fsApi) return Promise.reject(new Error('当前浏览器不支持文件存储（需 Chrome/Edge，且通过 localhost 或 https 访问）'));
    return global.showDirectoryPicker({ id: 'hr-workbench', mode: 'readwrite', startIn: 'documents' }).then(function (handle) {
      dirHandle = handle;
      filestore.dirName = handle.name || '';
      return saveHandle(handle).then(function () {
        // 先同步一份，并标记启用
        filestore.enabled = true;
        return doSync().then(function () { return handle.name; });
      });
    });
  };

  /** 启动时尝试恢复上次的文件夹授权 */
  filestore.restore = function () {
    if (!fsApi) return Promise.resolve(false);
    return loadHandle().then(function (handle) {
      if (!handle) return false;
      return requestPermission(handle).then(function (ok) {
        if (!ok) return false;
        dirHandle = handle;
        filestore.dirName = handle.name || '';
        filestore.enabled = true;
        return true;
      }).catch(function () { return false; });
    });
  };

  /** 立即同步（手动触发） */
  filestore.syncNow = function () {
    if (!filestore.enabled || !dirHandle) return Promise.reject(new Error('尚未选择存储文件夹'));
    return exportToFolder(dirHandle).then(function () {
      lastSyncAt = Date.now();
      return filestore.dirName;
    });
  };

  /** 从文件夹导入恢复 */
  filestore.restoreFromFolder = function () {
    if (!dirHandle) return Promise.reject(new Error('尚未选择存储文件夹'));
    return importFromFolder(dirHandle);
  };

  /** 检查文件夹中是否有数据文件（供启动提示） */
  filestore.hasDataFile = function () {
    if (!dirHandle) return Promise.resolve(false);
    return readFileText(dirHandle, DATA_FILE).then(function (json) { return !!json; });
  };

  /** 停止文件模式（解除同步，句柄保留以便恢复） */
  filestore.disable = function () {
    filestore.enabled = false;
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  };

  filestore.getState = function () {
    return { supported: fsApi, enabled: filestore.enabled, dirName: filestore.dirName, lastSyncAt: lastSyncAt };
  };

  /** db.js 写操作后调用（全局钩子） */
  filestore.notifyChange = scheduleSync;

  global.HR = global.HR || {};
  global.HR.filestore = filestore;
})(window);
