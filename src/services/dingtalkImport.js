import * as XLSX from 'xlsx'
import { db } from './db'

function findHeader(row, keywords) {
  const keys = Object.keys(row || {})
  for (const key of keys) {
    const k = String(key || '').trim()
    if (keywords.some((kw) => k.includes(kw))) return key
  }
  return null
}

function toDateStr(val) {
  if (!val && val !== 0) return ''
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(val).trim().slice(0, 10)
}

function toTimeStr(val) {
  if (!val && val !== 0) return ''
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`
  }
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60)
    const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')
    const m = String(totalMinutes % 60).padStart(2, '0')
    return `${h}:${m}`
  }
  return String(val).trim()
}

function detectType(row) {
  const keys = Object.keys(row || {}).map((k) => String(k || ''))
  if (keys.some((k) => k.includes('出勤') || k.includes('迟到') || k.includes('早退'))) return 'monthly'
  if (keys.some((k) => k.includes('日期') || k.includes('上班') || k.includes('下班'))) return 'punch'
  return 'unknown'
}

function monthFromSheetName(name) {
  const m = String(name || '').match(/(\d{4})\s*年\s*(\d{1,2})\s*月/)
  if (!m) return ''
  return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}`
}

export async function importDingtalkAttendance(file) {
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const sheetMonth = monthFromSheetName(wb.SheetNames[0])
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
  if (!rows.length) return { type: 'unknown', rows: 0, added: 0, updated: 0, unmatched: [], failed: [] }

  const type = detectType(rows[0])
  const emps = await db.getAll('employee')
  const byNo = {}
  const byName = {}
  emps.forEach((e) => { if (e.employeeNo) byNo[String(e.employeeNo).trim()] = e; if (e.name) byName[e.name.trim()] = e })

  let added = 0
  let updated = 0
  const unmatched = []
  const failed = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNo = i + 2
    const noKey = findHeader(row, ['工号', '员工编号'])
    const nameKey = findHeader(row, ['姓名'])
    const noVal = noKey ? String(row[noKey] || '').trim() : ''
    const nameVal = nameKey ? String(row[nameKey] || '').trim() : ''
    let emp = noVal ? byNo[noVal] : null
    if (!emp && nameVal) emp = byName[nameVal]
    if (!emp) {
      unmatched.push({ line: lineNo, name: nameVal, employeeNo: noVal })
      continue
    }

    try {
      if (type === 'punch') {
        const dateKey = findHeader(row, ['日期'])
        const onKey = findHeader(row, ['上班'])
        const offKey = findHeader(row, ['下班'])
        const dateStr = toDateStr(dateKey ? row[dateKey] : '')
        if (!dateStr) { failed.push({ line: lineNo, reason: '缺少日期' }); continue }
        const punchId = `attendance_punch_${emp.id}_${dateStr}`
        const existing = await db.get('attendance_punch', punchId)
        const rec = Object.assign({}, existing || {}, {
          id: punchId,
          employeeId: emp.id,
          workDate: dateStr,
          month: dateStr.slice(0, 7),
          onTime: onKey ? toTimeStr(row[onKey]) : (existing ? existing.onTime : ''),
          offTime: offKey ? toTimeStr(row[offKey]) : (existing ? existing.offTime : ''),
          source: 'dingtalk'
        })
        await db.put('attendance_punch', rec)
        if (existing) updated++; else added++
      } else if (type === 'monthly') {
        const monthKey = findHeader(row, ['月份', '统计月份'])
        const month = monthKey ? String(row[monthKey] || '').trim().slice(0, 7) : sheetMonth
        if (!/^\d{4}-\d{2}$/.test(month)) { failed.push({ line: lineNo, reason: '缺少月份或格式不正确' }); continue }
        const monthlyId = `attendance_monthly_${emp.id}_${month}`
        const existing = await db.get('attendance_monthly', monthlyId)
        const num = (keys) => {
          const key = findHeader(row, keys)
          const v = key ? Number(row[key]) : 0
          return isNaN(v) ? 0 : v
        }
        const leaveBreakdown = {
          shiJia: num(['事假']),
          bingJia: num(['病假']),
          nianJia: num(['年假']),
          tiaoXiu: num(['调休']),
          other: num(['其他假别'])
        }
        const rec = Object.assign({}, existing || {}, {
          id: monthlyId,
          employeeId: emp.id,
          month,
          expectedDays: num(['应出勤', '出勤天数']),
          actualDays: num(['实际出勤', '出勤天数']),
          lateCount: num(['迟到']),
          earlyCount: num(['早退']),
          lateEarlyCount: num(['迟到早退次数']),
          absentDays: num(['漏打卡次数', '缺卡', '旷工']),
          leaveDays: num(['请假天数', '请假']),
          leaveHours: num(['请假时数']),
          leaveBreakdown,
          overtimeHours: num(['本月加班累计', '加班']),
          tripDays: num(['出差']),
          source: 'dingtalk'
        })
        await db.put('attendance_monthly', rec)
        if (existing) updated++; else added++
      } else {
        failed.push({ line: lineNo, reason: '无法识别文件类型' })
      }
    } catch (e) {
      failed.push({ line: lineNo, reason: e.message || '导入失败' })
    }
  }

  return { type, rows: rows.length, added, updated, unmatched, failed }
}

export default { importDingtalkAttendance }
