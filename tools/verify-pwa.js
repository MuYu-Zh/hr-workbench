/* PWA 验证：manifest / Service Worker / 设置页文件存储模块 / 控制台干净 */
'use strict';
const path = require('path');
const puppeteer = require(path.join(__dirname, 'node_modules', 'puppeteer-core'));

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:8765/index.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-crash-reporter', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#menu .menu-group, #menu .menu-item', { timeout: 15000 });
  await page.waitForFunction(() => {
    const c = document.getElementById('content');
    return c && c.children.length > 0 && c.textContent.length > 50;
  }, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 800));

  console.log('== 1. PWA manifest ==');
  const manifest = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel="manifest"]'));
    return links.map(l => l.href);
  });
  console.log('  manifest link: ' + manifest.join(', '));
  const manifestResp = await page.evaluate(async () => {
    const r = await fetch('manifest.webmanifest');
    const j = await r.json();
    return { name: j.name, display: j.display, icons: (j.icons || []).length, start_url: j.start_url };
  });
  console.log('  manifest 内容: ' + JSON.stringify(manifestResp));

  console.log('== 2. Service Worker ==');
  await new Promise(r => setTimeout(r, 1500));
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return { supported: false };
    const regs = await navigator.serviceWorker.getRegistrations();
    return { supported: true, registrations: regs.length, scope: regs[0] ? regs[0].scope : null };
  });
  console.log('  SW: ' + JSON.stringify(swState));

  console.log('== 3. 图标可访问 ==');
  const icons = await page.evaluate(async () => {
    const r = await fetch('icons/icon-192.png');
    return { status: r.status, type: r.headers.get('content-type'), size: (await r.blob()).size };
  });
  console.log('  icon-192: ' + JSON.stringify(icons));

  console.log('== 4. 设置页文件存储模块 ==');
  await page.evaluate(() => { location.hash = '#/settings'; });
  await page.waitForFunction(() => document.getElementById('set-filestore') && document.getElementById('set-filestore').children.length > 0, { timeout: 10000 });
  const fsText = await page.evaluate(() => document.getElementById('set-filestore').textContent);
  console.log('  文件存储模块文本: ' + fsText.slice(0, 80) + '...');
  const hasPickBtn = await page.evaluate(() => !!document.getElementById('fs-on'));
  console.log('  启用按钮存在(浏览器支持时): ' + hasPickBtn);

  console.log('== 5. 控制台/页面错误 ==');
  console.log('  console errors: ' + consoleErrors.length + (consoleErrors.length ? ' → ' + consoleErrors.join(' | ') : ''));
  console.log('  page errors: ' + pageErrors.length + (pageErrors.length ? ' → ' + pageErrors.join(' | ') : ''));

  // 截图设置页
  await page.screenshot({ path: path.join(__dirname, 'shots', 'pwa-settings.png') });

  await browser.close();
  const ok = consoleErrors.length === 0 && pageErrors.length === 0 && swState.registrations >= 1;
  console.log('\nPWA 验证: ' + (ok ? 'PASS' : 'FAIL'));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('验证失败:', e); process.exit(1); });
