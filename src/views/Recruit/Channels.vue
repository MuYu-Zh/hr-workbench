<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { db } from '@/services/db'

const table = ref([])
const chartEl = ref(null)

async function load() {
  const [cands, interviews, dicts] = await Promise.all([
    db.getAll('candidate'),
    db.getAll('interview'),
    db.getAllByIndex('sys_dict', 'group', 'recruit_channel')
  ])
  const channels = dicts.map((d) => ({ value: d.value, label: d.label, resume: 0, interview: 0, hired: 0, onboarded: 0 }))
  const interviewedIds = new Set(interviews.map((i) => i.candidateId))
  cands.forEach((c) => {
    const ch = channels.find((x) => x.value === c.source)
    if (!ch) return
    ch.resume++
    if (interviewedIds.has(c.id)) ch.interview++
    if (c.status === 'hired') ch.hired++
    if (c.status === 'onboarded') ch.onboarded++
  })
  channels.forEach((c) => { c.resumeRate = c.resume ? '100%' : '0%'; c.interviewRate = c.resume ? Math.round(c.interview / c.resume * 100) + '%' : '0%'; c.hireRate = c.resume ? Math.round(c.hired / c.resume * 100) + '%' : '0%'; c.onboardRate = c.resume ? Math.round(c.onboarded / c.resume * 100) + '%' : '0%' })
  table.value = channels

  await nextTick()
  if (chartEl.value) {
    const chart = echarts.init(chartEl.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['简历数', '面试数', '录用数', '入职数'] },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: channels.map((c) => c.label) },
      yAxis: { type: 'value' },
      series: [
        { name: '简历数', type: 'bar', data: channels.map((c) => c.resume) },
        { name: '面试数', type: 'bar', data: channels.map((c) => c.interview) },
        { name: '录用数', type: 'bar', data: channels.map((c) => c.hired) },
        { name: '入职数', type: 'bar', data: channels.map((c) => c.onboarded) }
      ]
    })
  }
}

onMounted(load)
</script>

<template>
  <div class="card">
    <div class="card-title">📊 招聘渠道统计</div>
    <div ref="chartEl" style="height:320px;width:100%"></div>
    <el-table :data="table" style="margin-top:16px">
      <el-table-column prop="label" label="渠道" min-width="120" />
      <el-table-column prop="resume" label="简历数" width="90" />
      <el-table-column prop="interview" label="面试数" width="90" />
      <el-table-column prop="hired" label="录用数" width="90" />
      <el-table-column prop="onboarded" label="入职数" width="90" />
      <el-table-column prop="interviewRate" label="简历→面试" width="110" />
      <el-table-column prop="hireRate" label="简历→录用" width="110" />
      <el-table-column prop="onboardRate" label="简历→入职" width="110" />
    </el-table>
  </div>
</template>
