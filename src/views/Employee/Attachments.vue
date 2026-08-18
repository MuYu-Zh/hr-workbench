<script setup>
import { ref, onMounted } from 'vue'
import { db } from '@/services/db'

const emps = ref([])
const empId = ref('')
const list = ref([])

onMounted(async () => {
  emps.value = (await db.query('employee', { filter: (e) => e.status === 'active', sort: 'employeeNo', dir: 'asc' })).list
})

async function load() {
  if (!empId.value) { list.value = []; return }
  list.value = await db.getAllByIndex('employee_attachment', 'employeeId', empId.value)
}
</script>

<template>
  <div class="card">
    <div class="card-title">📎 员工证件 / 附件归档</div>
    <div class="toolbar">
      <el-select v-model="empId" placeholder="选择员工" style="width:220px" @change="load">
        <el-option v-for="e in emps" :key="e.id" :label="`${e.name}（${e.employeeNo}）`" :value="e.id" />
      </el-select>
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="title" label="文件名" />
      <el-table-column prop="category" label="类别" />
    </el-table>
  </div>
</template>
