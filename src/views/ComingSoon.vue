<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="card coming-soon">
    <div class="coming-icon">🚧</div>
    <div class="coming-title">{{ route.meta.title || '模块规划中' }}</div>
    <div class="coming-desc">该模块已列入需求规划，将在后续版本实现。</div>
    <el-button type="primary" plain @click="$router.push('/dashboard')">返回工作总览</el-button>
  </div>
</template>

<style scoped>
.coming-soon {
  text-align: center;
  padding: 80px 20px;
}
.coming-icon {
  font-size: 52px;
  margin-bottom: 16px;
}
.coming-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}
.coming-desc {
  color: #8a9098;
  margin-bottom: 24px;
}
</style>
