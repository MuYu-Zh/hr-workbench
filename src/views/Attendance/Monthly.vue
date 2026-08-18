<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '@/services/db'
import { importDingtalkAttendance } from '@/services/dingtalkImport'
import { generateMonthly } from '@/services/attendanceCalc'

const month = ref(new Date().toISOString().slice(0, 7))
const list = ref([])
const empMap = ref({})
const deptMap = ref({})
const editVisible = ref(false)
const editForm = ref({})

async function load() {
  const [monthly, emps, depts] = await Promise.all([
    db.getAllByIndex('attendance_monthly', 'month', month.value),
    db.getAll('employee'),
    db.getAll('department')
  ])
  emps.forEach((e) => { empMap.value[e.id] = e })
  depts.forEach((d) => { deptMap.value[d.id] = d.name })
  const monthlyMap = {}
  monthly.forEach((m) => { monthlyMap[m.employeeId] = m })
  list.value = emps
    .filter((e) => e.status === 'active')
    .map((e) => Object.assign({}, monthlyMap[e.id] || { employeeId: e.id, month: month.value }, { _emp: e }))
}

async function onImport(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  try {
    const result = await importDingtalkAttendance(file)
    ElMessageBox.alert(
      `类型：${result.type === 'monthly' ? '月度汇总' : result.type === 'punch' ? '打卡明细' : '未知'}\n` +
      `成功导入：${result.added}，更新：${result.updated}，未匹配：${result.unmatched.length}，失败：${result.failed.length}`,
      '导入结果',
      { type: 'info' }
    )
    load()
  } catch (err) {
    ElMessage.error(err.message || '导入失败')
  }
}

async function autoCalc() {
  const result = await generateMonthly(month.value)
  ElMessage.success(`自动计算完成：新增 ${result.generated}，更新 ${result.updated}`)
  load()
}

function openEdit(row) {
  editForm.value = Object.assign({}, row)
  editVisible.value = true
}

async function saveEdit() {
  const rec = Object.assign({}, editForm.value, { manualAdjusted: true })
  await db.put('attendance_monthly', rec)
  ElMessage.success('已保存手动修正')
  editVisible.value = false
  load()
}

function exportCsv() {
  const rows = list.value.map((r) => [
    r._emp.employeeNo, r._emp.name, deptMap.value[r._emp.departmentId] || '',
    r.expectedDays || 0, r.actualDays || 0, r.lateCount || 0, r.earlyCount || 0, r.lateEarlyCount || 0,
    r.absentDays || 0, r.leaveDays || 0, r.leaveHours || 0, r.overtimeHours || 0, r.tripDays || 0, r.anomalyCount || 0
  ])
  const csv = '\uFEFF' + ['工号,姓名,部门,应出勤,实际出勤,迟到,早退,迟到早退次数,缺卡/旷工,请假天数,请假时数,加班时长,出差天数,异常次数']
    .concat(rows.map((r) => r.map((v) => `"${String(v ?? '')}"`).join(','))).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `考勤汇总_${month.value}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">📅 月度考勤汇总表</div>
    <div class="toolbar">
      <el-date-picker v-model="month" type="month" value-format="YYYY-MM" style="width:140px" @change="load" />
      <el-button @click="$refs.file.click()">⬆ 导入钉钉考勤</el-button>
      <input ref="file" type="file" accept=".xlsx,.xls" style="display:none" @change="onImport" />
      <el-button type="primary" @click="autoCalc">⚙ 从打卡明细自动计算</el-button>
      <el-button @click="exportCsv">⬇ 导出 CSV</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="_emp.employeeNo" label="工号" width="110" />
      <el-table-column prop="_emp.name" label="姓名" width="110" />
      <el-table-column label="部门" min-width="120">
        <template #default="{ row }">{{ deptMap[row._emp.departmentId] || '—' }}</template>
      </el-table-column>
      <el-table-column prop="expectedDays" label="应出勤" width="80" />
      <el-table-column prop="actualDays" label="实际出勤" width="80" />
      <el-table-column prop="lateCount" label="迟到" width="70" />
      <el-table-column prop="earlyCount" label="早退" width="70" />
      <el-table-column prop="lateEarlyCount" label="迟到早退次数" width="110" />
      <el-table-column prop="absentDays" label="缺卡/旷工" width="90" />
      <el-table-column prop="leaveDays" label="请假天数" width="90" />
      <el-table-column prop="leaveHours" label="请假时数" width="90" />
      <el-table-column prop="overtimeHours" label="加班时长" width="90" />
      <el-table-column prop="tripDays" label="出差天数" width="90" />
      <el-table-column prop="anomalyCount" label="异常" width="70" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">修正</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="editVisible" title="手动修正月度汇总" width="520px">
    <el-form label-width="90px">
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="应出勤"><el-input-number v-model="editForm.expectedDays" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="实际出勤"><el-input-number v-model="editForm.actualDays" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="迟到"><el-input-number v-model="editForm.lateCount" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="早退"><el-input-number v-model="editForm.earlyCount" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="迟到早退次数"><el-input-number v-model="editForm.lateEarlyCount" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="缺卡/旷工"><el-input-number v-model="editForm.absentDays" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="请假天数"><el-input-number v-model="editForm.leaveDays" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="请假时数"><el-input-number v-model="editForm.leaveHours" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="加班时长"><el-input-number v-model="editForm.overtimeHours" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="出差天数"><el-input-number v-model="editForm.tripDays" :min="0" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" @click="saveEdit">保存</el-button>
    </template>
  </el-dialog>
</template>
