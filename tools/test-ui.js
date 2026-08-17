/* UI 渲染测试：jsdom 加载完整应用，验证菜单/路由/各页面渲染，捕获 JS 错误 */
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
      Object.defineProperty(window, 'crypto', {
        configurable: true,
        value: window.crypto || { randomUUID: () => 'test-uuid-' + Math.random().toString(16).slice(2) }
      });
    } catch (e) { /* jsdom 已有 crypto */ }
    // 注入 fetch：本地文件请求用 fs 读取；远程 GitHub 请求返回失败（避免测试访问真实网络）
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

// 按 index.html 顺序加载所有脚本
const scripts = [
  'js/utils.js', 'js/db.js', 'js/filestore.js', 'js/updater.js', 'js/seed.js', 'js/ui.js', 'js/router.js',
  'js/pages/dashboard.js', 'js/pages/employee.js', 'js/pages/todo.js',
  'js/pages/links.js', 'js/pages/settings.js', 'js/app.js'
];

let jsErrors = [];
window.addEventListener('error', e => jsErrors.push('window.onerror: ' + e.message));
window.onunhandledrejection = e => jsErrors.push('unhandledrejection: ' + (e.reason && e.reason.message || e.reason));

scripts.forEach(s => {
  try {
    const code = require('fs').readFileSync(path.join(ROOT, s), 'utf8');
    window.eval(code);
  } catch (e) {
    jsErrors.push('加载 ' + s + ' 出错: ' + e.message);
  }
});

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('== 1. 应用启动与菜单渲染 ==');
  await wait(800);
  const menu = document.getElementById('menu');
  check('菜单已渲染', !!menu && menu.children.length > 0, 'children=' + (menu ? menu.children.length : 0));
  const groups = menu.querySelectorAll('.menu-group').length;
  const items = menu.querySelectorAll('.menu-item').length;
  check('一级分组数量 (11 个分组)', groups >= 11, 'got ' + groups);
  // 默认折叠：仅当前激活页(dashboard page) + 底部系统设置 两个 .menu-item
  check('折叠态菜单项正确（当前页+系统设置）', items === 2, 'got ' + items);
  const foot = document.getElementById('sidebar-foot');
  check('底部系统设置', !!foot && foot.querySelector('.menu-item'));
  check('顶部标题', document.getElementById('page-title').textContent === '工作总览');
  check('无 JS 错误', jsErrors.length === 0, jsErrors.join(' | '));

  console.log('== 2. 仪表盘渲染 ==');
  await wait(600);
  const statActive = document.getElementById('stat-active');
  check('在职人数卡渲染', !!statActive && statActive.textContent !== '—');
  const trend = document.getElementById('trend-card');
  check('趋势卡渲染', !!trend && trend.querySelectorAll('.bar-col').length === 6, 'bars=' + (trend ? trend.querySelectorAll('.bar-col').length : 0));
  const remind = document.getElementById('remind-card');
  check('提醒卡渲染', !!remind);
  const todoCard = document.getElementById('todo-card');
  check('今日待办卡渲染', !!todoCard);

  console.log('== 3. 路由跳转：花名册 ==');
  window.location.hash = '#/employee/roster';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(500);
  check('页面标题更新', document.getElementById('page-title').textContent === '在职员工花名册');
  const tbl = document.querySelector('#roster-table table.tbl');
  check('花名册表格渲染', !!tbl);
  check('花名册搜索框', !!document.getElementById('roster-kw'));
  check('新增按钮', !!document.getElementById('roster-add'));
  check('无 JS 错误', jsErrors.length === 0, jsErrors.join(' | '));

  console.log('== 4. 路由跳转：离职档案 ==');
  window.location.hash = '#/employee/resigned';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('离职档案表格', !!document.querySelector('#resigned-table table.tbl') || !!document.querySelector('#resigned-table .empty-tip'));

  console.log('== 5. 路由跳转：基本信息维护 ==');
  window.location.hash = '#/employee/profile';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('维护页渲染', !!document.getElementById('profile-list'));
  check('新增员工按钮', !!document.getElementById('profile-add'));

  console.log('== 6. 路由跳转：证件归档 ==');
  window.location.hash = '#/employee/attachments';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('归档页渲染', !!document.getElementById('attach-emp') && !!document.getElementById('attach-list'));

  console.log('== 7. 路由跳转：待办/备忘/提醒 ==');
  window.location.hash = '#/todo/daily';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('待办页渲染', !!document.getElementById('todo-add'));
  window.location.hash = '#/todo/memos';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('备忘页渲染', !!document.getElementById('memo-add'));
  window.location.hash = '#/todo/reminders';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('提醒页渲染', !!document.getElementById('remind-add'));

  console.log('== 8. 路由跳转：常用网址 / 系统设置 ==');
  window.location.hash = '#/links';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('网址页渲染', !!document.getElementById('link-add'));
  window.location.hash = '#/settings';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(400);
  check('设置页渲染', !!document.getElementById('set-profile') && !!document.getElementById('set-params'));
  check('参数表单字段', !!document.querySelector('#set-params input[data-field="birthday"]'));

  console.log('== 9. 二期占位页 ==');
  window.location.hash = '#/recruit/req';
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(300);
  check('二期占位渲染', document.body.textContent.indexOf('二期') >= 0 || document.getElementById('page-title').textContent === '招聘需求登记');

  console.log('== 10. UI 组件：弹窗 / toast ==');
  const HR = window.HR;
  HR.ui.toastOk('测试提示');
  await wait(100);
  check('toast 渲染', document.querySelectorAll('#toast-root .toast').length > 0);
  const m = HR.ui.modal({ title: '测试弹窗', size: 'sm', body: '<div>内容</div>' });
  check('modal 渲染', !!document.querySelector('.modal-mask .modal'));
  m.close();
  await wait(100);
  check('modal 关闭', !document.querySelector('.modal-mask .modal'));

  console.log('== 11. 表单构建 ==');
  const form = HR.ui.form([
    { key: 'name', label: '姓名', type: 'text', required: true },
    { key: 'gender', label: '性别', type: 'select', options: [{ value: 'male', label: '男' }] }
  ]);
  check('表单字段', form.fields.name && form.fields.gender);
  const errs = form.validate();
  check('必填校验生效', errs.length === 1, errs.join(','));

  console.log('\n========== UI 测试结果: PASS ' + pass + ' / FAIL ' + fail + ' ==========');
  if (jsErrors.length) console.log('JS 错误列表:\n' + jsErrors.join('\n'));
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
