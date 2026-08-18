<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const deptOptions = ref([])
const deptMap = ref({})
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({})

const statusLabels = { draft: '草稿', approving: '审批中', recruiting: '招聘中', closed: '已关闭' }
const statusFlow = ['draft', 'approving', 'recruiting', 'closed']

async function load() {
  const [reqs, depts] = await Promise.all([db.getAll('recruit_requirement'), db.getAll('department')])
  deptOptions.value = depts.map((d) => ({ value: d.id, label: d.name }))
  depts.forEach((d) => { deptMap.value[d.id] = d.name })
  list.value = reqs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function openAdd() {
  editing.value = null
  form.value = { headcount: 1, urgency: 'medium', reason: '新增', status: 'draft', expectedDate: '' }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row)
  dialogVisible.value = true
}

async function save() {
  if (!form.value.reqNo || !form.value.positionName) { ElMessage.warning('需求编号和招聘岗位不能为空'); return }
  const rec = Object.assign({}, editing.value || {}, form.value, { headcount: Number(form.value.headcount) || 1 })
  if (editing.value) { await db.put('recruit_requirement', rec); ElMessage.success('已更新') }
  else { await db.add('recruit_requirement', rec); ElMessage.success('已创建') }
  dialogVisible.value = false
  load()
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除招聘需求「${row.reqNo}」吗？`, '删除', { type: 'warning' })
  await db.hardDelete('recruit_requirement', row.id)
  ElMessage.success('已删除')
  load()
}

async function nextStatus(row) {
  const idx = statusFlow.indexOf(row.status)
  if (idx < 0 || idx >= statusFlow.length - 1) return
  const next = statusFlow[idx + 1]
  await db.put('recruit_requirement', Object.assign({}, row, { status: next }))
  ElMessage.success(`状态已流转为「${statusLabels[next]}」`)
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">📣 招聘需求登记</div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">＋ 新增需求</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="reqNo" label="需求编号" width="130" />
      <el-table-column label="需求部门" min-width="120">
        <template #default="{ row }">{{ deptMap[row.departmentId] || '—' }}</template>
      </el-table-column>
      <el-table-column prop="positionName" label="招聘岗位" min-width="120" />
      <el-table-column prop="headcount" label="人数" width="70" />
      <el-table-column label="紧急程度" width="90">
        <template #default="{ row }">{{ { high: '高', medium: '中', low: '低' }[row.urgency] || row.urgency }}</template>
      </el-table-column>
      <el-table-column prop="expectedDate" label="期望到岗" width="110" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'closed' ? 'info' : row.status === 'recruiting' ? 'success' : row.status === 'approving' ? 'warning' : 'default'">{{ statusLabels[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status !== 'closed'" link @click="nextStatus(row)">流转</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑招聘需求' : '新增招聘需求'" width="640px">
    <el-form label-width="100px">
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="需求编号" required><el-input v-model="form.reqNo" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="招聘岗位" required><el-input v-model="form.positionName" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="需求部门"><el-select v-model="form.departmentId" clearable style="width:100%"><el-option v-for="d in deptOptions" :key="d.value" :label="d.label" :value="d.value" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="招聘人数"><el-input-number v-model="form.headcount" :min="1" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="紧急程度"><el-select v-model="form.urgency" style="width:100%"><el-option label="高" value="high" /><el-option label="中" value="medium" /><el-option label="低" value="low" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="期望到岗"><el-date-picker v-model="form.expectedDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="招聘原因"><el-select v-model="form.reason" style="width:100%"><el-option label="新增" value="新增" /><el-option label="替换" value="替换" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="预算"><el-input-number v-model="form.budget" :min="0" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="岗位职责"><el-input v-model="form.jobDesc" type="textarea" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
