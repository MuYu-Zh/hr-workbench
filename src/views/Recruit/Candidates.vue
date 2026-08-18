<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'
import { db } from '@/services/db'

const list = ref([])
const sourceOptions = ref([])
const requirementOptions = ref([])
const statusLabels = { pending: '待筛选', screening: '初筛通过', interviewing: '面试中', hired: '已录用', rejected: '已淘汰', onboarded: '已入职' }
const keyword = ref('')
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({})

async function load() {
  const [cands, dicts, reqs] = await Promise.all([
    db.getAll('candidate'),
    db.getAllByIndex('sys_dict', 'group', 'recruit_channel'),
    db.getAll('recruit_requirement')
  ])
  sourceOptions.value = dicts.map((d) => ({ value: d.value, label: d.label }))
  requirementOptions.value = reqs.map((r) => ({ value: r.id, label: `${r.reqNo} ${r.positionName}` }))
  list.value = cands
    .filter((c) => !keyword.value || (c.name || '').includes(keyword.value) || (c.phone || '').includes(keyword.value))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function openAdd() {
  editing.value = null
  form.value = { gender: 'female', status: 'pending', workYears: 0 }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row)
  dialogVisible.value = true
}

async function onResumeUpload(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  const att = await db.add('attachment', { fileName: file.name, mimeType: file.type, size: file.size, blob: file })
  form.value.resumeAttachmentId = att.id
  ElMessage.success('简历已上传')
}

async function save() {
  if (!form.value.name || !form.value.phone) { ElMessage.warning('姓名和电话不能为空'); return }
  const rec = Object.assign({}, editing.value || {}, form.value, { workYears: Number(form.value.workYears) || 0 })
  if (editing.value) { await db.put('candidate', rec); ElMessage.success('候选人已更新') }
  else { await db.add('candidate', rec); ElMessage.success('候选人已创建') }
  dialogVisible.value = false
  load()
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除候选人「${row.name}」吗？`, '删除', { type: 'warning' })
  await db.hardDelete('candidate', row.id)
  ElMessage.success('已删除')
  load()
}

async function previewResume(row) {
  if (!row.resumeAttachmentId) { ElMessage.warning('该候选人暂无简历'); return }
  const att = await db.get('attachment', row.resumeAttachmentId)
  if (!att) { ElMessage.warning('简历不存在'); return }
  const blob = att.blob instanceof Blob ? att.blob : new Blob([att.blob], { type: att.mimeType || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

function downloadTemplate() {
  const headers = ['姓名', '性别', '电话', '邮箱', '应聘岗位', '来源渠道', '学历', '工作年限', '状态']
  const ws = XLSX.utils.aoa_to_sheet([headers, ['示例', '女', '13800000000', 'a@b.com', '前端工程师', 'BOSS直聘', '本科', 3, '待筛选']])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '候选人导入')
  XLSX.writeFile(wb, '候选人导入模板.xlsx')
}

async function importFile(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const existing = await db.getAll('candidate')
  const byPhone = {}
  existing.forEach((c) => { if (c.phone) byPhone[c.phone] = c })
  const sourceMap = {}
  sourceOptions.value.forEach((s) => { sourceMap[s.label] = s.value })
  let added = 0, updated = 0
  for (const row of rows) {
    const rec = {
      name: row['姓名'],
      gender: row['性别'] === '男' ? 'male' : 'female',
      phone: String(row['电话'] || '').trim(),
      email: row['邮箱'] || '',
      appliedPosition: row['应聘岗位'] || '',
      source: sourceMap[row['来源渠道']] || 'other',
      education: row['学历'] || '',
      workYears: Number(row['工作年限']) || 0,
      status: row['状态'] ? Object.keys(statusLabels).find((k) => statusLabels[k] === row['状态']) || 'pending' : 'pending'
    }
    if (!rec.name || !rec.phone) continue
    if (byPhone[rec.phone]) { await db.put('candidate', Object.assign({}, byPhone[rec.phone], rec)); updated++ }
    else { await db.add('candidate', rec); added++ }
  }
  ElMessage.success(`导入完成：新增 ${added}，更新 ${updated}`)
  load()
}

function exportCsv() {
  const rows = list.value.map((c) => [c.name, c.gender === 'male' ? '男' : '女', c.phone, c.email, c.appliedPosition, sourceOptions.value.find((s) => s.value === c.source)?.label || c.source, c.education, c.workYears, statusLabels[c.status]])
  const csv = '\uFEFF' + ['姓名,性别,电话,邮箱,应聘岗位,来源渠道,学历,工作年限,状态'].concat(rows.map((r) => r.map((v) => `"${String(v ?? '')}"`).join(','))).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '候选人简历库.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">📇 候选人简历库</div>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索姓名 / 电话" clearable style="width:200px" @input="load" />
      <el-button type="primary" @click="openAdd">＋ 新增候选人</el-button>
      <el-button @click="downloadTemplate">📋 下载模板</el-button>
      <el-button @click="$refs.file.click()">⬆ 导入 .xlsx</el-button>
      <el-button @click="exportCsv">⬇ 导出 CSV</el-button>
      <input ref="file" type="file" accept=".xlsx,.xls" style="display:none" @change="importFile" />
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="name" label="姓名" width="110" />
      <el-table-column label="性别" width="60">
        <template #default="{ row }">{{ row.gender === 'male' ? '男' : '女' }}</template>
      </el-table-column>
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="appliedPosition" label="应聘岗位" min-width="120" />
      <el-table-column label="来源" width="110">
        <template #default="{ row }">{{ sourceOptions.find((s) => s.value === row.source)?.label || row.source }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag>{{ statusLabels[row.status] || row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link @click="previewResume(row)">简历</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑候选人' : '新增候选人'" width="640px">
    <el-form label-width="90px">
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="性别"><el-select v-model="form.gender" style="width:100%"><el-option label="男" value="male" /><el-option label="女" value="female" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="电话" required><el-input v-model="form.phone" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="应聘岗位"><el-input v-model="form.appliedPosition" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="来源渠道"><el-select v-model="form.source" clearable style="width:100%"><el-option v-for="s in sourceOptions" :key="s.value" :label="s.label" :value="s.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="学历"><el-input v-model="form.education" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="工作年限"><el-input-number v-model="form.workYears" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option v-for="(label, value) in statusLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="关联需求"><el-select v-model="form.requirementId" clearable style="width:100%"><el-option v-for="r in requirementOptions" :key="r.value" :label="r.label" :value="r.value" /></el-select></el-form-item></el-col>
        <el-col :span="24">
          <el-form-item label="简历附件">
            <div style="display:flex;gap:8px;width:100%">
              <el-button @click="$refs.resumeFile.click()">上传简历</el-button>
              <span v-if="form.resumeAttachmentId" class="muted">已上传</span>
              <input ref="resumeFile" type="file" style="display:none" @change="onResumeUpload" />
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
