/* ============================================================
 * db.js — IndexedDB 数据访问层（全局命名空间 HR.db）
 * 依据《数据模型设计 v1.2》：
 *  - 通用字段 id/createdAt/updatedAt/deleted
 *  - 软删除：deleted=0 正常，deleted=1 已删除
 *  - 唯一性 = 写入前逻辑校验（排除 deleted），不建 unique index
 *  - date-only 存 'YYYY-MM-DD' 字符串；datetime 存 ms 时间戳
 * ============================================================ */
(function (global) {
  'use strict';

  var DB_NAME = 'hr_workbench';
  var DB_VERSION = 1;

  /* 一期使用的 store 定义（二期按数据模型 v1.2 其余表扩展，走版本升级） */
  var STORES = {
    department:        { keyPath: 'id', indexes: { parentId: {}, status: {} } },
    position:          { keyPath: 'id', indexes: { departmentId: {}, series: {}, status: {} } },
    grade:             { keyPath: 'id', indexes: { code: {}, series: {} } },
    employee:          { keyPath: 'id', indexes: { employeeNo: {}, name: {}, status: {}, departmentId: {}, positionId: {}, gradeId: {}, hireDate: {}, birthDate: {}, resignDate: {} } },
    employee_attachment:{ keyPath: 'id', indexes: { employeeId: {}, category: {}, expireDate: {} } },
    attachment:        { keyPath: 'id', indexes: {} },
    todo:              { keyPath: 'id', indexes: { date: {}, priority: {}, done: {} } },
    memo:              { keyPath: 'id', indexes: { category: {}, pinned: {}, updatedAt: {} } },
    reminder:          { keyPath: 'id', indexes: { remindAt: {}, status: {} } },
    quick_link:        { keyPath: 'id', indexes: { category: {}, sortOrder: {} } },
    sys_dict:          { keyPath: 'id', indexes: { group: {} } },
    status_log:        { keyPath: 'id', indexes: { bizType: {}, bizId: {} } }
  };

  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        Object.keys(STORES).forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            var cfg = STORES[name];
            var store = db.createObjectStore(name, { keyPath: cfg.keyPath });
            Object.keys(cfg.indexes || {}).forEach(function (idx) {
              store.createIndex(idx, idx, { unique: false });
            });
          }
        });
      };
      req.onsuccess = function (e) {
        var db = e.target.result;
        db.onversionchange = function () {
          db.close();
          global.alert && global.alert('数据库版本已更新，请刷新页面。');
        };
        resolve(db);
      };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(store, mode) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode || 'readonly');
        var s = t.objectStore(store);
        var result = { tx: t, store: s };
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('事务已中止')); };
        // 让调用方在事务完成前执行操作
        resolve(result);
      });
    });
  }

  /** 执行一个读写事务回调（保证多 store 联动在同一事务内） */
  function run(mode, stores, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(stores, mode);
        var ctx = {};
        stores.forEach(function (s) { ctx[s] = t.objectStore(s); });
        var out;
        try {
          out = fn(ctx, t);
        } catch (err) {
          t.abort();
          reject(err);
          return;
        }
        t.oncomplete = function () { resolve(out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('事务中止')); };
      });
    });
  }

  /** 单 store 事务执行 fn(store) → Promise<result> */
  function withStore(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode || 'readonly');
        var s = t.objectStore(store);
        var result;
        try {
          var ret = fn(s);
          if (ret && typeof ret.then === 'function') {
            ret.then(function (r) { result = r; }).catch(function (e) { t.abort(); reject(e); });
          } else {
            result = ret;
          }
        } catch (err) {
          t.abort();
          reject(err);
          return;
        }
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('事务中止')); };
      });
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  var db = {};

  /** 打开数据库（初始化入口） */
  db.open = open;

  /** 新增（自动补通用字段） */
  db.add = function (store, data) {
    var rec = Object.assign({}, data);
    rec.id = rec.id || HR.utils.uuid();
    rec.createdAt = rec.createdAt || HR.utils.now();
    rec.updatedAt = HR.utils.now();
    if (rec.deleted === undefined) rec.deleted = 0;
    return withStore(store, 'readwrite', function (s) {
      return reqToPromise(s.add(rec));
    }).then(function () { fireChange(); return rec; });
  };

  /** 覆盖写入（upsert，保留 createdAt） */
  db.put = function (store, data) {
    var rec = Object.assign({}, data);
    rec.updatedAt = HR.utils.now();
    if (!rec.id) rec.id = HR.utils.uuid();
    if (rec.deleted === undefined) rec.deleted = 0;
    return withStore(store, 'readwrite', function (s) {
      return reqToPromise(s.put(rec));
    }).then(function () { fireChange(); return rec; });
  };

  /** 按 id 读取（忽略软删除？默认不过滤，由调用方决定） */
  db.get = function (store, id) {
    return withStore(store, 'readonly', function (s) {
      return reqToPromise(s.get(id));
    });
  };

  /** 读取全部（可选过滤软删除） */
  db.getAll = function (store, opts) {
    opts = opts || {};
    return withStore(store, 'readonly', function (s) {
      return reqToPromise(s.getAll());
    }).then(function (list) {
      if (opts.includeDeleted) return list;
      return list.filter(function (r) { return !r.deleted; });
    });
  };

  /** 按索引查询全部匹配项 */
  db.getAllByIndex = function (store, indexName, value, opts) {
    opts = opts || {};
    return withStore(store, 'readonly', function (s) {
      if (!s.indexNames.contains(indexName)) {
        return reqToPromise(s.getAll());
      }
      return reqToPromise(s.index(indexName).getAll(value));
    }).then(function (list) {
      if (opts.includeDeleted) return list;
      return (list || []).filter(function (r) { return !r.deleted; });
    });
  };

  /** 软删除：置 deleted=1（保留数据可追溯） */
  db.softDelete = function (store, id) {
    return db.get(store, id).then(function (rec) {
      if (!rec) return null;
      rec.deleted = 1;
      rec.updatedAt = HR.utils.now();
      return withStore(store, 'readwrite', function (s) {
        return reqToPromise(s.put(rec));
      }).then(function () { fireChange(); return rec; });
    });
  };

  /** 物理删除（数据清理用，需二次确认） */
  db.hardDelete = function (store, id) {
    return withStore(store, 'readwrite', function (s) {
      return reqToPromise(s.delete(id));
    }).then(function () { fireChange(); });
  };

  /** 通用查询：filter(rec) 过滤 + sort 排序 + page 分页（内存过滤，单用户量级足够） */
  db.query = function (store, opts) {
    opts = opts || {};
    return db.getAll(store, { includeDeleted: opts.includeDeleted }).then(function (list) {
      if (opts.includeDeleted === undefined) {
        list = list.filter(function (r) { return !r.deleted; });
      }
      if (opts.filter) list = list.filter(opts.filter);
      if (opts.sort) {
        var key = opts.sort;
        var dir = opts.dir === 'asc' ? 1 : -1;
        var sortMap = opts.sortMap || null; // {value: 权重}，用于枚举优先级排序
        list.sort(function (a, b) {
          var av = a[key], bv = b[key];
          if (av === bv) return 0;
          if (av === undefined || av === null) return 1 * dir;
          if (bv === undefined || bv === null) return -1 * dir;
          if (sortMap && sortMap[av] !== undefined && sortMap[bv] !== undefined) {
            return (sortMap[av] > sortMap[bv] ? 1 : -1) * dir;
          }
          if (typeof av === 'string') return av.localeCompare(bv, 'zh-CN') * dir;
          return (av > bv ? 1 : -1) * dir;
        });
      }
      var total = list.length;
      if (opts.page && opts.pageSize) {
        var start = (opts.page - 1) * opts.pageSize;
        list = list.slice(start, start + opts.pageSize);
      }
      return { list: list, total: total };
    });
  };

  /** 计数 */
  db.count = function (store, filter) {
    return db.getAll(store).then(function (list) {
      if (filter) list = list.filter(filter);
      return list.length;
    });
  };

  /** 逻辑唯一性校验：排除 deleted=1 后，某字段值是否已存在 */
  db.isUnique = function (store, field, value, excludeId) {
    return db.getAll(store).then(function (list) {
      return list.some(function (r) {
        if (excludeId && r.id === excludeId) return false;
        return String(r[field]) === String(value);
      });
    });
  };

  /** 批量新增（种子数据用） */
  db.bulkAdd = function (store, items) {
    return withStore(store, 'readwrite', function (s) {
      var p = Promise.resolve();
      items.forEach(function (it) {
        var rec = Object.assign({}, it);
        rec.id = rec.id || HR.utils.uuid();
        rec.createdAt = rec.createdAt || HR.utils.now();
        rec.updatedAt = HR.utils.now();
        if (rec.deleted === undefined) rec.deleted = 0;
        p = p.then(function () { return reqToPromise(s.put(rec)); });
      });
      return p;
    }).then(function () { fireChange(); });
  };

  /** 清空某 store（物理删除全部，数据清理用） */
  db.clear = function (store) {
    return withStore(store, 'readwrite', function (s) {
      return reqToPromise(s.clear());
    }).then(function () { fireChange(); });
  };

  /** 数据变更钩子：写操作后触发文件存储自动同步 */
  var changeHandler = null;
  function fireChange() {
    if (changeHandler) {
      try { changeHandler(); } catch (e) { /* 忽略钩子异常 */ }
    }
  }
  db.onChange = function (fn) { changeHandler = fn; };

  /** 多 store 联动事务执行（见 run） */
  db.run = run;

  /** 列出所有 store 名 */
  db.listStores = function () { return Object.keys(STORES); };

  global.HR = global.HR || {};
  global.HR.db = db;
})(window);
