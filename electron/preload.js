/* ============================================================
 * preload.js — 渲染进程安全桥（contextIsolation 下暴露桌面能力）
 * ============================================================ */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  /** 是否为 Electron 桌面环境 */
  isElectron: true,
  /** 获取应用数据目录 */
  getDataDir: () => ipcRenderer.invoke('app:get-data-dir'),
  /** 打开数据目录（系统资源管理器） */
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir')
});
