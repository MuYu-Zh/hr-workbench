<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const dialogVisible = ref(false)
const form = ref({ name: '', url: '', category: 'other', icon: '🔗' })

async function load() {
  list.value = (await db.query('quick_link', { sort: 'sortOrder', dir: 'asc' })).list
}

async function save() {
  if (!form.value.name || !form.value.url) { ElMessage.warning('名称和网址不能为空'); return }
  await db.add('quick_link', Object.assign({}, form.value))
  ElMessage.success('已添加')
  dialogVisible.value = false
  form.value = { name: '', url: '', category: 'other', icon: '🔗' }
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">🔗 常用网址</div>
    <div class="toolbar">
      <el-button type="primary" @click="dialogVisible = true">＋ 新增网址</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column prop="icon" label="" width="50" />
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column label="网址" min-width="240">
        <template #default="{ row }"><a :href="row.url" target="_blank" rel="noreferrer">{{ row.url }}</a></template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="120" />
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" title="新增常用网址" width="480px">
    <el-form label-width="80px">
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="网址"><el-input v-model="form.url" /></el-form-item>
      <el-form-item label="图标"><el-input v-model="form.icon" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
