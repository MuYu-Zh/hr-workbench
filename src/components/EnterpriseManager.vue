<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getEnterprises,
  getArchivedEnterprises,
  getCurrentEnterpriseId,
  createEnterprise,
  renameEnterprise,
  archiveEnterprise,
  restoreEnterprise
} from '@/services/enterprise'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'changed', 'created'])

const activeList = ref([])
const archivedList = ref([])
const currentId = ref(getCurrentEnterpriseId())
const newName = ref('')
const editingId = ref(null)
const editingName = ref('')

function load() {
  activeList.value = getEnterprises()
  archivedList.value = getArchivedEnterprises()
  currentId.value = getCurrentEnterpriseId()
}

watch(() => props.modelValue, (v) => {
  if (v) load()
})

async function handleCreate() {
  try {
    const ent = createEnterprise(newName.value)
    newName.value = ''
    load()
    emit('changed')
    emit('created', ent.id)
  } catch (e) {
    ElMessage.warning(e.message || '创建失败')
  }
}

function startRename(ent) {
  editingId.value = ent.id
  editingName.value = ent.name
}

async function handleRename() {
  try {
    renameEnterprise(editingId.value, editingName.value)
    editingId.value = null
    editingName.value = ''
    load()
    emit('changed')
    ElMessage.success('企业已重命名')
  } catch (e) {
    ElMessage.warning(e.message || '重命名失败')
  }
}

async function handleArchive(ent) {
  try {
    await ElMessageBox.confirm(
      `归档后“${ent.name}”将从企业列表移除，但本地数据仍会保留。确定归档吗？`,
      '归档企业',
      { type: 'warning', confirmButtonText: '归档', cancelButtonText: '取消' }
    )
    archiveEnterprise(ent.id)
    load()
    emit('changed')
    ElMessage.success('企业已归档')
  } catch (e) {
    if (e !== 'cancel') ElMessage.warning(e.message || '归档失败')
  }
}

async function handleRestore(ent) {
  try {
    restoreEnterprise(ent.id)
    load()
    emit('changed')
    ElMessage.success('企业已恢复')
  } catch (e) {
    ElMessage.warning(e.message || '恢复失败')
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="🏢 企业管理"
    width="560px"
    @update:model-value="emit('update:modelValue', $event)"
    @close="close"
  >
    <div class="enterprise-manager">
      <div class="section">
        <div class="section-title">新增企业</div>
        <div class="create-row">
          <el-input v-model="newName" placeholder="输入企业名称" clearable @keyup.enter="handleCreate" />
          <el-button type="primary" @click="handleCreate">创建</el-button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">企业列表</div>
        <div v-if="activeList.length" class="ent-list">
          <div v-for="ent in activeList" :key="ent.id" class="ent-item">
            <div class="ent-info">
              <span class="ent-name">{{ ent.name }}</span>
              <el-tag v-if="ent.id === currentId" size="small" type="success">当前</el-tag>
            </div>
            <div class="ent-actions">
              <template v-if="editingId === ent.id">
                <el-input v-model="editingName" size="small" style="width: 180px" @keyup.enter="handleRename" />
                <el-button size="small" type="primary" @click="handleRename">保存</el-button>
                <el-button size="small" @click="editingId = null">取消</el-button>
              </template>
              <template v-else>
                <el-button size="small" @click="startRename(ent)">重命名</el-button>
                <el-button
                  v-if="ent.id !== currentId"
                  size="small"
                  type="danger"
                  plain
                  @click="handleArchive(ent)"
                >归档</el-button>
              </template>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无企业" :image-size="60" />
      </div>

      <div v-if="archivedList.length" class="section">
        <div class="section-title">已归档企业</div>
        <div class="ent-list">
          <div v-for="ent in archivedList" :key="ent.id" class="ent-item archived">
            <div class="ent-info">
              <span class="ent-name">{{ ent.name }}</span>
              <el-tag size="small" type="info">已归档</el-tag>
            </div>
            <div class="ent-actions">
              <el-button size="small" type="primary" plain @click="handleRestore(ent)">恢复</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.enterprise-manager { display: flex; flex-direction: column; gap: 18px; }
.section-title { font-weight: 600; margin-bottom: 10px; color: #333; }
.create-row { display: flex; gap: 8px; }
.ent-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
.ent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}
.ent-item.archived { background: #fafafa; }
.ent-info { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ent-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ent-actions { display: flex; align-items: center; gap: 6px; }
</style>
