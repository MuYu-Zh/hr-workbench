<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '@/services/db'

const treeData = ref([])
const previewVisible = ref(false)
const dialogVisible = ref(false)
const form = ref({ name: '', parentId: '', sortOrder: 0, status: 'normal' })
const editingId = ref(null)
const parentOptions = ref([])

function buildTree(list) {
  const map = {}
  const roots = []
  list.forEach((d) => { d.children = []; map[d.id] = d })
  list.forEach((d) => {
    if (d.parentId && map[d.parentId]) map[d.parentId].children.push(d)
    else roots.push(d)
  })
  const sort = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    nodes.forEach((n) => sort(n.children))
  }
  sort(roots)
  return roots
}

async function load() {
  const list = await db.getAll('department')
  treeData.value = buildTree(list)
}

function openAdd(parentId) {
  editingId.value = null
  form.value = { name: '', parentId: parentId || '', sortOrder: 0, status: 'normal' }
  dialogVisible.value = true
}

async function openEdit(node) {
  const all = await db.getAll('department')
  const descendants = []
  const walk = (pid) => all.forEach((d) => { if (d.parentId === pid && descendants.indexOf(d.id) < 0) { descendants.push(d.id); walk(d.id) } })
  walk(node.id)
  const exclude = [node.id].concat(descendants)
  parentOptions.value = all.filter((d) => exclude.indexOf(d.id) < 0).map((d) => ({ value: d.id, label: d.name + (d.status === 'disabled' ? '（停用）' : '') }))
  editingId.value = node.id
  form.value = { name: node.name, parentId: node.parentId || '', sortOrder: node.sortOrder || 0, status: node.status || 'normal' }
  dialogVisible.value = true
}

async function save() {
  if (!form.value.name.trim()) { ElMessage.warning('组织名称不能为空'); return }
  const rec = {
    name: form.value.name.trim(),
    parentId: form.value.parentId || null,
    sortOrder: Number(form.value.sortOrder) || 0,
    status: form.value.status
  }
  if (editingId.value) {
    await db.put('department', Object.assign({ id: editingId.value }, rec))
    ElMessage.success('组织已更新')
  } else {
    await db.add('department', rec)
    ElMessage.success('组织已创建')
  }
  dialogVisible.value = false
  load()
}

async function toggleStatus(node) {
  await db.put('department', Object.assign({}, node, { status: node.status === 'disabled' ? 'normal' : 'disabled' }))
  load()
}

async function remove(node) {
  const [emps, depts] = await Promise.all([db.getAll('employee'), db.getAll('department')])
  if (emps.some((e) => e.departmentId === node.id)) { ElMessage.warning('该组织下存在员工，请先调整员工部门'); return }
  if (depts.some((d) => d.parentId === node.id)) { ElMessage.warning('该组织存在子组织，请先移动或删除子组织'); return }
  await ElMessageBox.confirm(`确定删除组织「${node.name}」吗？`, '删除组织', { type: 'warning' })
  await db.hardDelete('department', node.id)
  ElMessage.success('组织已删除')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">
      <span>🏢 组织架构</span>
      <span class="t-sub">维护公司组织树，并预览组织结构图</span>
    </div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd(null)">＋ 新增顶级组织</el-button>
      <el-button @click="previewVisible = true">🗂 预览组织结构图</el-button>
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-tree :data="treeData" node-key="id" default-expand-all :expand-on-click-node="false">
      <template #default="{ data }">
        <div class="tree-node">
          <span>{{ data.name }}</span>
          <el-tag v-if="data.status === 'disabled'" size="small" type="info">停用</el-tag>
          <span class="tree-actions">
            <el-button link type="primary" size="small" @click="openAdd(data.id)">＋子级</el-button>
            <el-button link type="primary" size="small" @click="openEdit(data)">编辑</el-button>
            <el-button link size="small" @click="toggleStatus(data)">{{ data.status === 'disabled' ? '启用' : '停用' }}</el-button>
            <el-button link type="danger" size="small" @click="remove(data)">删除</el-button>
          </span>
        </div>
      </template>
    </el-tree>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑组织' : '新增组织'" width="420px">
      <el-form label-width="80px">
        <el-form-item label="组织名称" required>
          <el-input v-model="form.name" placeholder="请输入组织名称" />
        </el-form-item>
        <el-form-item label="上级组织">
          <el-select v-model="form.parentId" clearable placeholder="（顶级）" style="width:100%">
            <el-option v-for="opt in parentOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="正常" value="normal" />
            <el-option label="停用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="🏢 组织架构图" fullscreen>
      <el-tree :data="treeData" node-key="id" default-expand-all :expand-on-click-node="false">
        <template #default="{ data }">
          <span>{{ data.name }}</span>
          <el-tag v-if="data.status === 'disabled'" size="small" type="info" style="margin-left:8px">停用</el-tag>
        </template>
      </el-tree>
    </el-dialog>
  </div>
</template>

<style scoped>
.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 8px;
}
.tree-actions { margin-left: auto; display: none; }
.tree-node:hover .tree-actions { display: inline-flex; gap: 4px; }
</style>
