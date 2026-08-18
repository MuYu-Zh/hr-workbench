<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const emps = ref([])
const empMap = ref({})
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({})

const statusLabels = { draft: '草稿', pending: '待审批', approved: '已通过', rejected: '已驳回' }
const statusFlow = ['draft', 'pending', 'approved', 'rejected']
const typeLabels = { leave: '请假', overtime: '加班', business_trip: '出差' }

async function load() {
  const [reqs, employees] = await Promise.all([db.getAll('attendance_request'), db.getAll('employee')])
  emps.value = employees.map((e) => ({ value: e.id, label: `${e.name}（${e.employeeNo}）` }))
  employees.forEach((e) => { empMap.value[e.id] = e })
  list.value = reqs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function openAdd() {
  editing.value = null
  form.value = { type: 'leave', status: 'draft', startTime: '', endTime: '', duration: 1, reason: '' }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row)
  dialogVisible.value = true
}

async function save() {
  if (!form.value.employeeId) { ElMessage.warning('请选择员工'); return }
  const rec = Object.assign({}, editing.value || {}, form.value, { duration: Number(form.value.duration) || 0 })
  if (editing.value) await db.put('attendance_request', rec)
  else await db.add('attendance_request', rec)
  ElMessage.success('已保存')
  dialogVisible.value = false
  load()
}

async function nextStatus(row) {
  const idx = statusFlow.indexOf(row.status)
  if (idx < 0 || idx >= statusFlow.length - 1) return
  const next = statusFlow[idx + 1]
  await db.put('attendance_request', Object.assign({}, row, { status: next }))
  ElMessage.success(`状态已流转为「${statusLabels[next]}」`)
  load()
}

async function remove(row) {
  await db.hardDelete('attendance_request', row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">📋 请假 / 加班 / 出差申请审批</div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">＋ 新增申请</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column label="员工" min-width="120">
        <template #default="{ row }">{{ empMap[row.employeeId]?.name || '—' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ typeLabels[row.type] || row.type }}</template>
      </el-table-column>
      <el-table-column prop="startTime" label="开始" width="110" />
      <el-table-column prop="endTime" label="结束" width="110" />
      <el-table-column prop="duration" label="时长" width="80" />
      <el-table-column prop="reason" label="事由" min-width="160" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : row.status === 'pending' ? 'warning' : 'info'">{{ statusLabels[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status !== 'approved' && row.status !== 'rejected'" link @click="nextStatus(row)">流转</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑申请' : '新增申请'" width="560px">
    <el-form label-width="90px">
      <el-form-item label="员工" required>
        <el-select v-model="form.employeeId" filterable style="width:100%">
          <el-option v-for="e in emps" :key="e.value" :label="e.label" :value="e.value" />
        </el-select>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="类型"><el-select v-model="form.type" style="width:100%"><el-option label="请假" value="leave" /><el-option label="加班" value="overtime" /><el-option label="出差" value="business_trip" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="时长"><el-input-number v-model="form.duration" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="开始日期"><el-date-picker v-model="form.startTime" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="结束日期"><el-date-picker v-model="form.endTime" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="事由"><el-input v-model="form.reason" type="textarea" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
