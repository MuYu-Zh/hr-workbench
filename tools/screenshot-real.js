/* 真实浏览器截图：puppeteer-core 连接系统 Edge，等待应用渲染完成再截图 */
'use strict';
const path = require('path');
const puppeteer = require(path.join(__dirname, 'node_modules', 'puppeteer-core'));

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'http://127.0.0.1:8765/index.html';
const OUT = path.join(__dirname, 'shots');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-crash-reporter', '--window-size=1440,900']
  });

  const consoleErrors = [];
  const pageErrors = [];

  const pages = [
    { name: 'dashboard', hash: '#/dashboard' },
    { name: 'roster', hash: '#/employee/roster' },
    { name: 'resigned', hash: '#/employee/resigned' },
    { name: 'profile', hash: '#/employee/profile' },
    { name: 'attachments', hash: '#/employee/attachments' },
    { name: 'todo-daily', hash: '#/todo/daily' },
    { name: 'todo-memos', hash: '#/todo/memos' },
    { name: 'todo-reminders', hash: '#/todo/reminders' },
    { name: 'links', hash: '#/links' },
    { name: 'settings', hash: '#/settings' }
  ];

  for (const pg of pages) {
    const page = await browser.newPage();
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push('[' + pg.name + '] ' + m.text()); });
    page.on('pageerror', e => pageErrors.push('[' + pg.name + '] ' + e.message));

    await page.goto(BASE + pg.hash, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // 等待应用渲染：侧边栏菜单出现 + 页面标题更新
    try {
      await page.waitForSelector('#menu .menu-group, #menu .menu-item', { timeout: 15000 });
    } catch (e) { /* 继续 */ }
    // 等待内容区非空（异步数据渲染）
    try {
      await page.waitForFunction(() => {
        const c = document.getElementById('content');
        return c && c.children.length > 0 && c.textContent.length > 50;
      }, { timeout: 15000 });
    } catch (e) { /* 继续 */ }
    await new Promise(r => setTimeout(r, 800));

    const shot = path.join(OUT, 'real-' + pg.name + '.png');
    await page.screenshot({ path: shot, fullPage: false });
    const title = await page.title();
    const h1 = await page.evaluate(() => document.getElementById('page-title') ? document.getElementById('page-title').textContent : '');
    const menuCount = await page.evaluate(() => document.querySelectorAll('.menu-group').length);
    console.log(pg.name + ' | title=' + title + ' | page-title=' + h1 + ' | groups=' + menuCount + ' | shot=' + shot);
    await page.close();
  }

  console.log('\n=== 控制台错误 (' + consoleErrors.length + ') ===');
  consoleErrors.slice(0, 20).forEach(e => console.log('  ' + e));
  console.log('=== 页面错误 (' + pageErrors.length + ') ===');
  pageErrors.slice(0, 20).forEach(e => console.log('  ' + e));

  await browser.close();
})().catch(e => { console.error('截图失败:', e); process.exit(1); });
