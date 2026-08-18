import { db } from './db'

const HANDLE_STORE = 'file_store'
const DATA_FILE = 'hr-data.json'
const CONFIG_FILE = 'hr-config.json'

export const fsApi = !!(window.FileSystemHandle && window.showDirectoryPicker)

let dirHandle = null
let syncTimer = null

async function saveHandle(handle) {
  try {
    await db.run('readwrite', [HANDLE_STORE], (stores) => new Promise((resolve) => {
      const req = stores[HANDLE_STORE].put({ id: 'workdir', handle, updatedAt: Date.now() })
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    }))
  } catch (e) { /* ignore */ }
}

async function loadHandle() {
  if (!fsApi) return null
  try {
    const dbh = await db.open()
    return new Promise((resolve) => {
      if (!dbh.objectStoreNames.contains(HANDLE_STORE)) { resolve(null); return }
      const t = dbh.transaction(HANDLE_STORE, 'readonly')
      const req = t.objectStore(HANDLE_STORE).get('workdir')
      req.onsuccess = () => {
        const h = req.result && req.result.handle
        resolve(h && h.queryPermission ? h : null)
      }
      req.onerror = () => resolve(null)
    })
  } catch (e) { return null }
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

export async function exportToFolder() {
  if (!dirHandle) throw new Error('未选择存储文件夹')
  const stores = db.listStores()
  const data = { app: 'hr_workbench', version: 1, exportedAt: new Date().toISOString(), stores: {} }
  for (const store of stores) {
    if (store === 'attachment' || store === HANDLE_STORE) continue
    data.stores[store] = await db.getAll(store, { includeDeleted: true })
  }
  const fileHandle = await dirHandle.getFileHandle(DATA_FILE, { create: true })
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
