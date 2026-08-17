/* 数据层逻辑测试：用 fake-indexeddb 模拟浏览器 IndexedDB，验证 db.js / utils.js / seed.js */
'use strict';

const path = require('path');
const ROOT = path.join(__dirname, '..');

// 1. 挂载 fake-indexeddb 到 global
require(path.join(__dirname, 'node_modules', 'fake-indexeddb', 'auto', 'index.js'));
const { indexedDB, IDBKeyRange } = global;

// 2. 模拟 window 环境，加载 utils.js / db.js / seed.js
global.window = global;
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;

function makeLocalStorage() {
  const store = {};
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
  };
}
global.localStorage = makeLocalStorage();

// 加载脚本
require(path.join(ROOT, 'js', 'utils.js'));
require(path.join(ROOT, 'js', 'db.js'));
require(path.join(ROOT, 'js', 'seed.js'));

const U = HR.utils, db = HR.db, seed = HR.seed;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

async function main() {
  console.log('== 1. 数据库打开与建表 ==');
  await db.open();
  const stores = db.listStores();
  check('一期 12 个 store 创建', stores.length === 12, 'got ' + stores.length);
  ['department','position','grade','employee','employee_attachment','attachment','todo','memo','reminder','quick_link','sys_dict','status_log'].forEach(s => {
    check('store 存在: ' + s, stores.includes(s));
  });

  console.log('== 2. 种子数据 ==');
  await seed.seedIfEmpty();
  const dicts = await db.getAll('sys_dict');
  const depts = await db.getAll('department');
  const positions = await db.getAll('position');
  const grades = await db.getAll('grade');
  const links = await db.getAll('quick_link');
  check('字典种子写入', dicts.length > 10, dicts.length);
  check('部门种子写入', depts.length >= 5, depts.length);
  check('岗位种子写入', positions.length >= 10, positions.length);
  check('职级种子写入', grades.length >= 10, grades.length);
  check('网址种子写入', links.length >= 5, links.length);
  // 幂等
  await seed.seedIfEmpty();
  const dicts2 = await db.getAll('sys_dict');
  check('种子幂等（不重复写入）', dicts2.length === dicts.length, dicts2.length + ' vs ' + dicts.length);

  console.log('== 3. 员工 CRUD ==');
  const emp = await db.add('employee', {
    employeeNo: 'EM2025001', name: '测试员工', gender: 'female',
    birthDate: '1995-03-15', idCard: '110101199503150022', phone: '13800138000',
    hireDate: '2025-01-10', status: 'active', departmentId: depts[1].id,
    emergencyContact: { name: '测试', phone: '13900139000', relation: '父亲' }
  });
  check('员工新增返回 id', !!emp.id);
  check('员工通用字段补齐 (createdAt/deleted)', emp.createdAt > 0 && emp.deleted === 0);

  const got = await db.get('employee', emp.id);
  check('员工读取', got && got.name === '测试员工');

  // 更新
  await db.put('employee', Object.assign({}, got, { name: '测试员工改', phone: '13900138001' }));
  const got2 = await db.get('employee', emp.id);
  check('员工更新', got2.name === '测试员工改' && got2.phone === '13900138001');
  check('updatedAt 更新', got2.updatedAt >= got.updatedAt);

  // 软删除
  await db.softDelete('employee', emp.id);
  const all = await db.getAll('employee');
  check('软删除后默认查询排除', !all.some(e => e.id === emp.id));
  const withDel = await db.getAll('employee', { includeDeleted: true });
  check('includeDeleted 可见软删除行', withDel.some(e => e.id === emp.id && e.deleted === 1));

  console.log('== 4. 唯一性校验（数据模型 v1.2：软删除工号允许复用） ==');
  // 验证：软删除后工号应允许复用 → isUnique 需排除 deleted 行
  const empActive = await db.add('employee', {
    employeeNo: 'EM2025002', name: '另一员工', gender: 'male', hireDate: '2025-02-01', status: 'active'
  });
  const dupActive = await db.isUnique('employee', 'employeeNo', 'EM2025002', undefined);
  check('在职工号占用', dupActive);
  await db.softDelete('employee', empActive.id);
  const dupAfterSoftDel = await db.isUnique('employee', 'employeeNo', 'EM2025002', undefined);
  check('软删除后工号可复用（isUnique=false）', !dupAfterSoftDel, 'got ' + dupAfterSoftDel);
  const isDupExcl = await db.isUnique('employee', 'employeeNo', 'EM2025001', emp.id);
  check('排除自身后不冲突', !isDupExcl);

  console.log('== 5. 查询与分页 ==');
  await db.bulkAdd('todo', [
    { content: '待办A', date: U.today(), priority: 'high', done: false },
    { content: '待办B', date: U.today(), priority: 'medium', done: false },
    { content: '待办C', date: U.today(), priority: 'low', done: true },
    { content: '明天的事', date: '2099-01-01', priority: 'low', done: false }
  ]);
  const q = await db.query('todo', { filter: t => t.date === U.today() && !t.done, sort: 'priority', dir: 'desc', sortMap: { high: 3, medium: 2, low: 1 } });
  check('今日未完成待办 2 条', q.total === 2, q.total);
  check('优先级降序（high 在前，权重排序）', q.list[0].priority === 'high', 'got ' + q.list[0].priority);
  const page = await db.query('todo', { page: 1, pageSize: 2 });
  check('分页 total', page.total === 4, page.total);
  check('分页返回 2 条', page.list.length === 2);

  console.log('== 6. 工具函数 ==');
  check('date 规范化', U.toDateStr('2025-01-15') === '2025-01-15');
  check('daysFromToday 今天=0', U.daysFromToday(U.today()) === 0);
  check('身份证脱敏', U.maskIdCard('110101199503150022') === '110***********0022', 'got ' + U.maskIdCard('110101199503150022'));
  check('手机脱敏', U.maskPhone('13800138000') === '138****8000');
  check('身份证校验', U.validIdCard('110101199503150022') === true && U.validIdCard('123') === false);
  check('手机校验', U.validPhone('13800138000') === true && U.validPhone('12345') === false);
  check('hash 稳定', U.hash('abc') === U.hash('abc') && U.hash('abc') !== U.hash('abd'));

  console.log('== 7. 备份序列化（Blob → base64 → Blob） ==');
  const blob = new Blob(['hello-attachment'], { type: 'text/plain' });
  const att = await db.add('attachment', { fileName: 'test.txt', mimeType: 'text/plain', size: blob.size, blob });
  const attList = await db.getAll('attachment', { includeDeleted: true });
  check('附件存入', attList.length === 1 && attList[0].fileName === 'test.txt');
  check('Blob 类型保持', attList[0].blob instanceof Blob);
  // base64 往返（Node 无 FileReader，用 Buffer）
  const ab = await attList[0].blob.arrayBuffer();
  const b64 = Buffer.from(ab).toString('base64');
  check('Blob→base64 成功', b64.length > 0);
  const bin = Buffer.from(b64, 'base64');
  check('base64 内容一致', bin.toString() === 'hello-attachment');

  console.log('== 8. 系统参数 ==');
  const s = HR.settings.get();
  check('默认参数存在', s.remindDays.birthday === 7 && s.attachment.maxSizeMB === 20);
  HR.settings.set({ remindDays: Object.assign({}, s.remindDays, { birthday: 3 }) });
  check('参数修改生效', HR.settings.get().remindDays.birthday === 3);
  HR.settings.reset();
  check('参数重置', HR.settings.get().remindDays.birthday === 7);

  console.log('\n========== 结果: PASS ' + pass + ' / FAIL ' + fail + ' ==========');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('测试异常:', e); process.exit(2); });
