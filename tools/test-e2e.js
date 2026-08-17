/* 端到端交互测试：模拟真实用户操作（新增员工、新增待办、勾选完成、新增网址、离职流程） */
'use strict';

const path = require('path');
const ROOT = path.join(__dirname, '..');
const { JSDOM } = require('jsdom');
require(path.join(__dirname, 'node_modules', 'fake-indexeddb', 'auto', 'index.js'));

const html = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:8765/index.html#/dashboard',
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
    // 注入 fetch：本地文件请求用 fs 读取；远程 GitHub 请求返回失败
    const fs = require('fs');
    const p = require('path');
    const ROOT = p.join(__dirname, '..');
    window.fetch = function (url, opts) {
      const u = String(url);
      if (u.indexOf('raw.githubusercontent.com') >= 0) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
      }
      const fname = u.replace(/^.*?\/([^/]+)$/, '$1');
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

let jsErrors = [];
window.addEventListener('error', e => jsErrors.push(e.message));
window.onunhandledrejection = e => jsErrors.push('rejection: ' + (e.reason && e.reason.message || e.reason));

const scripts = [
  'js/utils.js', 'js/db.js', 'js/filestore.js', 'js/updater.js', 'js/seed.js', 'js/ui.js', 'js/router.js',
  'js/pages/dashboard.js', 'js/pages/employee.js', 'js/pages/todo.js',
  'js/pages/links.js', 'js/pages/settings.js', 'js/app.js'
];
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
function setValue(sel, val) {
  const el = document.querySelector(sel);
  if (!el) return false;
  el.value = val;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
  return true;
}
function click(sel) {
  const el = document.querySelector(sel);
  if (!el) return false;
  el.click();
  return true;
}

