/* ============================================================
 * main.js — Electron 主进程（桌面安装包壳）
 *  - 加载应用 index.html（file:// 环境，IndexedDB/localStorage 可用）
 *  - 桌面场景下 PWA Service Worker / File System Access 不可用，
 *    由渲染进程自动降级（见 app.js / filestore.js 的环境检测）
 * ============================================================ */
'use strict';

const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 是否打包后运行
const isPacked = app.isPackaged;
const APP_ROOT = isPacked ? path.join(process.resourcesPath, 'app') : __dirname;
const DIST_ROOT = path.join(APP_ROOT, 'dist');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '人事工作台',
    backgroundColor: '#13201c',
    icon: path.join(DIST_ROOT, 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 打开外部链接用系统浏览器（避免在应用内跳转）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // 加载 Vite 构建后的 index.html
  mainWindow.loadFile(path.join(DIST_ROOT, 'index.html'));

  mainWindow.on('closed', () => { mainWindow = null; });
}

/* ---------- 数据目录（供渲染进程显示/打开） ---------- */
ipcMain.handle('app:get-data-dir', () => {
  return app.getPath('userData');
});

ipcMain.handle('app:open-data-dir', () => {
  const dir = app.getPath('userData');
  shell.openPath(dir);
  return dir;
});

/* ---------- 应用生命周期 ---------- */
app.whenReady().then(() => {
  // 精简默认菜单（保留编辑/复制等基础项）
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '关于人事工作台' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    }] : []),
    { label: '编辑', submenu: [{ role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' }, { type: 'separator' }, { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' }] },
    { label: '视图', submenu: [{ role: 'reload', label: '刷新' }, { role: 'togglefullscreen', label: '全屏' }, { role: 'toggleDevTools', label: '开发者工具' }] },
    { label: '窗口', submenu: [{ role: 'minimize', label: '最小化' }, { role: 'close', label: '关闭' }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
