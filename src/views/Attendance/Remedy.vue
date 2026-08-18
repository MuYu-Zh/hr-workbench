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

async function load() {
  const [rows, employees] = await Promise.all([db.getAll('attendance_remedy'), db.getAll('employee')])
  emps.value = employees.map((e) => ({ value: e.id, label: `${e.name}（${e.employeeNo}）` }))
  employees.forEach((e) => { empMap.value[e.id] = e })
  list.value = rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function openAdd() {
  editing.value = null
  form.value = { timePoint: 'on', status: 'draft', remedyDate: '', reason: '' }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row)
  dialogVisible.value = true
}

async function save() {
  if (!form.value.employeeId || !form.value.remedyDate) { ElMessage.warning('请选择员工和补卡日期'); return }
  const rec = Object.assign({}, editing.value || {}, form.value)
  if (editing.value) await db.put('attendance_remedy', rec)
  else await db.add('attendance_remedy', rec)
  ElMessage.success('已保存')
  dialogVisible.value = false
  load()
}

async function nextStatus(row) {
  const idx = statusFlow.indexOf(row.status)
  if (idx < 0 || idx >= statusFlow.length - 1) return
  const next = statusFlow[idx + 1]
  await db.put('attendance_remedy', Object.assign({}, row, { status: next }))
  if (next === 'approved') {
    const anomalies = await db.getAllByIndex('attendance_anomaly', 'employeeId', row.employeeId)
    for (const a of anomalies) {
      if (a.date === row.remedyDate && !a.handled) {
        await db.put('attendance_anomaly', Object.assign({}, a, { handled: true, handleNote: '补卡通过' }))
      }
    }
  }
  ElMessage.success(`状态已流转为「${statusLabels[next]}」`)
  load()
}

async function remove(row) {
  await db.hardDelete('attendance_remedy', row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">🕐 补卡申请记录</div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">＋ 新增补卡申请</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column label="员工" min-width="120">
        <template #default="{ row }">{{ empMap[row.employeeId]?.name || '—' }}</template>
      </el-table-column>
      <el-table-column prop="remedyDate" label="补卡日期" width="120" />
      <el-table-column label="时间点" width="100">
        <template #default="{ row }">{{ row.timePoint === 'on' ? '上班卡' : '下班卡' }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="180" />
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

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑补卡申请' : '新增补卡申请'" width="480px">
    <el-form label-width="90px">
      <el-form-item label="员工" required>
        <el-select v-model="form.employeeId" filterable style="width:100%">
          <el-option v-for="e in emps" :key="e.value" :label="e.label" :value="e.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="补卡日期" required>
        <el-date-picker v-model="form.remedyDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="时间点">
        <el-select v-model="form.timePoint" style="width:100%">
          <el-option label="上班卡" value="on" />
          <el-option label="下班卡" value="off" />
        </el-select>
      </el-form-item>
      <el-form-item label="原因"><el-input v-model="form.reason" type="textarea" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
