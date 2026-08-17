/* 文件存储模式专项测试：mock File System Access API，验证导出/导入/自动同步 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(__dirname, 'node_modules', 'fake-indexeddb', 'auto', 'index.js'));
const { indexedDB, IDBKeyRange } = global;

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

// ---- 在加载 filestore 前注入 mock File System Access API ----
function makeMockDir(name) {
  const files = {};   // name -> {content: string|Blob}
  const dirs = {};    // name -> dirHandle
  const handle = {
    name,
    kind: 'directory',
    queryPermission: () => Promise.resolve('granted'),
    requestPermission: () => Promise.resolve('granted'),
    getFileHandle: (fname, opts) => {
      if (opts && opts.create && !files[fname]) files[fname] = { content: '', type: '' };
      if (!files[fname]) return Promise.reject(new Error('file not found: ' + fname));
      return Promise.resolve({
        createWritable: () => Promise.resolve({
          write: (data) => {
            if (typeof data === 'string') files[fname].content = data;
            else if (data instanceof Blob) files[fname].content = data;
            return Promise.resolve();
          },
          close: () => Promise.resolve()
        }),
        getFile: () => Promise.resolve(
          files[fname].content instanceof Blob
            ? files[fname].content
            : new Blob([files[fname].content], { type: files[fname].type || 'application/json' })
        )
      });
    },
    getDirectoryHandle: (dname, opts) => {
      if (opts && opts.create && !dirs[dname]) dirs[dname] = makeMockDir(dname);
      if (!dirs[dname]) return Promise.reject(new Error('dir not found: ' + dname));
      return Promise.resolve(dirs[dname]);
    },
    _files: files,
    _dirs: dirs
  };
  return handle;
}

const mockRoot = makeMockDir('人事工作台数据');
global.FileSystemHandle = function () {};
global.showDirectoryPicker = () => Promise.resolve(mockRoot);

// 加载脚本
require(path.join(ROOT, 'js', 'utils.js'));
require(path.join(ROOT, 'js', 'db.js'));
require(path.join(ROOT, 'js', 'filestore.js'));
require(path.join(ROOT, 'js', 'seed.js'));

const U = HR.utils, db = HR.db, fs = HR.filestore;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // 注册变更钩子（与 app.js 一致）
  db.onChange(function () { fs.notifyChange(); });

  console.log('== 1. 能力检测 ==');
  check('supported=true（mock 已注入）', fs.supported === true);

  console.log('== 2. 选择文件夹并启用 ==');
  const name = await fs.pickFolder();
  check('返回文件夹名', name === '人事工作台数据');
  const st = fs.getState();
  check('enabled=true', st.enabled === true);
  check('dirName 正确', st.dirName === '人事工作台数据');

  console.log('== 3. 写数据后自动同步 ==');
  await db.add('employee', { employeeNo: 'FS001', name: '文件存储测试', gender: 'female', hireDate: '2025-04-01', status: 'active', phone: '13800000001' });
  await db.add('todo', { content: '文件模式待办', date: U.today(), priority: 'high', done: false });
  await db.add('attachment', { fileName: '测试证件.pdf', mimeType: 'application/pdf', size: 5, blob: new Blob(['pdfdata'], { type: 'application/pdf' }) });
  // 防抖 1.5s，等待同步完成
  await wait(2200);
  check('hr-data.json 已写入', mockRoot._files['hr-data.json'] !== undefined, Object.keys(mockRoot._files).join(','));
  check('hr-config.json 已写入', mockRoot._files['hr-config.json'] !== undefined);
  check('attachments 目录已创建', mockRoot._dirs['attachments'] !== undefined);
  const attFiles = Object.keys(mockRoot._dirs['attachments']._files || {});
  check('附件文件已写入 attachments/', attFiles.length >= 1, attFiles.join(','));
  const dataJson = mockRoot._files['hr-data.json'].content;
  const data = JSON.parse(dataJson);
  check('员工数据在导出中', data.stores.employee.some(e => e.employeeNo === 'FS001'));
  check('待办数据在导出中', data.stores.todo.some(t => t.content === '文件模式待办'));
  const attMeta = data.stores.attachment.find(a => a.fileName === '测试证件.pdf');
  check('附件元数据含 _file 引用', !!attMeta && !!attMeta._file, JSON.stringify(attMeta && attMeta._file));

  console.log('== 4. 手动同步 ==');
  await db.add('memo', { title: '同步测试笔记', content: '内容', pinned: false });
  await wait(2200);
  const data2 = JSON.parse(mockRoot._files['hr-data.json'].content);
  check('手动/自动同步含新笔记', data2.stores.memo.some(m => m.title === '同步测试笔记'));

  console.log('== 5. 从文件夹恢复（导入覆盖） ==');
  // 模拟文件夹中有另一份数据（外部编辑或迁移来的）
  const externalData = {
    app: 'hr_workbench', version: 1, exportedAt: new Date().toISOString(),
    stores: {
      employee: [{ id: 'ext-emp-1', employeeNo: 'EXT001', name: '外部导入员工', status: 'active', gender: 'male', hireDate: '2024-12-01', createdAt: 1, updatedAt: 1, deleted: 0 }],
      todo: [],
      memo: [],
      reminder: [],
      quick_link: [],
      sys_dict: [],
      department: [],
      position: [],
      grade: [],
      employee_attachment: [],
      attachment: [],
      status_log: []
    }
  };
  mockRoot._files['hr-data.json'] = { content: JSON.stringify(externalData), type: 'application/json' };
  await fs.restoreFromFolder();
  const emps = await db.query('employee', {});
  check('外部数据已导入（覆盖）', emps.total === 1 && emps.list[0].employeeNo === 'EXT001', emps.total + ' 条');

  console.log('== 6. 停止文件存储 ==');
  fs.disable();
  const st2 = fs.getState();
  check('enabled=false', st2.enabled === false);

  console.log('== 7. hasDataFile ==');
  const has = await fs.hasDataFile();
  check('检测到数据文件', has === true);

  console.log('\n========== 文件存储测试结果: PASS ' + pass + ' / FAIL ' + fail + ' ==========');
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
