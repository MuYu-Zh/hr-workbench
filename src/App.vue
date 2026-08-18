<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { menu } from '@/router'
import { db } from '@/services/db'
import { seedIfEmpty } from '@/services/seed'
import { useAppStore } from '@/stores/app'
import { notifyChange, restore } from '@/services/filestore'
import { initLocalVersion } from '@/services/updater'

const route = useRoute()
const appStore = useAppStore()

const todayText = computed(() => {
  const now = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} 星期${week}`
})

const userText = computed(() => '👤 ' + (appStore.profile.name || '本地用户'))

onMounted(async () => {
  try {
    await db.open()
    await seedIfEmpty()
    db.onChange(() => notifyChange())
    await restore()
    await initLocalVersion()
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    }
  } catch (e) {
    console.error('初始化失败', e)
  }
})
</script>

<template>
  <el-container class="app-shell">
    <el-aside width="240px" class="sidebar">
      <div class="brand">
        <div class="brand-mark">HR</div>
        <div class="brand-text">
          <div class="brand-title">人事工作台</div>
          <div class="brand-sub">个人版 · 本机存储</div>
        </div>
      </div>
      <el-menu
        class="side-menu"
        :default-active="route.path"
        router
        background-color="transparent"
        text-color="rgba(255,255,255,0.78)"
        active-text-color="#fff"
      >
        <template v-for="item in menu" :key="item.path || item.label">
          <el-menu-item v-if="!item.children" :index="item.path">
            <span class="menu-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </el-menu-item>
          <el-sub-menu v-else :index="item.label">
            <template #title>
              <span class="menu-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
              {{ child.label }}
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-aside>
    <el-container class="main-col">
      <el-header class="topbar">
        <div class="topbar-left">
          <h1>{{ route.meta.title || '人事工作台' }}</h1>
          <span class="crumb">{{ route.meta.crumb || '' }}</span>
        </div>
        <div class="topbar-right">
          <span class="today">{{ todayText }}</span>
          <span class="divider">|</span>
          <span class="user-chip">{{ userText }}</span>
        </div>
      </el-header>
      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-shell {
  height: 100vh;
}
.sidebar {
  background: linear-gradient(160deg, #13201c 0%, #0a100e 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
}
.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #d9a441, #b07f2a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 15px;
}
.brand-title { font-size: 15px; font-weight: 600; letter-spacing: 1px; }
.brand-sub { font-size: 11px; opacity: 0.65; margin-top: 2px; }
.side-menu {
  border-right: none;
  flex: 1;
}
.side-menu :deep(.el-menu-item),
.side-menu :deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  font-size: 14px;
}
.menu-icon { margin-right: 8px; }
.main-col { min-width: 0; }
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  height: 60px;
}
.topbar-left { display: flex; align-items: baseline; gap: 12px; }
.topbar-left h1 { font-size: 17px; margin: 0; }
.crumb { font-size: 12px; color: #8a9098; }
.topbar-right { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #555; }
.divider { color: #ccc; }
.content {
  background: #f5f6f4;
  padding: 20px;
  overflow-y: auto;
}
</style>
