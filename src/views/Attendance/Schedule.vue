<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const activeTab = ref('shifts')
const shifts = ref([])
const schedules = ref([])
const emps = ref([])
const empMap = ref({})
const shiftMap = ref({})
const shiftDialog = ref(false)
const shiftForm = ref({})
const scheduleDialog = ref(false)
const scheduleForm = ref({})

async function load() {
  const [shiftList, schedList, employees] = await Promise.all([
    db.getAll('shift'),
    db.getAll('schedule'),
    db.getAll('employee')
  ])
  shifts.value = shiftList
  schedules.value = schedList.sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''))
  emps.value = employees.map((e) => ({ value: e.id, label: `${e.name}（${e.employeeNo}）` }))
  employees.forEach((e) => { empMap.value[e.id] = e })
  shiftMap.value = {}
  shiftList.forEach((s) => { shiftMap.value[s.id] = s })
}

function openShiftAdd() {
  shiftForm.value = { name: '', startTime: '09:00', endTime: '18:00', flexible: false, color: '#409eff' }
  shiftDialog.value = true
}

function openShiftEdit(row) {
  shiftForm.value = Object.assign({}, row)
  shiftDialog.value = true
}

async function saveShift() {
  if (!shiftForm.value.name) { ElMessage.warning('班次名称不能为空'); return }
  if (shiftForm.value.id) await db.put('shift', shiftForm.value)
  else await db.add('shift', shiftForm.value)
  ElMessage.success('班次已保存')
  shiftDialog.value = false
  load()
}

async function removeShift(row) {
  await db.hardDelete('shift', row.id)
  ElMessage.success('班次已删除')
  load()
}

function openScheduleAdd() {
  scheduleForm.value = { workDate: '', shiftId: '' }
  scheduleDialog.value = true
}

async function saveSchedule() {
  if (!scheduleForm.value.employeeId || !scheduleForm.value.workDate || !scheduleForm.value.shiftId) {
    ElMessage.warning('请选择员工、日期和班次')
    return
  }
  const emp = empMap.value[scheduleForm.value.employeeId]
  await db.add('schedule', Object.assign({}, scheduleForm.value, { departmentId: emp ? emp.departmentId : null }))
  ElMessage.success('排班已保存')
  scheduleDialog.value = false
  load()
}

async function removeSchedule(row) {
  await db.hardDelete('schedule', row.id)
  ElMessage.success('排班已删除')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">🗓 排班管理</div>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="班次设置" name="shifts">
        <div class="toolbar">
          <el-button type="primary" @click="openShiftAdd">＋ 新增班次</el-button>
        </div>
        <el-table :data="shifts">
          <el-table-column prop="name" label="班次名称" width="140" />
          <el-table-column prop="startTime" label="上班时间" width="100" />
          <el-table-column prop="endTime" label="下班时间" width="100" />
          <el-table-column label="弹性" width="80">
            <template #default="{ row }">{{ row.flexible ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column label="颜色" width="80">
            <template #default="{ row }"><span :style="{ color: row.color || '#409eff' }">●</span></template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button link type="primary" @click="openShiftEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="removeShift(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="排班表" name="schedules">
        <div class="toolbar">
          <el-button type="primary" @click="openScheduleAdd">＋ 新增排班</el-button>
        </div>
        <el-table :data="schedules">
          <el-table-column label="员工" min-width="120">
            <template #default="{ row }">{{ empMap[row.employeeId]?.name || '—' }}</template>
          </el-table-column>
          <el-table-column prop="workDate" label="日期" width="120" />
          <el-table-column label="班次" width="120">
            <template #default="{ row }">{{ shiftMap[row.shiftId]?.name || '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button link type="danger" @click="removeSchedule(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>

  <el-dialog v-model="shiftDialog" :title="shiftForm.id ? '编辑班次' : '新增班次'" width="420px">
    <el-form label-width="80px">
      <el-form-item label="名称"><el-input v-model="shiftForm.name" /></el-form-item>
      <el-form-item label="上班时间"><el-time-picker v-model="shiftForm.startTime" value-format="HH:mm" format="HH:mm" style="width:100%" /></el-form-item>
      <el-form-item label="下班时间"><el-time-picker v-model="shiftForm.endTime" value-format="HH:mm" format="HH:mm" style="width:100%" /></el-form-item>
      <el-form-item label="弹性"><el-switch v-model="shiftForm.flexible" /></el-form-item>
      <el-form-item label="颜色"><el-color-picker v-model="shiftForm.color" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="shiftDialog = false">取消</el-button>
      <el-button type="primary" @click="saveShift">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="scheduleDialog" title="新增排班" width="420px">
    <el-form label-width="80px">
      <el-form-item label="员工">
        <el-select v-model="scheduleForm.employeeId" filterable style="width:100%">
          <el-option v-for="e in emps" :key="e.value" :label="e.label" :value="e.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="日期">
        <el-date-picker v-model="scheduleForm.workDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
      </el-form-item>
      <el-form-item label="班次">
        <el-select v-model="scheduleForm.shiftId" style="width:100%">
          <el-option v-for="s in shifts" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="scheduleDialog = false">取消</el-button>
      <el-button type="primary" @click="saveSchedule">保存</el-button>
    </template>
  </el-dialog>
</template>
