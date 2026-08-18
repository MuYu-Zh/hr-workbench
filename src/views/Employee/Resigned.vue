<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const deptMap = ref({})

async function load() {
  const [emps, depts] = await Promise.all([db.getAll('employee'), db.getAll('department')])
  depts.forEach((d) => { deptMap.value[d.id] = d.name })
  list.value = emps.filter((e) => e.status !== 'active')
}

async function restore(row) {
  await db.put('employee', Object.assign({}, row, { status: 'active' }))
  ElMessage.success('已恢复在职')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">🚪 离职员工档案</div>
    <el-table :data="list">
      <el-table-column prop="employeeNo" label="工号" width="120" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column label="原部门" min-width="140">
        <template #default="{ row }">{{ deptMap[row.departmentId] || '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'resigning' ? 'warning' : 'info'">{{ row.status === 'resigning' ? '离职交接中' : '已离职' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="resignDate" label="离职日期" width="120" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'active'" link type="primary" @click="restore(row)">恢复在职</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
