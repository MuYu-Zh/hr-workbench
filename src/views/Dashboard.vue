<script setup>
import { ref, onMounted } from 'vue'
import { db } from '@/services/db'

const stats = ref({ active: 0, resigning: 0, resigned: 0, total: 0 })
const today = new Date().toISOString().slice(0, 10)
const todos = ref([])

onMounted(async () => {
  const emps = await db.getAll('employee')
  stats.value = {
    active: emps.filter((e) => e.status === 'active').length,
    resigning: emps.filter((e) => e.status === 'resigning').length,
    resigned: emps.filter((e) => e.status === 'resigned').length,
    total: emps.length
  }
  const todoList = await db.query('todo', { filter: (t) => t.date === today && !t.done, sort: 'priority', dir: 'desc', sortMap: { high: 3, medium: 2, low: 1 } })
  todos.value = todoList.list
})
</script>

<template>
  <div>
    <div class="grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">
      <el-card shadow="never">
        <div class="stat-label">在职人数</div>
        <div class="stat-value">{{ stats.active }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">本月入职</div>
        <div class="stat-value">—</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">离职交接中</div>
        <div class="stat-value">{{ stats.resigning }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">已离职</div>
        <div class="stat-value">{{ stats.resigned }}</div>
      </el-card>
    </div>
    <el-card shadow="never" style="margin-top:16px">
      <template #header>今日待办</template>
      <el-empty v-if="todos.length === 0" description="今日待办已清空" :image-size="80" />
      <el-table v-else :data="todos" size="small">
        <el-table-column prop="content" label="内容" />
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">{{ { high: '高', medium: '中', low: '低' }[row.priority] || row.priority }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.stat-label { font-size: 13px; color: #8a9098; }
.stat-value { font-size: 28px; font-weight: 700; margin-top: 6px; }
</style>