(async () => {
  await wait(900);

  console.log('== 1. 新增员工（花名册表单） ==');
  window.location.hash = '#/employee/roster';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(500);
  click('#roster-add');
  await wait(300);
  check('新增员工弹窗打开', !!document.querySelector('.modal [data-field="name"]'));
  setValue('[data-field="name"]', '端到端测试员');
  setValue('[data-field="employeeNo"]', 'EM-E2E-001');
  setValue('[data-field="phone"]', '13912345678');
  setValue('[data-field="gender"]', 'female');
  setValue('[data-field="hireDate"]', '2025-03-01');
  click('.modal-foot .btn-deep');
  await wait(600);
  check('保存后 toast 出现', document.querySelector('#toast-root .toast') !== null);
  check('无 JS 错误', jsErrors.length === 0, jsErrors.join(' | '));

  // 通过 DB 直接验证持久化
  const emps = await HR.db.query('employee', { filter: e => e.employeeNo === 'EM-E2E-001' });
  check('员工已写入 IndexedDB', emps.total === 1, 'got ' + emps.total);
  check('员工姓名正确', emps.list[0].name === '端到端测试员');

  console.log('== 2. 工号唯一性拦截 ==');
  click('#roster-add');
  await wait(300);
  setValue('[data-field="name"]', '重复工号员');
  setValue('[data-field="employeeNo"]', 'EM-E2E-001');
  setValue('[data-field="phone"]', '13912345679');
  setValue('[data-field="gender"]', 'male');
  setValue('[data-field="hireDate"]', '2025-03-02');
  click('.modal-foot .btn-deep');
  await wait(600);
  const bodyText = document.body.textContent;
  check('重复工号被拦截（toast 提示已存在）', bodyText.indexOf('已存在') >= 0, '');
  // 关闭弹窗
  document.querySelector('.modal .m-close').click();
  await wait(200);

  console.log('== 3. 新增待办并勾选完成 ==');
  window.location.hash = '#/todo/daily';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(500);
  click('#todo-add');
  await wait(300);
  setValue('[data-field="content"]', '端到端待办事项');
  setValue('[data-field="priority"]', 'high');
  click('.modal-foot .btn-deep');
  await wait(600);
  const todos = await HR.db.query('todo', { filter: t => t.content === '端到端待办事项' });
  check('待办已写入', todos.total === 1);
  // 勾选完成
  const checkBtn = document.querySelector('.todo-item .todo-check');
  check('待办列表渲染', !!checkBtn);
  checkBtn.click();
  await wait(500);
  const todoDone = await HR.db.get('todo', todos.list[0].id);
  check('勾选后 done=true', todoDone.done === true);

  console.log('== 4. 新增常用网址 ==');
  window.location.hash = '#/links';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(500);
  click('#link-add');
  await wait(300);
  setValue('[data-field="name"]', '测试网址');
  setValue('[data-field="url"]', 'https://example.com');
  setValue('[data-field="category"]', 'other');
  click('.modal-foot .btn-deep');
  await wait(600);
  const links = await HR.db.query('quick_link', { filter: l => l.name === '测试网址' });
  check('网址已写入', links.total === 1);
  check('网址卡片渲染', document.querySelectorAll('.link-card').length >= 1);

  console.log('== 5. 新增备忘录 ==');
  window.location.hash = '#/todo/memos';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(500);
  click('#memo-add');
  await wait(300);
  setValue('[data-field="title"]', '测试备忘录');
  setValue('[data-field="content"]', '这是一条测试备忘录内容');
  click('.modal-foot .btn-deep');
  await wait(600);
  const memos = await HR.db.query('memo', { filter: m => m.title === '测试备忘录' });
  check('备忘录已写入', memos.total === 1);

  console.log('== 6. 员工离职流程 ==');
  window.location.hash = '#/employee/roster';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(500);
  // 找到刚创建的员工行的"离职"按钮
  const rows = document.querySelectorAll('#roster-table tbody tr');
  let resigned = false;
  for (const row of rows) {
    if (row.textContent.indexOf('EM-E2E-001') >= 0) {
      const links = row.querySelectorAll('.act-link');
      for (const l of links) {
        if (l.textContent === '离职') { l.click(); resigned = true; break; }
      }
      break;
    }
  }
  check('离职按钮点击', resigned);
  await wait(400);
  check('离职弹窗出现', !!document.querySelector('[data-field="resignDate"]'));
  click('.modal-foot .btn-deep');
  await wait(600);
  const empAfter = (await HR.db.query('employee', { filter: e => e.employeeNo === 'EM-E2E-001' })).list[0];
  check('员工状态变为 resigning', empAfter.status === 'resigning', empAfter.status);
  check('resignInfo 已写入', !!empAfter.resignInfo && empAfter.resignInfo.handoverDone === false);

  console.log('== 7. 离职档案页与交接完成 ==');
  window.location.hash = '#/employee/resigned';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(500);
  const resRows = document.querySelectorAll('#resigned-table tbody tr');
  check('离职档案列表含该员工', document.body.textContent.indexOf('EM-E2E-001') >= 0, 'rows=' + resRows.length);
  for (const row of resRows) {
    if (row.textContent.indexOf('EM-E2E-001') >= 0) {
      const links = row.querySelectorAll('.act-link');
      for (const l of links) {
        if (l.textContent === '完成交接') { l.click(); break; }
      }
      break;
    }
  }
  await wait(400);
  click('.modal-foot .btn-deep, .confirm-box + .modal-foot .btn-deep');
  await wait(600);
  const empFinal = (await HR.db.query('employee', { filter: e => e.employeeNo === 'EM-E2E-001' })).list[0];
  check('交接后状态转为 resigned', empFinal.status === 'resigned', empFinal.status);
  check('handoverDone=true', empFinal.resignInfo && empFinal.resignInfo.handoverDone === true);

  console.log('== 8. 数据持久化（重开模拟：重新读取 DB） ==');
  // 模拟刷新：同一 fake-indexeddb 内重新加载（数据已在 DB 中）
  const allEmps = await HR.db.query('employee', {});
  check('员工数据仍在 DB', allEmps.total >= 1, 'total=' + allEmps.total);
  const allTodos = await HR.db.query('todo', {});
  check('待办数据仍在 DB', allTodos.total >= 1);

  console.log('== 9. 最终 JS 错误检查 ==');
  check('全程无 JS 错误', jsErrors.length === 0, jsErrors.join(' | '));

  console.log('\n========== 端到端测试结果: PASS ' + pass + ' / FAIL ' + fail + ' ==========');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
