/* 更新机制测试：mock fetch 模拟远程 GitHub 仓库，验证 check/apply/版本对比/缓存覆盖 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { JSDOM } = require('jsdom');
require(path.join(__dirname, 'node_modules', 'fake-indexeddb', 'auto', 'index.js'));

const html = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:8765/index.html#/settings',
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
  }
});

const window = dom.window;
const document = window.document;

/* ---- mock 远程仓库内容 ---- */
const REMOTE_FILES = {
  'version.json': JSON.stringify({
    version: '2.0.0',
    notes: ['新增招聘管理模块', '修复已知问题'],
    files: ['index.html', 'version.json', 'js/updater.js', 'js/app.js', 'css/style.css']
  }),
  'index.html': '<!DOCTYPE html><html><head><title>v2 mock</title></head><body>NEW-INDEX-V2</body></html>',
  'js/updater.js': '/* v2 updater */',
  'js/app.js': '/* v2 app */',
  'css/style.css': '/* v2 css */'
};

/* ---- mock fetch：拦截远程请求，返回 mock 内容；本地请求走原逻辑 ---- */
const originalFetch = window.fetch;
const RespCtor = global.Response; // Node 18+ 内置 Response
window.fetch = function (url, opts) {
  const u = String(url);
  if (u.indexOf('raw.githubusercontent.com') >= 0) {
    const fname = u.split('/main/')[1] || '';
    if (REMOTE_FILES[fname]) {
      return Promise.resolve(new RespCtor(REMOTE_FILES[fname], { status: 200, headers: { 'Content-Type': 'text/plain' } }));
    }
    return Promise.resolve(new RespCtor('not found', { status: 404 }));
  }
  // 本地 version.json（首次加载时）
  if (u.indexOf('version.json') >= 0 && u.indexOf('raw.githubusercontent') < 0) {
    return Promise.resolve(new RespCtor(JSON.stringify({ version: '1.0.0', notes: ['local'], files: [] }), { status: 200 }));
  }
  return originalFetch.call(window, url, opts);
};

// 加载脚本
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

const HR = window.HR;
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(900);

  console.log('== 1. 版本初始化 ==');
  await HR.updater.initLocalVersion();
  const cur = HR.updater.localVersion();
  check('本地版本初始化为 1.0.0', cur === '1.0.0', 'got ' + cur);

  console.log('== 2. 版本比较 ==');
  check('1.0.0 < 2.0.0', HR.updater.compare('2.0.0', '1.0.0') === 1);
  check('1.0.0 = 1.0.0', HR.updater.compare('1.0.0', '1.0.0') === 0);
  check('1.0.0 > 0.9.9', HR.updater.compare('1.0.0', '0.9.9') === 1);
  check('1.0.0 < 1.0.1', HR.updater.compare('1.0.1', '1.0.0') === 1);

  console.log('== 3. 检查更新（远程 2.0.0 > 本地 1.0.0） ==');
  const info = await HR.updater.check();
  check('检测到更新', info.hasUpdate === true);
  check('最新版本 2.0.0', info.latest === '2.0.0');
  check('当前版本 1.0.0', info.current === '1.0.0');
  check('更新说明 2 条', info.notes.length === 2);
  check('文件清单 5 个', info.files.length === 5);

  console.log('== 4. 执行更新（apply） ==');
  // 先模拟 Cache API（jsdom 无 caches，需注入）
  const mockCaches = {};
  const mockCacheStore = {};
  window.caches = {
    open: name => {
      if (!mockCaches[name]) mockCaches[name] = { put: (req, resp) => {
        const key = String(req.url || req);
        mockCacheStore[name + '::' + key] = resp;
        return Promise.resolve();
      } };
      return Promise.resolve(mockCaches[name]);
    },
    keys: () => Promise.resolve(Object.keys(mockCaches)),
    delete: name => { delete mockCaches[name]; return Promise.resolve(true); },
    match: () => Promise.resolve(undefined)
  };
  const updRes = await HR.updater.apply(info);
  check('apply 返回 cache 模式', updRes.mode === 'cache', JSON.stringify(updRes));
  check('本地版本已更新为 2.0.0', HR.updater.localVersion() === '2.0.0');

  console.log('== 5. 缓存内容验证（远程文件已写入同源 key） ==');
  const cacheNames = Object.keys(mockCaches);
  check('新缓存 hr-workbench-v2.0.0 已创建', cacheNames.some(n => n === 'hr-workbench-v2.0.0'), cacheNames.join(','));
  const keys2 = Object.keys(mockCacheStore).filter(k => k.indexOf('hr-workbench-v2.0.0') >= 0);
  check('缓存条目数 = 5 个文件', keys2.length === 5, keys2.length + ' → ' + keys2.join(' | '));
  const hasIndex = keys2.some(k => k.indexOf('index.html') >= 0);
  check('index.html 已入缓存', hasIndex);

  console.log('== 6. 再次检查（已是最新） ==');
  const info2 = await HR.updater.check();
  check('无更新', info2.hasUpdate === false);

  console.log('== 7. 旧版本缓存清理 ==');
  // 手动塞一个旧缓存名验证清理逻辑
  await window.caches.open('hr-workbench-v0.9.0').then(c => c.put('x', new RespCtor('old')));
  await HR.updater.apply(await HR.updater.check().then(() => ({ files: ['index.html'], latest: '2.0.0' })));
  const cacheNames2 = Object.keys(mockCaches);
  check('旧缓存已清理', !cacheNames2.some(n => n === 'hr-workbench-v0.9.0'), cacheNames2.join(','));

  console.log('== 8. 远程不可达降级 ==');
  const origFetch2 = window.fetch;
  window.fetch = function (url) {
    if (String(url).indexOf('raw.githubusercontent.com') >= 0) {
      return Promise.reject(new TypeError('Failed to fetch'));
    }
    return origFetch2.call(window, url);
  };
  let threw = false;
  try { await HR.updater.check(); } catch (e) { threw = true; }
  check('网络失败时 check 抛出可读错误', threw === true);
  window.fetch = origFetch2;

  console.log('== 9. JS 错误 ==');
  check('全程无 JS 错误', jsErrors.length === 0, jsErrors.join(' | '));

  console.log('\n========== 更新机制测试结果: PASS ' + pass + ' / FAIL ' + fail + ' ==========');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
