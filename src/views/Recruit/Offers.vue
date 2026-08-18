<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const candidates = ref([])
const candidateMap = ref({})
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({})

const statusLabels = { issued: '已发放', accepted: '已接受', rejected: '已拒绝', expired: '已过期' }

async function load() {
  const [offers, cands] = await Promise.all([db.getAll('offer'), db.getAll('candidate')])
  candidates.value = cands.map((c) => ({ value: c.id, label: `${c.name}（${c.appliedPosition || '未填岗位'}）` }))
  cands.forEach((c) => { candidateMap.value[c.id] = c })
  list.value = offers.sort((a, b) => (b.offerDate || '').localeCompare(a.offerDate || ''))
}

function openAdd() {
  editing.value = null
  form.value = { offerDate: '', status: 'issued', salary: { base: 0, performance: 0, allowance: 0 } }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row, { salary: Object.assign({ base: 0, performance: 0, allowance: 0 }, row.salary || {}) })
  dialogVisible.value = true
}

async function save() {
  if (!form.value.candidateId) { ElMessage.warning('请选择候选人'); return }
  const rec = Object.assign({}, editing.value || {}, form.value)
  if (editing.value) await db.put('offer', rec)
  else await db.add('offer', rec)
  ElMessage.success('offer 已保存')
  dialogVisible.value = false
  load()
}

async function changeStatus(row, status) {
  if (status === 'accepted') {
    await ElMessageBox.confirm(
      '该 offer 已接受。请到“员工档案管理”手动创建员工档案。',
      '提示',
      { confirmButtonText: '我知道了', showCancelButton: false, type: 'success' }
    )
  }
  await db.put('offer', Object.assign({}, row, { status }))
  ElMessage.success('状态已更新')
  load()
}

async function remove(row) {
  await ElMessageBox.confirm('确定删除该 offer 记录吗？', '删除', { type: 'warning' })
  await db.hardDelete('offer', row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">📩 offer 发放记录</div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">＋ 新增 offer</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column label="候选人" min-width="120">
        <template #default="{ row }">{{ candidateMap[row.candidateId]?.name || '—' }}</template>
      </el-table-column>
      <el-table-column prop="positionName" label="应聘岗位" min-width="120" />
      <el-table-column prop="offerDate" label="offer 日期" width="110" />
      <el-table-column label="薪资构成" min-width="180">
        <template #default="{ row }">
          <span class="muted">底薪 {{ row.salary?.base || 0 }} / 绩效 {{ row.salary?.performance || 0 }} / 补贴 {{ row.salary?.allowance || 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="onboardDate" label="入职日期" width="110" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'accepted' ? 'success' : row.status === 'rejected' ? 'danger' : row.status === 'expired' ? 'info' : 'warning'">{{ statusLabels[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status === 'issued'" link type="success" @click="changeStatus(row, 'accepted')">接受</el-button>
          <el-button v-if="row.status === 'issued'" link type="danger" @click="changeStatus(row, 'rejected')">拒绝</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑 offer' : '新增 offer'" width="560px">
    <el-form label-width="90px">
      <el-form-item label="候选人" required>
        <el-select v-model="form.candidateId" filterable style="width:100%">
          <el-option v-for="c in candidates" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="应聘岗位"><el-input v-model="form.positionName" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="offer 日期"><el-date-picker v-model="form.offerDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="底薪"><el-input-number v-model="form.salary.base" :min="0" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="绩效"><el-input-number v-model="form.salary.performance" :min="0" /></el-form-item></el-col>
        <el-col :span="8"><el-form-item label="补贴"><el-input-number v-model="form.salary.allowance" :min="0" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="入职日期"><el-date-picker v-model="form.onboardDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="有效期至"><el-date-picker v-model="form.expireDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="状态"><el-select v-model="form.status" style="width:100%"><el-option v-for="(label, value) in statusLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
