/* 真实浏览器验证：设置页更新模块渲染 + 检查更新按钮交互（远程 mock 为无更新） */
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
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  // 先正常加载页面（不做拦截），等版本初始化完成
  await page.goto(BASE + '#/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#menu .menu-group, #menu .menu-item', { timeout: 15000 });
  await page.waitForFunction(() => {
    try { return localStorage.getItem('hr.app.version') === '1.0.0'; } catch (e) { return false; }
  }, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 500));

  // 现在注入远程拦截（模拟远程有新版本 2.0.0）
  const CORS = { 'Access-Control-Allow-Origin': '*' };
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (u.indexOf('raw.githubusercontent.com') >= 0 && u.indexOf('version.json') >= 0) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify({
          version: '2.0.0',
          notes: ['测试更新说明：新增演示功能', '修复已知问题'],
          files: ['index.html', 'version.json']
        })
      });
    } else if (u.indexOf('raw.githubusercontent.com') >= 0) {
      req.respond({ status: 200, contentType: 'text/plain', headers: CORS, body: '/* mock file */' });
    } else {
      req.continue();
    }
  });

  // 刷新页面让设置页显示正确版本，然后验证
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#menu .menu-group, #menu .menu-item', { timeout: 15000 });
  await page.waitForFunction(() => document.getElementById('set-updater') && document.getElementById('set-updater').children.length > 0, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 500));

  console.log('== 设置页更新模块 ==');
  const updText = await page.evaluate(() => document.getElementById('set-updater').textContent);
  console.log('  模块文本: ' + updText.slice(0, 80) + '...');
  const hasCheckBtn = await page.evaluate(() => !!document.getElementById('upd-check'));
  console.log('  检查更新按钮: ' + hasCheckBtn);

  console.log('== 点击检查更新（mock 远程 2.0.0 > 本地 1.0.0） ==');
  await page.evaluate(() => document.getElementById('upd-check').click());
  await page.waitForFunction(() => document.getElementById('upd-result') && document.getElementById('upd-result').textContent.indexOf('发现新版本') >= 0, { timeout: 10000 });
  const result = await page.evaluate(() => document.getElementById('upd-result').textContent);
  console.log('  结果: ' + result.replace(/\s+/g, ' ').slice(0, 80));

  console.log('== 更新说明渲染 ==');
  const hasNotes = await page.evaluate(() => document.getElementById('upd-result').textContent.indexOf('测试更新说明') >= 0);
  console.log('  更新说明展示: ' + hasNotes);
  const hasApplyBtn = await page.evaluate(() => !!document.getElementById('upd-apply'));
  console.log('  立即更新按钮: ' + hasApplyBtn);

  console.log('== 控制台/页面错误 ==');
  console.log('  page errors: ' + pageErrors.length + (pageErrors.length ? ' → ' + pageErrors.join(' | ') : ''));

  await page.screenshot({ path: path.join(__dirname, 'shots', 'updater-settings.png') });
  await browser.close();
  const ok = hasCheckBtn && result.indexOf('发现新版本') >= 0 && hasNotes && hasApplyBtn && pageErrors.length === 0;
  console.log('\n更新模块验证: ' + (ok ? 'PASS' : 'FAIL'));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('验证失败:', e); process.exit(1); });
