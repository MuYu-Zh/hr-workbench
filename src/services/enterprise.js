import { db } from './db'

const ENTERPRISES_KEY = 'hr.enterprises'
const CURRENT_KEY = 'hr.currentEnterpriseId'
const DEFAULT_ID = 'default'
const DEFAULT_NAME = '默认企业'

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // ignore quota / serialization errors
  }
}

export function ensureDefaultEnterprise() {
  const list = readLS(ENTERPRISES_KEY, [])
  if (!list.some((e) => e.id === DEFAULT_ID)) {
    list.unshift({
      id: DEFAULT_ID,
      name: DEFAULT_NAME,
      createdAt: Date.now(),
      archived: 0,
      lastUsedAt: Date.now()
    })
    writeLS(ENTERPRISES_KEY, list)
  }
  return list
}

export function getAllEnterprises() {
  return ensureDefaultEnterprise()
}

export function getEnterprises() {
  return getAllEnterprises().filter((e) => !e.archived)
}

export function getArchivedEnterprises() {
  return getAllEnterprises().filter((e) => e.archived)
}

export function getCurrentEnterpriseId() {
  const id = readLS(CURRENT_KEY, DEFAULT_ID)
  const list = getAllEnterprises()
  const exists = list.find((e) => e.id === id && !e.archived)
  return exists ? id : (getEnterprises()[0]?.id || DEFAULT_ID)
}

export function getCurrentEnterprise() {
  const id = getCurrentEnterpriseId()
  const list = getAllEnterprises()
  return list.find((e) => e.id === id) || { id: DEFAULT_ID, name: DEFAULT_NAME, archived: 0 }
}

export function createEnterprise(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('企业名称不能为空')
  const list = getAllEnterprises()
  if (list.some((e) => e.name === trimmed)) throw new Error('企业名称已存在')
  const id = `ent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  list.push({
    id,
    name: trimmed,
    createdAt: Date.now(),
    archived: 0,
    lastUsedAt: 0
  })
  writeLS(ENTERPRISES_KEY, list)
  return list.find((e) => e.id === id)
}

export function renameEnterprise(id, name) {
  const trimmed = (name || '').trim()
  if (!trimmed) throw new Error('企业名称不能为空')
  const list = getAllEnterprises()
  if (list.some((e) => e.id !== id && e.name === trimmed)) throw new Error('企业名称已存在')
  const target = list.find((e) => e.id === id)
  if (!target) throw new Error('企业不存在')
  target.name = trimmed
  writeLS(ENTERPRISES_KEY, list)
  return target
}

export function archiveEnterprise(id) {
  if (id === getCurrentEnterpriseId()) throw new Error('当前企业不可归档，请先切换到其他企业')
  const list = getAllEnterprises()
  const target = list.find((e) => e.id === id)
  if (!target) throw new Error('企业不存在')
  target.archived = 1
  writeLS(ENTERPRISES_KEY, list)
  return target
}

export function restoreEnterprise(id) {
  const list = getAllEnterprises()
  const target = list.find((e) => e.id === id)
  if (!target) throw new Error('企业不存在')
  target.archived = 0
  writeLS(ENTERPRISES_KEY, list)
  return target
}

export async function switchEnterprise(id) {
  const list = getAllEnterprises()
  const target = list.find((e) => e.id === id)
  if (!target) throw new Error('企业不存在')
  if (target.archived) throw new Error('已归档企业不能切换，请先恢复')
  await db.switchEnterprise(id)
  writeLS(CURRENT_KEY, id)
  return target
}

export default {
  ensureDefaultEnterprise,
  getAllEnterprises,
  getEnterprises,
  getArchivedEnterprises,
  getCurrentEnterpriseId,
  getCurrentEnterprise,
  createEnterprise,
  renameEnterprise,
  archiveEnterprise,
  restoreEnterprise,
  switchEnterprise
}
