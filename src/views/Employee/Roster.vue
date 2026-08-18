<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import { db } from '@/services/db'

const list = ref([])
const depts = ref([])
const deptMap = ref({})
const keyword = ref('')
const deptFilter = ref('')
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({})

const headers = ['工号', '姓名', '性别', '民族', '出生日期', '身份证号', '手机', '邮箱', '部门', '入职日期', '转正日期', '用工形式', '学历', '毕业院校', '专业', '现住址']
const fieldMap = {
  '工号': 'employeeNo', '姓名': 'name', '性别': 'gender', '民族': 'nationality', '出生日期': 'birthDate',
  '身份证号': 'idCard', '手机': 'phone', '邮箱': 'email', '部门': 'departmentName', '入职日期': 'hireDate',
  '转正日期': 'regularDate', '用工形式': 'employmentType', '学历': 'education', '毕业院校': 'school',
  '专业': 'major', '现住址': 'address'
}

async function load() {
  const [emps, deptList] = await Promise.all([db.getAll('employee'), db.getAll('department')])
  deptMap.value = {}
  deptList.forEach((d) => { deptMap.value[d.id] = d.name })
  depts.value = deptList.map((d) => ({ value: d.id, label: d.name + (d.status === 'disabled' ? '（停用）' : '') }))
  list.value = emps
    .filter((e) => e.status === 'active')
    .filter((e) => !deptFilter.value || e.departmentId === deptFilter.value)
    .filter((e) => {
      if (!keyword.value) return true
      const kw = keyword.value.toLowerCase()
      return (e.name || '').toLowerCase().includes(kw) || (e.employeeNo || '').toLowerCase().includes(kw) || (e.phone || '').includes(kw)
    })
    .sort((a, b) => (b.hireDate || '').localeCompare(a.hireDate || ''))
}

