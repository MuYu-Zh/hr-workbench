<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { chooseFolder, exportToFolder } from '@/services/filestore'
import { check, initLocalVersion, apply } from '@/services/updater'
import { db } from '@/services/db'
import { getCurrentEnterprise } from '@/services/enterprise'

const appStore = useAppStore()
const profile = ref(Object.assign({}, appStore.profile))
const updateInfo = ref(null)

function saveProfile() {
  appStore.saveProfile(profile.value)
  ElMessage.success('个人信息已保存')
}

async function selectFolder() {
  try {
    const name = await chooseFolder()
    ElMessage.success(`已选择文件夹：${name}`)
  } catch (e) {
    ElMessage.warning(e.message || '未选择文件夹')
  }
}

async function exportNow() {
  try {
    await exportToFolder()
    ElMessage.success('已同步到存储文件夹')
  } catch (e) {
    ElMessage.warning(e.message || '请先选择存储文件夹')
  }
}

async function checkUpdate() {
  await initLocalVersion()
  const info = await check()
  updateInfo.value = info
  if (info.hasUpdate) {
    try {
      await ElMessageBox.confirm(`发现新版本 ${info.latest}，是否立即更新？`, '检查更新', { type: 'info' })
      await apply(info)
      ElMessage.success('更新完成，请刷新页面')
    } catch (e) {
      if (e !== 'cancel') ElMessage.error(e.message || '更新失败')
    }
  } else {
    ElMessage.success('当前已是最新版本')
  }
}

async function exportBackup() {
  const ent = getCurrentEnterprise()
  const stores = db.listStores().filter((s) => s !== 'attachment' && s !== 'file_store')
  const data = {
    app: 'hr_workbench',
    version: 1,
    enterpriseId: ent.id,
    enterpriseName: ent.name,
    exportedAt: new Date().toISOString(),
    stores: {}
  }
  for (const store of stores) {
    data.stores[store] = await db.getAll(store, { includeDeleted: true })
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `hr-workbench-backup-${ent.name}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  ElMessage.success('备份已导出')
}

async function importBackup(e) {
  const file = e.target.files[0]
  e.target.value = ''
  if (!file) return
  const text = await file.text()
  const data = JSON.parse(text)
  if (!data || !data.stores) { ElMessage.error('备份文件格式不正确'); return }
  const currentEnt = getCurrentEnterprise()
  if (data.enterpriseId && data.enterpriseId !== currentEnt.id) {
    try {
      await ElMessageBox.confirm(
        `备份来自“${data.enterpriseName || '其他企业'}”，恢复将覆盖当前企业“${currentEnt.name}”的数据。确定继续吗？`,
        '跨企业恢复确认',
        { type: 'warning', confirmButtonText: '覆盖恢复', cancelButtonText: '取消' }
      )
    } catch (err) {
      if (err !== 'cancel') ElMessage.error(err.message || '恢复取消')
      return
    }
  }
  for (const store of Object.keys(data.stores)) {
    if (store === 'attachment' || store === 'file_store') continue
    await db.clear(store)
    if (data.stores[store].length) await db.bulkAdd(store, data.stores[store])
  }
  ElMessage.success('备份已恢复')
}
</script>

<template>
  <div class="card">
    <div class="card-title">⚙️ 系统设置</div>
    <el-form label-width="100px" style="max-width:520px">
      <el-form-item label="姓名"><el-input v-model="profile.name" /></el-form-item>
      <el-form-item label="职位"><el-input v-model="profile.title" /></el-form-item>
      <el-form-item label="手机"><el-input v-model="profile.phone" /></el-form-item>
      <el-form-item label="邮箱"><el-input v-model="profile.email" /></el-form-item>
      <el-form-item>
        <el-button type="primary" @click="saveProfile">保存个人信息</el-button>
      </el-form-item>
    </el-form>
  </div>

  <div class="card">
    <div class="card-title">💾 文件存储模式</div>
    <div class="toolbar">
      <el-button @click="selectFolder">选择存储文件夹</el-button>
      <el-button type="primary" @click="exportNow">立即同步数据</el-button>
    </div>
  </div>

  <div class="card">
    <div class="card-title">🗂 数据备份 / 恢复</div>
    <div class="toolbar">
      <el-button @click="exportBackup">导出备份</el-button>
      <el-button @click="$refs.backupFile.click()">恢复备份</el-button>
      <input ref="backupFile" type="file" accept=".json" style="display:none" @change="importBackup" />
    </div>
  </div>

  <div class="card">
    <div class="card-title">🔄 检查更新</div>
    <div class="toolbar">
      <el-button @click="checkUpdate">检查更新</el-button>
      <span v-if="updateInfo" class="muted">
        当前 {{ updateInfo.current }} · 最新 {{ updateInfo.latest }}
      </span>
    </div>
  </div>
</template>
