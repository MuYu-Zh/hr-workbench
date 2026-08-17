/* 桌面版环境模拟测试：注入 window.desktop（preload 桥），验证设置页数据目录区块/更新按钮/环境提示行为 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { JSDOM } = require('jsdom');
require(path.join(__dirname, 'node_modules', 'fake-indexeddb', 'auto', 'index.js'));

const html = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'file:///D:/ds-harness/hr-workbench/index.html#/settings',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.indexedDB = indexedDB;
    window.IDBKeyRange = IDBKeyRange;
    window.URL.createObjectURL = () => 'blob:mock';
    window.URL.revokeObjectURL = () => {};
    try {
      Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'uuid-' + Math.random().toString(16).slice(2) } });
    } catch (e) {}
    // jsdom 无 localStorage（只读 getter），用 defineProperty 注入内存实现
    const lsStore = {};
    try {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: k => (k in lsStore ? lsStore[k] : null),
          setItem: (k, v) => { lsStore[k] = String(v); },
          removeItem: k => { delete lsStore[k]; },
          clear: () => { for (const k in lsStore) delete lsStore[k]; }
        }
      });
    } catch (e) { /* 若已有则忽略 */ }
    // 模拟 Electron preload 桥
    window.desktop = {
      isElectron: true,
      getDataDir: () => Promise.resolve('C:\\Users\\test\\AppData\\Roaming\\hr-workbench'),
      openDataDir: () => Promise.resolve('C:\\Users\\test\\AppData\\Roaming\\hr-workbench')
    };
    // 注入 fetch（file:// 环境读取本地文件；远程返回失败）
    const fs = require('fs');
    const p = require('path');
    window.fetch = function (url, opts) {
      const u = String(url);
      if (u.indexOf('raw.githubusercontent.com') >= 0) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      }
      // file:// 或相对路径 → 解析为本地文件
      const fname = u.replace(/^file:\/\/\/.*\/([^/]+)$/, '$1').replace(/^.*?\/([^/]+)$/, '$1');
      const fpath = p.join(ROOT, fname);
      try {
        const content = fs.readFileSync(fpath, 'utf8');
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(content)), text: () => Promise.resolve(content) });
      } catch (e) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      }
    };
  }
});

const window = dom.window;
const document = window.document;

const scripts = [
  'js/utils.js', 'js/db.js', 'js/filestore.js', 'js/updater.js', 'js/seed.js', 'js/ui.js', 'js/router.js',
  'js/pages/dashboard.js', 'js/pages/employee.js', 'js/pages/todo.js',
  'js/pages/links.js', 'js/pages/settings.js', 'js/app.js'
];
let jsErrors = [];
window.addEventListener('error', e => jsErrors.push(e.message));
scripts.forEach(s => {
  try { window.eval(require('fs').readFileSync(path.join(ROOT, s), 'utf8')); }
  catch (e) { jsErrors.push('load ' + s + ': ' + e.message); }
});

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(900);

  console.log('== 1. Electron 环境下无 file:// 提示条 ==');
  const hasEnvTip = !!document.querySelector('body > div[style*="bottom:16px"]');
  check('无环境提示条（Electron 不提示）', !hasEnvTip);

  console.log('== 2. 设置页数据目录区块 ==');
  window.location.hash = '#/settings';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  const desktopCard = document.getElementById('set-desktop-dir');
  check('桌面版数据目录卡片存在', !!desktopCard);
  await wait(200);
  const dirPath = document.getElementById('desktop-dir-path');
  check('数据目录路径已读取', !!dirPath && dirPath.textContent.indexOf('AppData') >= 0, dirPath && dirPath.textContent);
  check('打开数据目录按钮', !!document.getElementById('desktop-dir-open'));

  console.log('== 3. 更新模块在 Electron 下可用 ==');
  const updText = document.getElementById('set-updater').textContent;
  check('更新模块显示更新源', updText.indexOf('更新源') >= 0 && updText.indexOf('无法更新') < 0);
  check('检查更新按钮存在', !!document.getElementById('upd-check'));

  console.log('== 4. 版本号 ==');
  await wait(300);
  const updText2 = document.getElementById('set-updater').textContent;
  check('本地版本已初始化（非 0.0.0）', updText2.indexOf('v0.0.0') < 0, updText2.slice(0, 40));

  console.log('== 5. JS 错误 ==');
  check('全程无 JS 错误', jsErrors.length === 0, jsErrors.join(' | '));

  console.log('\n========== 桌面环境测试结果: PASS ' + pass + ' / FAIL ' + fail + ' ==========');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
