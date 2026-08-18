<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { db } from '@/services/db'

const list = ref([])
const candidates = ref([])
const candidateMap = ref({})
const dialogVisible = ref(false)
const editing = ref(null)
const form = ref({})

async function load() {
  const [interviews, cands] = await Promise.all([db.getAll('interview'), db.getAll('candidate')])
  candidates.value = cands.map((c) => ({ value: c.id, label: `${c.name}（${c.appliedPosition || '未填岗位'}）` }))
  cands.forEach((c) => { candidateMap.value[c.id] = c })
  list.value = interviews.sort((a, b) => (b.interviewDate || '').localeCompare(a.interviewDate || ''))
}

function openAdd() {
  editing.value = null
  form.value = { round: 1, method: 'onsite', result: 'pending', interviewDate: '' }
  dialogVisible.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = Object.assign({}, row)
  dialogVisible.value = true
}

async function save() {
  if (!form.value.candidateId) { ElMessage.warning('请选择候选人'); return }
  const rec = Object.assign({}, editing.value || {}, form.value, { round: Number(form.value.round) || 1 })
  if (editing.value) await db.put('interview', rec)
  else await db.add('interview', rec)

  // 面试结果联动候选人状态
  const cand = candidateMap.value[form.value.candidateId]
  if (cand) {
    const nextStatus = form.value.result === 'pass' ? 'hired' : form.value.result === 'fail' ? 'rejected' : cand.status
    if (nextStatus !== cand.status) {
      await db.put('candidate', Object.assign({}, cand, { status: nextStatus }))
      ElMessage.success('候选人状态已联动更新')
    }
  }
  ElMessage.success('面试记录已保存')
  dialogVisible.value = false
  load()
}

async function remove(row) {
  await db.hardDelete('interview', row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">🎤 面试记录与进度跟踪</div>
    <div class="toolbar">
      <el-button type="primary" @click="openAdd">＋ 新增面试记录</el-button>
      <span class="spacer" />
      <el-button @click="load">⟳ 刷新</el-button>
    </div>
    <el-table :data="list">
      <el-table-column label="候选人" min-width="120">
        <template #default="{ row }">{{ candidateMap[row.candidateId]?.name || '—' }}</template>
      </el-table-column>
      <el-table-column prop="round" label="轮次" width="70" />
      <el-table-column prop="interviewer" label="面试官" width="110" />
      <el-table-column prop="interviewDate" label="面试日期" width="110" />
      <el-table-column label="方式" width="90">
        <template #default="{ row }">{{ { onsite: '现场', video: '视频', phone: '电话' }[row.method] || row.method }}</template>
      </el-table-column>
      <el-table-column label="结果" width="90">
        <template #default="{ row }">
          <el-tag :type="row.result === 'pass' ? 'success' : row.result === 'fail' ? 'danger' : 'warning'">{{ { pass: '通过', pending: '待定', fail: '不通过' }[row.result] || row.result }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="nextStep" label="下一轮安排" min-width="140" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <el-dialog v-model="dialogVisible" :title="editing ? '编辑面试记录' : '新增面试记录'" width="560px">
    <el-form label-width="90px">
      <el-form-item label="候选人" required>
        <el-select v-model="form.candidateId" filterable style="width:100%">
          <el-option v-for="c in candidates" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="轮次"><el-input-number v-model="form.round" :min="1" :max="10" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="面试官"><el-input v-model="form.interviewer" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="面试日期"><el-date-picker v-model="form.interviewDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="面试方式"><el-select v-model="form.method" style="width:100%"><el-option label="现场" value="onsite" /><el-option label="视频" value="video" /><el-option label="电话" value="phone" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="结果"><el-select v-model="form.result" style="width:100%"><el-option label="通过" value="pass" /><el-option label="待定" value="pending" /><el-option label="不通过" value="fail" /></el-select></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="评价"><el-input v-model="form.comment" type="textarea" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="下一轮安排"><el-input v-model="form.nextStep" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
