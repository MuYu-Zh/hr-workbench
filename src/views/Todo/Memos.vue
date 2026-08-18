<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const content = ref('')

async function load() {
  list.value = (await db.query('memo', { sort: 'updatedAt', dir: 'desc' })).list
}

async function add() {
  if (!content.value.trim()) return
  await db.add('memo', { content: content.value.trim(), category: 'general', pinned: false })
  content.value = ''
  ElMessage.success('已保存')
  load()
}

async function remove(row) {
  await db.hardDelete('memo', row.id)
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">📝 备忘录笔记</div>
    <div class="toolbar">
      <el-input v-model="content" placeholder="新增备忘录" style="width:400px" @keyup.enter="add" />
      <el-button type="primary" @click="add">添加</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="content" label="内容" />
      <el-table-column label="操作" width="80">
        <template #default="{ row }"><el-button link type="danger" @click="remove(row)">删除</el-button></template>
      </el-table-column>
    </el-table>
  </div>
</template>
