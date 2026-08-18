import { db } from './db'

function isWeekday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const day = d.getDay()
  return day >= 1 && day <= 5
}

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function monthDates(month) {
  const count = daysInMonth(month)
  const dates = []
  for (let i = 1; i <= count; i++) {
    dates.push(`${month}-${String(i).padStart(2, '0')}`)
  }
  return dates
}

export async function generateMonthly(month) {
  const [emps, punches, schedules, requests, anomalies] = await Promise.all([
    db.getAll('employee'),
    db.getAllByIndex('attendance_punch', 'month', month),
    db.getAll('schedule'),
    db.getAll('attendance_request'),
    db.getAll('attendance_anomaly')
  ])

  const scheduleMap = {}
  schedules.forEach((s) => {
    if (s.workDate && s.workDate.startsWith(month)) {
      const key = `${s.employeeId}_${s.workDate}`
      scheduleMap[key] = s
    }
  })

  const punchMap = {}
  punches.forEach((p) => {
    const key = `${p.employeeId}_${p.workDate}`
    if (!punchMap[key]) punchMap[key] = []
    punchMap[key].push(p)
  })

  const reqs = requests.filter((r) => r.status === 'approved')
  const anoms = anomalies.filter((a) => !a.handled)

  let generated = 0
  let updated = 0

  for (const emp of emps) {
    const existing = await db.get('attendance_monthly', `attendance_monthly_${emp.id}_${month}`)
    if (existing && existing.manualAdjusted) { updated++; continue }

    const dates = monthDates(month)
    let expectedDays = 0
    let actualDays = 0
    let lateCount = 0
    let earlyCount = 0
    let absentDays = 0
    let leaveDays = 0
    let overtimeHours = 0
    let tripDays = 0

    for (const dateStr of dates) {
      const sched = scheduleMap[`${emp.id}_${dateStr}`]
      const isWorkday = sched ? true : isWeekday(dateStr)
      if (isWorkday) expectedDays++

      const punchesOfDay = punchMap[`${emp.id}_${dateStr}`] || []
      if (punchesOfDay.length && punchesOfDay.some((p) => p.onTime || p.offTime)) actualDays++

      if (sched && punchesOfDay.length) {
        const p = punchesOfDay[0]
        if (sched.shiftStart && p.onTime && p.onTime > sched.shiftStart) lateCount++
        if (sched.shiftEnd && p.offTime && p.offTime < sched.shiftEnd) earlyCount++
      }
    }

    const empReqs = reqs.filter((r) => r.employeeId === emp.id)
    empReqs.forEach((r) => {
      if (r.type === 'leave') leaveDays += Number(r.duration) || 0
      if (r.type === 'overtime') overtimeHours += Number(r.duration) || 0
      if (r.type === 'business_trip') tripDays += Number(r.duration) || 0
    })

    const anomalyCount = anoms.filter((a) => a.employeeId === emp.id).length

    const rec = {
      id: `attendance_monthly_${emp.id}_${month}`,
      employeeId: emp.id,
      month,
      expectedDays,
      actualDays,
      lateCount,
      earlyCount,
      lateEarlyCount: existing ? existing.lateEarlyCount || 0 : 0,
      absentDays,
      leaveDays,
      leaveHours: existing ? existing.leaveHours || 0 : 0,
      leaveBreakdown: existing ? existing.leaveBreakdown : undefined,
      overtimeHours,
      tripDays,
      anomalyCount,
      manualAdjusted: false,
      source: 'auto'
    }
    if (existing) { await db.put('attendance_monthly', rec); updated++ }
    else { await db.add('attendance_monthly', rec); generated++ }
  }

  return { generated, updated }
}

export default { generateMonthly }
