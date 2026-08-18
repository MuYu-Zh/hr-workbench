const VERSION_KEY = 'hr.app.version'
const CACHE_PREFIX = 'hr-workbench-v'
const repo = 'MuYu-Zh/hr-workbench'
const branch = 'main'
const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}`

export function localVersion() {
  try { return localStorage.getItem(VERSION_KEY) || '0.0.0' } catch (e) { return '0.0.0' }
}

function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((x) => parseInt(x, 10) || 0)
  const pb = String(b || '0').split('.').map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0
    const vb = pb[i] || 0
    if (va > vb) return 1
    if (va < vb) return -1
  }
  return 0
}

export async function initLocalVersion() {
  try {
    const r = await fetch('version.json', { cache: 'no-store' })
    const v = await r.json()
    if (v && v.version && (!localVersion() || localVersion() === '0.0.0')) {
      localStorage.setItem(VERSION_KEY, v.version)
    }
    return v ? v.version : localVersion()
  } catch (e) { return localVersion() }
}

export async function check() {
  const cur = localVersion()
  const r = await fetch(`${rawBase}/version.json`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`无法获取远程版本信息（HTTP ${r.status}）`)
  const remote = await r.json()
  const hasUpdate = compareVersions(remote.version, cur) > 0
  return { hasUpdate, current: cur, latest: remote.version, notes: remote.notes || [] }
}

export default { localVersion, initLocalVersion, check }
