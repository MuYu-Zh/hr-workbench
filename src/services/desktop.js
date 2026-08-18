export function isElectron() {
  return !!(window.desktop && window.desktop.isElectron)
}

export function getDataDir() {
  if (window.desktop && window.desktop.getDataDir) return window.desktop.getDataDir()
  return Promise.resolve('')
}

export function openDataDir() {
  if (window.desktop && window.desktop.openDataDir) return window.desktop.openDataDir()
  return Promise.resolve('')
}

export default { isElectron, getDataDir, openDataDir }
