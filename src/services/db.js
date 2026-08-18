/* IndexedDB data access layer for Vue app */

const DB_NAME = 'hr_workbench'
const DB_VERSION = 4

export const STORES = {
  department: { keyPath: 'id', indexes: { parentId: {}, status: {} } },
  employee: { keyPath: 'id', indexes: { employeeNo: {}, name: {}, status: {}, departmentId: {}, hireDate: {}, birthDate: {}, resignDate: {} } },
  employee_attachment: { keyPath: 'id', indexes: { employeeId: {}, category: {}, expireDate: {} } },
  attachment: { keyPath: 'id', indexes: {} },
  todo: { keyPath: 'id', indexes: { date: {}, priority: {}, done: {} } },
  memo: { keyPath: 'id', indexes: { category: {}, pinned: {}, updatedAt: {} } },
  reminder: { keyPath: 'id', indexes: { remindAt: {}, status: {} } },
  quick_link: { keyPath: 'id', indexes: { category: {}, sortOrder: {} } },
  sys_dict: { keyPath: 'id', indexes: { group: {} } },
  status_log: { keyPath: 'id', indexes: { bizType: {}, bizId: {} } },
  recruit_requirement: { keyPath: 'id', indexes: { reqNo: {}, departmentId: {}, status: {} } },
  candidate: { keyPath: 'id', indexes: { name: {}, phone: {}, status: {}, requirementId: {}, source: {} } },
  interview: { keyPath: 'id', indexes: { candidateId: {}, interviewDate: {} } },
  offer: { keyPath: 'id', indexes: { candidateId: {}, status: {} } },
  attendance_request: { keyPath: 'id', indexes: { employeeId: {}, type: {}, status: {} } },
  attendance_punch: { keyPath: 'id', indexes: { employeeId: {}, workDate: {}, month: {} } },
  attendance_remedy: { keyPath: 'id', indexes: { employeeId: {}, remedyDate: {}, status: {} } },
  attendance_anomaly: { keyPath: 'id', indexes: { employeeId: {}, date: {}, type: {}, handled: {} } },
  shift: { keyPath: 'id', indexes: { name: {} } },
  schedule: { keyPath: 'id', indexes: { employeeId: {}, workDate: {}, shiftId: {}, departmentId: {} } },
  attendance_monthly: { keyPath: 'id', indexes: { employeeId: {}, month: {} } }
}

let dbPromise = null

function uuid() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function now() { return Date.now() }

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      const tx = e.target.transaction
      const oldVersion = e.oldVersion

      if (oldVersion < 2) {
        if (db.objectStoreNames.contains('position')) db.deleteObjectStore('position')
        if (db.objectStoreNames.contains('grade')) db.deleteObjectStore('grade')
        if (db.objectStoreNames.contains('employee')) {
          const empStore = tx.objectStore('employee')
          if (empStore.indexNames.contains('positionId')) empStore.deleteIndex('positionId')
          if (empStore.indexNames.contains('gradeId')) empStore.deleteIndex('gradeId')
        }
      }

      Object.keys(STORES).forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          const cfg = STORES[name]
          const store = db.createObjectStore(name, { keyPath: cfg.keyPath })
          Object.keys(cfg.indexes || {}).forEach((idx) => {
            store.createIndex(idx, idx, { unique: false })
          })
        } else {
          const existing = tx.objectStore(name)
          Object.keys(STORES[name].indexes || {}).forEach((idx) => {
            if (!existing.indexNames.contains(idx)) existing.createIndex(idx, idx, { unique: false })
          })
        }
      })

      if (oldVersion < 2 && db.objectStoreNames.contains('employee')) {
        const empStore2 = tx.objectStore('employee')
        const getAllReq = empStore2.getAll()
        getAllReq.onsuccess = () => {
          const list = getAllReq.result || []
          list.forEach((rec) => {
            if (rec.positionId !== undefined || rec.gradeId !== undefined) {
              delete rec.positionId
              delete rec.gradeId
              empStore2.put(rec)
            }
          })
        }
      }
    }
    req.onsuccess = (e) => {
      const db = e.target.result
      db.onversionchange = () => {
        db.close()
        if (globalThis.alert) globalThis.alert('数据库版本已更新，请刷新页面。')
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function withStore(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode || 'readonly')
    const s = t.objectStore(store)
    let result
    try {
      const ret = fn(s)
      if (ret && typeof ret.then === 'function') {
        ret.then((r) => { result = r }).catch((e) => { t.abort(); reject(e) })
      } else {
        result = ret
      }
    } catch (err) {
      t.abort(); reject(err); return
    }
    t.oncomplete = () => resolve(result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error || new Error('事务中止'))
  }))
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

