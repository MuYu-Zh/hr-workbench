import { db } from './db'

const META_DB_NAME = 'hr_workbench_meta'
const HANDLE_STORE = 'file_store'
const DATA_FILE = 'hr-data.json'

export const fsApi = !!(window.FileSystemHandle && window.showDirectoryPicker)

let dirHandle = null
let syncTimer = null
let metaDbPromise = null

function openMeta() {
  if (metaDbPromise) return metaDbPromise
  metaDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(META_DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      metaDbPromise = null
      reject(req.error)
    }
  })
  return metaDbPromise
}

async function saveHandle(handle) {
  try {
    const dbh = await openMeta()
    await new Promise((resolve, reject) => {
      const tx = dbh.transaction(HANDLE_STORE, 'readwrite')
      tx.objectStore(HANDLE_STORE).put({ id: 'workdir', handle, updatedAt: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    // 句柄持久化失败不影响当前会话使用
  }
}

async function loadHandle() {
  if (!fsApi) return null
  try {
    const dbh = await openMeta()
    return await new Promise((resolve) => {
      if (!dbh.objectStoreNames.contains(HANDLE_STORE)) { resolve(null); return }
      const t = dbh.transaction(HANDLE_STORE, 'readonly')
      const req = t.objectStore(HANDLE_STORE).get('workdir')
      req.onsuccess = () => {
        const h = req.result && req.result.handle
        resolve(h && h.queryPermission ? h : null)
      }
      req.onerror = () => resolve(null)
    })
  } catch (e) {
    return null
  }
}

export async function restore() {
  if (!fsApi) return false
  const handle = await loadHandle()
  if (!handle) return false
  const perm = await handle.queryPermission({ mode: 'readwrite' })
  if (perm !== 'granted') return false
  dirHandle = handle
  return true
}

export async function chooseFolder() {
  if (!fsApi) {
    throw new Error('当前浏览器不支持文件存储模式')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  dirHandle = handle
  await saveHandle(handle)
  return handle.name
}

async function getEnterpriseDir() {
  if (!dirHandle) throw new Error('未选择存储文件夹')
  const enterpriseId = db.currentEnterpriseId || 'default'
  return dirHandle.getDirectoryHandle(enterpriseId, { create: true })
}

export async function exportToFolder() {
  if (!dirHandle) throw new Error('未选择存储文件夹')
  const entDir = await getEnterpriseDir()
  const stores = db.listStores()
  const data = {
    app: 'hr_workbench',
    enterpriseId: db.currentEnterpriseId || 'default',
    version: 1,
    exportedAt: new Date().toISOString(),
    stores: {}
  }
  for (const store of stores) {
    if (store === 'attachment') continue
    data.stores[store] = await db.getAll(store, { includeDeleted: true })
  }
  const fileHandle = await entDir.getFileHandle(DATA_FILE, { create: true })
  const w = await fileHandle.createWritable()
  await w.write(JSON.stringify(data, null, 2))
  await w.close()
  return true
}

export function notifyChange() {
  if (!dirHandle || !fsApi) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    exportToFolder().catch(() => {})
  }, 1500)
}

export default { fsApi, restore, chooseFolder, exportToFolder, notifyChange }
