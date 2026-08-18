<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const profile = ref(Object.assign({}, appStore.profile))

function saveProfile() {
  appStore.saveProfile(profile.value)
  ElMessage.success('个人信息已保存')
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
</template>
