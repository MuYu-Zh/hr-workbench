<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '@/services/db'

const emps = ref([])
const empId = ref('')
const category = ref('')
const list = ref([])
const catOptions = ref([])
const previewVisible = ref(false)
const previewUrl = ref('')
const previewTitle = ref('')
const editVisible = ref(false)
const editForm = ref({ id: '', category: '', expireDate: '', remark: '' })

async function load() {
  if (!empId.value) { list.value = []; return }
  let rows = await db.getAllByIndex('employee_attachment', 'employeeId', empId.value)
  if (category.value) rows = rows.filter((r) => r.category === category.value)
  const attIds = rows.map((r) => r.attachmentId).filter(Boolean)
  const atts = await Promise.all(attIds.map((id) => db.get('attachment', id)))
  const attMap = {}
  atts.forEach((a) => { if (a) attMap[a.id] = a })
  list.value = rows.map((r) => Object.assign({}, r, { _att: attMap[r.attachmentId] }))
}

async function uploadFiles(files) {
  for (const file of files) {
    const att = await db.add('attachment', { fileName: file.name, mimeType: file.type, size: file.size, blob: file })
    await db.add('employee_attachment', {
      employeeId: empId.value,
      category: category.value || 'other',
      title: file.name,
      attachmentId: att.id,
      expireDate: '',
      remark: ''
    })
  }
  ElMessage.success('上传完成')
  load()
}

function pickFiles(e) {
  if (e.target.files && e.target.files.length) uploadFiles(Array.from(e.target.files))
  e.target.value = ''
}

function preview(row) {
  const att = row._att
  if (!att) return
  const blob = att.blob instanceof Blob ? att.blob : new Blob([att.blob], { type: att.mimeType || 'application/octet-stream' })
  previewUrl.value = URL.createObjectURL(blob)
  previewTitle.value = att.fileName
  previewVisible.value = true
}

function download(row) {
  const att = row._att
  if (!att) return
  const blob = att.blob instanceof Blob ? att.blob : new Blob([att.blob], { type: att.mimeType || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = att.fileName
  a.click()
  URL.revokeObjectURL(url)
}

function openEdit(row) {
  editForm.value = { id: row.id, category: row.category, expireDate: row.expireDate, remark: row.remark }
  editVisible.value = true
}

async function saveEdit() {
  const rec = await db.get('employee_attachment', editForm.value.id)
  await db.put('employee_attachment', Object.assign({}, rec, editForm.value))
  ElMessage.success('附件信息已更新')
  editVisible.value = false
  load()
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除附件「${row.title}」吗？`, '删除附件', { type: 'warning' })
  await db.softDelete('employee_attachment', row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(async () => {
  emps.value = (await db.query('employee', { filter: (e) => e.status === 'active', sort: 'employeeNo', dir: 'asc' })).list
  catOptions.value = await db.getAllByIndex('sys_dict', 'group', 'attachment_category')
})
</script>

<template>
  <div class="card">
    <div class="card-title">📎 员工证件 / 附件归档</div>
    <div class="toolbar">
      <el-select v-model="empId" placeholder="选择员工" style="width:220px" @change="load">
        <el-option v-for="e in emps" :key="e.id" :label="`${e.name}（${e.employeeNo}）`" :value="e.id" />
      </el-select>
      <el-select v-model="category" placeholder="全部类别" clearable style="width:140px" @change="load">
        <el-option v-for="c in catOptions" :key="c.value" :label="c.label" :value="c.value" />
      </el-select>
      <el-upload :show-file-list="false" :before-upload="(file) => { uploadFiles([file]); return false }" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt">
        <el-button type="primary">⬆ 上传附件</el-button>
      </el-upload>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-empty v-if="!empId" description="请先选择员工" />
    <el-table v-else :data="list">
      <el-table-column prop="title" label="文件名" min-width="200" />
      <el-table-column label="类别" width="120">
        <template #default="{ row }">{{ catOptions.find((c) => c.value === row.category)?.label || row.category }}</template>
      </el-table-column>
      <el-table-column label="大小" width="100">
        <template #default="{ row }">{{ row._att ? (row._att.size / 1024).toFixed(1) + ' KB' : '—' }}</template>
      </el-table-column>
      <el-table-column prop="expireDate" label="有效期至" width="120" />
      <el-table-column prop="remark" label="备注" min-width="120" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="preview(row)">预览</el-button>
          <el-button link @click="download(row)">下载</el-button>
          <el-button link @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="previewVisible" :title="previewTitle" width="70%" top="5vh">
    <iframe v-if="previewUrl" :src="previewUrl" style="width:100%;height:70vh;border:none;border-radius:8px" />
  </el-dialog>

  <el-dialog v-model="editVisible" title="编辑附件信息" width="420px">
    <el-form label-width="80px">
      <el-form-item label="类别">
        <el-select v-model="editForm.category" style="width:100%">
          <el-option v-for="c in catOptions" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="有效期至">
        <el-date-picker v-model="editForm.expireDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="editForm.remark" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" @click="saveEdit">保存</el-button>
    </template>
  </el-dialog>
</template>
