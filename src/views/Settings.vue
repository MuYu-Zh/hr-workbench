<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { chooseFolder, exportToFolder } from '@/services/filestore'
import { check, initLocalVersion } from '@/services/updater'

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
  if (info.hasUpdate) ElMessage.info(`发现新版本 ${info.latest}`)
  else ElMessage.success('当前已是最新版本')
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
    <div class="card-title">🔄 检查更新</div>
    <div class="toolbar">
      <el-button @click="checkUpdate">检查更新</el-button>
      <span v-if="updateInfo" class="muted">
        当前 {{ updateInfo.current }} · 最新 {{ updateInfo.latest }}
      </span>
    </div>
  </div>
</template>
