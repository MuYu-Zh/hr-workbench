<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const content = ref('')
const priority = ref('medium')
const today = new Date().toISOString().slice(0, 10)

async function load() {
  const r = await db.query('todo', { filter: (t) => t.date === today && !t.done, sort: 'priority', dir: 'desc', sortMap: { high: 3, medium: 2, low: 1 } })
  list.value = r.list
}

async function add() {
  if (!content.value.trim()) return
  await db.add('todo', { content: content.value.trim(), date: today, priority: priority.value, done: false })
  content.value = ''
  ElMessage.success('已添加')
  load()
}

async function done(row) {
  await db.put('todo', Object.assign({}, row, { done: true }))
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">✅ 人事每日待办事项</div>
    <div class="toolbar">
      <el-input v-model="content" placeholder="新增待办" style="width:300px" @keyup.enter="add" />
      <el-select v-model="priority" style="width:100px">
        <el-option label="高" value="high" />
        <el-option label="中" value="medium" />
        <el-option label="低" value="low" />
      </el-select>
      <el-button type="primary" @click="add">添加</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="content" label="内容" />
      <el-table-column label="优先级" width="100">
        <template #default="{ row }">{{ { high: '高', medium: '中', low: '低' }[row.priority] }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }"><el-button link type="success" @click="done(row)">完成</el-button></template>
      </el-table-column>
    </el-table>
  </div>
</template>
