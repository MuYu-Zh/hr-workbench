/* 真实浏览器验证：点击"立即更新"→ 下载远程文件 → 覆盖缓存 → 版本更新 → 刷新 */
'use strict';
const path = require('path');
const puppeteer = require(path.join(__dirname, 'node_modules', 'puppeteer-core'));
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:8765/index.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-crash-reporter', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  // 正常加载，等版本初始化
  await page.goto(BASE + '#/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#menu .menu-group, #menu .menu-item', { timeout: 15000 });
  await page.waitForFunction(() => { try { return localStorage.getItem('hr.app.version') === '1.0.0'; } catch (e) { return false; } }, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 400));

  // 注入远程拦截：version.json → 2.0.0，文件 → mock 内容（带 CORS）
  const CORS = { 'Access-Control-Allow-Origin': '*' };
  const remoteContents = {
    'version.json': { version: '2.0.0', notes: ['测试更新'], files: ['version.json', 'js/updater.js'] },
    'js/updater.js': '/* UPDATED-V2-CONTENT */'
  };
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (u.indexOf('raw.githubusercontent.com') >= 0) {
      const fname = u.split('/main/')[1] || '';
      if (remoteContents[fname]) {
        req.respond({
          status: 200,
          contentType: fname === 'version.json' ? 'application/json' : 'text/plain',
          headers: CORS,
          body: typeof remoteContents[fname] === 'string' ? remoteContents[fname] : JSON.stringify(remoteContents[fname])
        });
      } else {
        req.respond({ status: 404, headers: CORS, body: 'nf' });
      }
    } else {
      req.continue();
    }
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu .menu-group, #menu .menu-item', { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('set-updater') && !!document.getElementById('upd-check'), { timeout: 15000 });

  console.log('== 检查更新并点击立即更新 ==');
  await page.evaluate(() => document.getElementById('upd-check').click());
  await page.waitForFunction(() => document.getElementById('upd-result') && document.getElementById('upd-result').textContent.indexOf('发现新版本') >= 0, { timeout: 10000 });
  // 点击"立即更新"→ 弹出确认框 → 再点击确认框的"确定"
  await page.evaluate(() => document.getElementById('upd-apply').click());
  await page.waitForFunction(() => {
    const btns = Array.from(document.querySelectorAll('.modal-foot .btn-deep'));
    return btns.length > 0 && btns[0].textContent.indexOf('确定') >= 0;
  }, { timeout: 8000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 300));
  // 点击确认框中的"确定"按钮
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.modal-foot .btn-deep'));
    const ok = btns.find(b => b.textContent.indexOf('确定') >= 0);
    if (ok) ok.click();
  });
  await new Promise(r => setTimeout(r, 4000)); // 等待下载 + 刷新

  console.log('== 更新后状态 ==');
  const state = await page.evaluate(async () => {
    const out = {};
    out.localVersion = localStorage.getItem('hr.app.version');
    out.currentUrl = location.href;
    if ('caches' in window) {
      const keys = await caches.keys();
      out.cacheKeys = keys;
      // 检查 updater.js 是否为新内容
      for (const k of keys) {
        const cache = await caches.open(k);
        const resp = await cache.match('./js/updater.js');
        if (resp) {
          out.cachedUpdaterContent = await resp.text();
          break;
        }
      }
    }
    return out;
  });
  console.log('  本地版本: ' + state.localVersion);
  console.log('  缓存名: ' + JSON.stringify(state.cacheKeys));
  console.log('  缓存中 updater.js 内容: ' + (state.cachedUpdaterContent || '(未找到)'));
  console.log('  URL: ' + state.currentUrl);

  console.log('页面错误: ' + pageErrors.length + (pageErrors.length ? ' → ' + pageErrors.join(' | ') : ''));
  await browser.close();

  const ok = state.localVersion === '2.0.0' &&
    (state.cachedUpdaterContent || '').indexOf('UPDATED-V2-CONTENT') >= 0 &&
    pageErrors.length === 0;
  console.log('\n自动更新执行验证: ' + (ok ? 'PASS' : 'FAIL'));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('验证失败:', e); process.exit(1); });
