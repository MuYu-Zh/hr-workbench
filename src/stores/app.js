import { defineStore } from 'pinia'
import { ls } from '@/services/seed'
import { getCurrentEnterpriseId } from '@/services/enterprise'

function settingsStorageKey() {
  const id = getCurrentEnterpriseId()
  return id === 'default' ? 'hr.settings' : `hr.settings.${id}`
}

const DEFAULT_SETTINGS = {
  remindDays: { contract: [60, 30], cert: 30, birthday: 7, probation: 15 },
  attendance: { lateThresholdMin: 5, defaultStart: '09:00', defaultEnd: '18:00' },
  social: {
    pension: { company: 16, personal: 8 },
    medical: { company: 9, personal: 2 },
    unemployment: { company: 0.5, personal: 0.5 },
    injury: { company: 0.4, personal: 0 },
    maternity: { company: 0.8, personal: 0 }
  },
  fund: { companyRate: 12, personalRate: 12 },
  perf: { gradeRules: [{ grade: 'S', min: 90, label: '卓越' }, { grade: 'A', min: 80, label: '优秀' }, { grade: 'B', min: 70, label: '良好' }, { grade: 'C', min: 60, label: '待改进' }, { grade: 'D', min: 0, label: '不合格' }], maxScore: 100 },
  payslip: { roundTo: 0.01 },
  attachment: { maxSizeMB: 20 }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    settings: Object.assign({}, DEFAULT_SETTINGS, ls.get(settingsStorageKey(), {})),
    profile: ls.get('hr.profile', { name: '', title: 'HR 管理', phone: '', email: '', passwordHash: '' }),
    uiState: ls.get('hr.ui.state', { openGroups: {}, active: '/dashboard' })
  }),
  actions: {
    saveSettings(patch) {
      this.settings = Object.assign({}, this.settings, patch)
      ls.set(settingsStorageKey(), this.settings)
    },
    saveProfile(patch) {
      this.profile = Object.assign({}, this.profile, patch)
      ls.set('hr.profile', this.profile)
    },
    setActive(path) {
      this.uiState.active = path
      ls.set('hr.ui.state', this.uiState)
    }
  }
})
