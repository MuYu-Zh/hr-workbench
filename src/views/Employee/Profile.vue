<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/services/db'

const router = useRouter()
const list = ref([])
const deptMap = ref({})

onMounted(async () => {
  const [emps, depts] = await Promise.all([db.getAll('employee'), db.getAll('department')])
  depts.forEach((d) => { deptMap.value[d.id] = d.name })
  list.value = emps.filter((e) => e.status === 'active')
})
</script>

<template>
  <div class="card">
    <div class="card-title">📝 员工基本信息维护</div>
    <el-table :data="list">
      <el-table-column prop="employeeNo" label="工号" width="120" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column label="部门" min-width="140">
        <template #default="{ row }">{{ deptMap[row.departmentId] || '—' }}</template>
      </el-table-column>
      <el-table-column prop="hireDate" label="入职日期" width="120" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="router.push('/employee/roster')">去花名册编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