let changeHandler = null
function fireChange() {
  if (changeHandler) { try { changeHandler() } catch (e) { /* ignore */ } }
}

export const db = {
  open,
  listStores: () => Object.keys(STORES),
  onChange: (fn) => { changeHandler = fn },
  add(store, data) {
    const rec = Object.assign({}, data)
    rec.id = rec.id || uuid()
    rec.createdAt = rec.createdAt || now()
    rec.updatedAt = now()
    if (rec.deleted === undefined) rec.deleted = 0
    return withStore(store, 'readwrite', (s) => reqToPromise(s.add(rec)))
      .then(() => { fireChange(); return rec })
  },
  put(store, data) {
    const rec = Object.assign({}, data)
    rec.updatedAt = now()
    if (!rec.id) rec.id = uuid()
    if (rec.deleted === undefined) rec.deleted = 0
    return withStore(store, 'readwrite', (s) => reqToPromise(s.put(rec)))
      .then(() => { fireChange(); return rec })
  },
  get(store, id) {
    return withStore(store, 'readonly', (s) => reqToPromise(s.get(id)))
  },
  getAll(store, opts = {}) {
    return withStore(store, 'readonly', (s) => reqToPromise(s.getAll()))
      .then((list) => {
        if (opts.includeDeleted) return list
        return (list || []).filter((r) => !r.deleted)
      })
  },
  getAllByIndex(store, indexName, value, opts = {}) {
    return withStore(store, 'readonly', (s) => {
      if (!s.indexNames.contains(indexName)) return reqToPromise(s.getAll())
      return reqToPromise(s.index(indexName).getAll(value))
    }).then((list) => {
      if (opts.includeDeleted) return list
      return (list || []).filter((r) => !r.deleted)
    })
  },
  softDelete(store, id) {
    return db.get(store, id).then((rec) => {
      if (!rec) return null
      rec.deleted = 1
      rec.updatedAt = now()
      return withStore(store, 'readwrite', (s) => reqToPromise(s.put(rec)))
        .then(() => { fireChange(); return rec })
    })
  },
  hardDelete(store, id) {
    return withStore(store, 'readwrite', (s) => reqToPromise(s.delete(id)))
      .then(() => { fireChange() })
  },
  query(store, opts = {}) {
    return db.getAll(store, { includeDeleted: opts.includeDeleted }).then((list) => {
      if (opts.includeDeleted === undefined) list = list.filter((r) => !r.deleted)
      if (opts.filter) list = list.filter(opts.filter)
      if (opts.sort) {
        const key = opts.sort
        const dir = opts.dir === 'asc' ? 1 : -1
        list.sort((a, b) => {
          const av = a[key]; const bv = b[key]
          if (av === bv) return 0
          if (av === undefined || av === null) return 1 * dir
          if (bv === undefined || bv === null) return -1 * dir
          if (typeof av === 'string') return av.localeCompare(bv, 'zh-CN') * dir
          return (av > bv ? 1 : -1) * dir
        })
      }
      const total = list.length
      if (opts.page && opts.pageSize) {
        const start = (opts.page - 1) * opts.pageSize
        list = list.slice(start, start + opts.pageSize)
      }
      return { list, total }
    })
  },
  count(store, filter) {
    return db.getAll(store).then((list) => {
      if (filter) list = list.filter(filter)
      return list.length
    })
  },
  isUnique(store, field, value, excludeId) {
    return db.getAll(store).then((list) => list.some((r) => {
      if (excludeId && r.id === excludeId) return false
      return String(r[field]) === String(value)
    }))
  },
  bulkAdd(store, items) {
    return withStore(store, 'readwrite', (s) => {
      let p = Promise.resolve()
      items.forEach((it) => {
        const rec = Object.assign({}, it)
        rec.id = rec.id || uuid()
        rec.createdAt = rec.createdAt || now()
        rec.updatedAt = now()
        if (rec.deleted === undefined) rec.deleted = 0
        p = p.then(() => reqToPromise(s.put(rec)))
      })
      return p
    }).then(() => { fireChange() })
  },
  clear(store) {
    return withStore(store, 'readwrite', (s) => reqToPromise(s.clear()))
      .then(() => { fireChange() })
  },
  run(mode, stores, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode)
      const ctx = {}
      stores.forEach((s) => { ctx[s] = t.objectStore(s) })
      let out
      try { out = fn(ctx, t) } catch (err) { t.abort(); reject(err); return }
      t.oncomplete = () => resolve(out)
      t.onerror = () => reject(t.error)
      t.onabort = () => reject(t.error || new Error('事务中止'))
    }))
  }
}

export default db