function openAdd() {
  editing.value = null
  form.value = { gender: 'female', employmentType: 'fulltime' }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row)
  if (form.value.emergencyContact && typeof form.value.emergencyContact === 'object') {
    const ec = form.value.emergencyContact
    form.value.emergencyContact = [ec.name, ec.phone, ec.relation].filter(Boolean).join(' / ')
  }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.employeeNo || !form.value.name) { ElMessage.warning('工号和姓名不能为空'); return }
  const rec = Object.assign({}, editing.value || {}, form.value)
  if (typeof rec.emergencyContact === 'string' && rec.emergencyContact) {
    const parts = rec.emergencyContact.split('/').map((s) => s.trim())
    rec.emergencyContact = { name: parts[0] || '', phone: parts[1] || '', relation: parts[2] || '' }
  } else if (!rec.emergencyContact) {
    rec.emergencyContact = { name: '', phone: '', relation: '' }
  }
  if (editing.value) {
    await db.put('employee', rec)
    ElMessage.success('员工档案已更新')
  } else {
    rec.status = 'active'
    await db.add('employee', rec)
    ElMessage.success('员工档案已创建')
  }
  dialogVisible.value = false
  load()
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除 ${row.name} 的档案吗？`, '删除员工', { type: 'warning' })
  await db.softDelete('employee', row.id)
  ElMessage.success('已删除')
  load()
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([headers, ['EM2025001', '示例员工', '女', '汉族', '1998-01-01', '', '13800000000', 'hr@example.com', '', '2026-01-01', '', '全职', '本科', '', '', '']])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '花名册导入')
  XLSX.writeFile(wb, '花名册导入模板.xlsx')
}

async function importFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
  const [emps, deptList] = await Promise.all([db.getAll('employee'), db.getAll('department')])
  const empByNo = {}
  emps.forEach((emp) => { if (emp.employeeNo) empByNo[emp.employeeNo] = emp })
  const deptByName = {}
  deptList.forEach((d) => { if (d.name) deptByName[d.name.trim()] = d })
  let added = 0, updated = 0, deptMiss = 0
  for (const row of rows) {
    const data2 = {}
    headers.forEach((h) => {
      const key = fieldMap[h]
      if (!key) return
      let val = row[h]
      if (key === 'gender') { const g = String(val || '').trim(); data2[key] = g === '男' ? 'male' : g === '女' ? 'female' : g }
      else if (key === 'employmentType') { const t = String(val || '').trim(); data2[key] = t === '全职' ? 'fulltime' : t === '实习' ? 'intern' : t === '兼职' ? 'parttime' : t }
      else if (key === 'birthDate' || key === 'hireDate' || key === 'regularDate') { data2[key] = val ? String(val).slice(0, 10) : '' }
      else data2[key] = val === undefined || val === null ? '' : String(val).trim()
    })
    if (!data2.employeeNo || !data2.name) continue
    const deptName = data2.departmentName || ''
    delete data2.departmentName
    if (deptName) {
      const dept = deptByName[deptName.trim()]
      if (dept) data2.departmentId = dept.id
      else { data2.departmentId = null; deptMiss++ }
    } else data2.departmentId = null
    if (empByNo[data2.employeeNo]) { await db.put('employee', Object.assign({}, empByNo[data2.employeeNo], data2)); updated++ }
    else { await db.add('employee', Object.assign({ status: 'active' }, data2)); added++ }
  }
  ElMessage.success(`导入完成：新增 ${added}，更新 ${updated}，部门未匹配 ${deptMiss}`)
  load()
}

function exportCsv() {
  const rows = list.value.map((e) => [e.employeeNo, e.name, e.gender === 'male' ? '男' : '女', e.nationality, deptMap.value[e.departmentId] || '', e.hireDate, e.regularDate || '试用中', e.education, e.school, e.major, e.phone, e.email, e.address])
  const csv = '\uFEFF' + ['工号,姓名,性别,民族,部门,入职日期,转正日期,学历,毕业院校,专业,手机,邮箱,现住址'].concat(rows.map((r) => r.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(','))).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `在职员工花名册_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">
      <span>👥 在职员工花名册</span>
      <span class="t-sub">共 {{ list.length }} 人</span>
    </div>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索姓名 / 工号 / 手机号" clearable style="width:220px" @input="load" />
      <el-select v-model="deptFilter" placeholder="全部部门" clearable style="width:160px" @change="load">
        <el-option v-for="d in depts" :key="d.value" :label="d.label" :value="d.value" />
      </el-select>
      <el-button type="primary" @click="openAdd">＋ 新增员工</el-button>
      <el-button @click="downloadTemplate">📋 下载模板</el-button>
      <el-button @click="$refs.file.click()">⬆ 导入 .xlsx</el-button>
      <el-button @click="exportCsv">⬇ 导出 CSV</el-button>
      <input ref="file" type="file" accept=".xlsx,.xls" style="display:none" @change="importFile" />
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list" size="default">
      <el-table-column prop="employeeNo" label="工号" width="120" />
      <el-table-column prop="name" label="姓名" width="120">
        <template #default="{ row }"><strong>{{ row.name }}</strong></template>
      </el-table-column>
      <el-table-column label="性别" width="70">
        <template #default="{ row }">{{ row.gender === 'male' ? '男' : '女' }}</template>
      </el-table-column>
      <el-table-column label="部门" min-width="140">
        <template #default="{ row }">{{ deptMap[row.departmentId] || '—' }}</template>
      </el-table-column>
      <el-table-column prop="hireDate" label="入职日期" width="110" />
      <el-table-column prop="phone" label="手机" width="130" />
      <el-table-column prop="education" label="学历" width="90" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑员工' : '新增员工'" width="720px" top="5vh">
    <el-form label-width="90px">
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="工号" required><el-input v-model="form.employeeNo" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="性别"><el-select v-model="form.gender" style="width:100%"><el-option label="男" value="male" /><el-option label="女" value="female" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="民族"><el-input v-model="form.nationality" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="部门"><el-select v-model="form.departmentId" clearable style="width:100%"><el-option v-for="d in depts" :key="d.value" :label="d.label" :value="d.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="手机" required><el-input v-model="form.phone" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="入职日期"><el-date-picker v-model="form.hireDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="转正日期"><el-date-picker v-model="form.regularDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="用工形式"><el-select v-model="form.employmentType" style="width:100%"><el-option label="全职" value="fulltime" /><el-option label="实习" value="intern" /><el-option label="兼职" value="parttime" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="学历"><el-input v-model="form.education" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="毕业院校"><el-input v-model="form.school" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="专业"><el-input v-model="form.major" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="现住址"><el-input v-model="form.address" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
