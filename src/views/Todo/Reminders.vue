<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const form = ref({ content: '', remindAt: '', status: 'pending' })
const dialogVisible = ref(false)

async function load() {
  list.value = (await db.query('reminder', { sort: 'remindAt', dir: 'asc' })).list
}

async function save() {
  if (!form.value.content || !form.value.remindAt) { ElMessage.warning('请填写内容和提醒时间'); return }
  await db.add('reminder', Object.assign({}, form.value, { done: false }))
  ElMessage.success('已创建')
  dialogVisible.value = false
  form.value = { content: '', remindAt: '', status: 'pending' }
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">🔔 重要事项标记提醒</div>
    <div class="toolbar">
      <el-button type="primary" @click="dialogVisible = true">＋ 新增提醒</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="content" label="内容" />
      <el-table-column prop="remindAt" label="提醒时间" width="160" />
      <el-table-column prop="status" label="状态" width="100" />
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" title="新增提醒" width="420px">
    <el-form label-width="80px">
      <el-form-item label="内容"><el-input v-model="form.content" /></el-form-item>
      <el-form-item label="提醒时间"><el-date-picker v-model="form.remindAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
