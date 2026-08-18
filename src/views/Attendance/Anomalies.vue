<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const emps = ref([])
const empMap = ref({})
const onlyUnhandled = ref(false)
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({})

const typeLabels = { late: '迟到', early_leave: '早退', missing_punch: '缺卡', absenteeism: '旷工', overtime_abnormal: '异常加班', duplicate: '重复打卡' }

async function load() {
  const [rows, employees] = await Promise.all([db.getAll('attendance_anomaly'), db.getAll('employee')])
  emps.value = employees.map((e) => ({ value: e.id, label: `${e.name}（${e.employeeNo}）` }))
  employees.forEach((e) => { empMap.value[e.id] = e })
  list.value = rows
    .filter((a) => !onlyUnhandled.value || !a.handled)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

function openAdd() {
  editing.value = null
  form.value = { date: '', type: 'late', detail: '', handled: false, handleNote: '' }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row)
  dialogVisible.value = true
}

async function save() {
  if (!form.value.employeeId || !form.value.date) { ElMessage.warning('请选择员工和日期'); return }
  const rec = Object.assign({}, editing.value || {}, form.value)
  if (editing.value) await db.put('attendance_anomaly', rec)
  else await db.add('attendance_anomaly', rec)
  ElMessage.success('已保存')
  dialogVisible.value = false
  load()
}

async function markHandled(row) {
  await db.put('attendance_anomaly', Object.assign({}, row, { handled: true }))
  ElMessage.success('已标记处理')
  load()
}

async function batchHandled() {
  const unhandled = list.value.filter((a) => !a.handled)
  for (const a of unhandled) await db.put('attendance_anomaly', Object.assign({}, a, { handled: true }))
  ElMessage.success(`已批量处理 ${unhandled.length} 条`)
  load()
}

async function remove(row) {
  await db.hardDelete('attendance_anomaly', row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">⚠️ 考勤异常预警</div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">＋ 新增异常</el-button>
      <el-button @click="batchHandled">✅ 批量标记已处理</el-button>
      <el-checkbox v-model="onlyUnhandled" @change="load">仅看未处理</el-checkbox>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column label="员工" min-width="120">
        <template #default="{ row }">{{ empMap[row.employeeId]?.name || '—' }}</template>
      </el-table-column>
      <el-table-column prop="date" label="日期" width="120" />
      <el-table-column label="异常类型" width="110">
        <template #default="{ row }">{{ typeLabels[row.type] || row.type }}</template>
      </el-table-column>
      <el-table-column prop="detail" label="明细" min-width="180" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.handled ? 'success' : 'danger'">{{ row.handled ? '已处理' : '未处理' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="!row.handled" link type="success" @click="markHandled(row)">处理</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑异常' : '新增异常'" width="480px">
    <el-form label-width="90px">
      <el-form-item label="员工" required>
        <el-select v-model="form.employeeId" filterable style="width:100%">
          <el-option v-for="e in emps" :key="e.value" :label="e.label" :value="e.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="日期" required>
        <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="异常类型">
        <el-select v-model="form.type" style="width:100%">
          <el-option v-for="(label, value) in typeLabels" :key="value" :label="label" :value="value" />
        </el-select>
      </el-form-item>
      <el-form-item label="明细"><el-input v-model="form.detail" type="textarea" /></el-form-item>
      <el-form-item label="处理备注"><el-input v-model="form.handleNote" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
