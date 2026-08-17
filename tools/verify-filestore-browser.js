/* 真实浏览器文件存储流程测试：注入 mock showDirectoryPicker，验证启用→同步→数据落盘→恢复 */
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

  // 注入 mock File System Access API（在页面加载前）
  await page.evaluateOnNewDocument(() => {
    window.__mockDirFiles = {};
    window.__mockDirDirs = {};
    function makeMockDir(name) {
      const files = {};
      const dirs = {};
      const handle = {
        name, kind: 'directory',
        queryPermission: () => Promise.resolve('granted'),
        requestPermission: () => Promise.resolve('granted'),
        getFileHandle: (fname, opts) => {
          if (opts && opts.create && !files[fname]) files[fname] = { content: '', type: '' };
          if (!files[fname]) return Promise.reject(new Error('not found ' + fname));
          return Promise.resolve({
            createWritable: () => Promise.resolve({
              write: d => { files[fname].content = typeof d === 'string' ? d : d; return Promise.resolve(); },
              close: () => Promise.resolve()
            }),
            getFile: () => Promise.resolve(
              files[fname].content instanceof Blob
                ? files[fname].content
                : new Blob([files[fname].content], { type: 'application/json' })
            )
          });
        },
        getDirectoryHandle: (dn, opts) => {
          if (opts && opts.create && !dirs[dn]) dirs[dn] = makeMockDir(dn);
          if (!dirs[dn]) return Promise.reject(new Error('not found ' + dn));
          return Promise.resolve(dirs[dn]);
        },
        _files: files, _dirs: dirs
      };
      return handle;
    }
    window.__mockRoot = makeMockDir('人事数据');
    window.FileSystemHandle = function () {};
    window.showDirectoryPicker = () => Promise.resolve(window.__mockRoot);
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#menu .menu-group, #menu .menu-item', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  const results = [];
  async function step(name, fn) {
    try {
      await fn();
      results.push('✓ ' + name);
    } catch (e) {
      results.push('✗ ' + name + ' → ' + e.message);
    }
  }

  await step('进入设置页', async () => {
    await page.evaluate(() => { location.hash = '#/settings'; });
    await page.waitForFunction(() => document.getElementById('set-filestore') && document.getElementById('set-filestore').children.length > 0, { timeout: 10000 });
  });

  await step('点击启用文件存储', async () => {
    await page.evaluate(() => document.getElementById('fs-on').click());
    await page.waitForFunction(() => document.getElementById('fs-sync'), { timeout: 10000 });
    const st = await page.evaluate(() => document.getElementById('set-filestore').textContent);
    if (st.indexOf('已启用文件存储') < 0) throw new Error('未显示已启用状态: ' + st.slice(0, 60));
  });

  await step('写入数据触发自动同步', async () => {
    await page.evaluate(async () => {
      await HR.db.add('employee', { employeeNo: 'PWA001', name: 'PWA测试员工', status: 'active', gender: 'male', hireDate: '2025-05-01', phone: '13900000001' });
      await HR.db.add('attachment', { fileName: 'a.pdf', mimeType: 'application/pdf', size: 4, blob: new Blob(['abcd'], { type: 'application/pdf' }) });
    });
    await new Promise(r => setTimeout(r, 2500)); // 等待防抖同步
  });

  await step('验证 hr-data.json 已落盘', async () => {
    const has = await page.evaluate(() => {
      return !!(window.__mockRoot._files['hr-data.json'] && window.__mockRoot._files['hr-config.json']);
    });
    if (!has) throw new Error('hr-data.json 未生成');
  });

  await step('验证附件目录与数据内容', async () => {
    const info = await page.evaluate(() => {
      const data = JSON.parse(window.__mockRoot._files['hr-data.json'].content);
      const attDir = window.__mockRoot._dirs['attachments'];
      return {
        empCount: (data.stores.employee || []).length,
        hasPwaEmp: (data.stores.employee || []).some(e => e.employeeNo === 'PWA001'),
        attFiles: attDir ? Object.keys(attDir._files) : []
      };
    });
    if (!info.hasPwaEmp) throw new Error('员工未写入数据文件');
    if (info.attFiles.length < 1) throw new Error('附件文件未写入 attachments/');
    results.push('   数据明细: 员工=' + info.empCount + ' 附件文件=' + info.attFiles.join(','));
  });

  await step('从文件夹恢复（导入覆盖）', async () => {
    await page.evaluate(() => {
      const ext = { app: 'hr_workbench', version: 1, exportedAt: new Date().toISOString(), stores: {
        employee: [{ id: 'x1', employeeNo: 'IMPORTED1', name: '导入员工', status: 'active', gender: 'female', hireDate: '2024-01-01', createdAt: 1, updatedAt: 1, deleted: 0 }],
        todo: [], memo: [], reminder: [], quick_link: [], sys_dict: [], department: [], position: [], grade: [],
        employee_attachment: [], attachment: [], status_log: []
      }};
      window.__mockRoot._files['hr-data.json'] = { content: JSON.stringify(ext), type: 'application/json' };
    });
    await page.evaluate(() => HR.filestore.restoreFromFolder());
    const emp = await page.evaluate(async () => {
      const r = await HR.db.query('employee', {});
      return { total: r.total, no: r.list[0] && r.list[0].employeeNo };
    });
    if (emp.no !== 'IMPORTED1') throw new Error('恢复后工号不符: ' + JSON.stringify(emp));
  });

  console.log('== 真实浏览器文件存储流程 ==');
  results.forEach(r => console.log('  ' + r));
  console.log('页面错误: ' + pageErrors.length + (pageErrors.length ? ' → ' + pageErrors.join(' | ') : ''));

  await page.screenshot({ path: path.join(__dirname, 'shots', 'pwa-filestore.png') });
  await browser.close();
  const ok = results.filter(r => r.startsWith('✓') || r.startsWith('✗')).every(r => r.startsWith('✓')) && pageErrors.length === 0;
  console.log('\n结果: ' + (ok ? 'PASS' : 'FAIL'));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('验证失败:', e); process.exit(1); });
