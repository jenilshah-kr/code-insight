import { getCachedSessions } from '@/common/helpers/session-cache'
import { calcDailyStatsFromSessions } from '@/modules/dashboard/service'

export function calcStreaks(dates: Set<string>): { current: number; longest: number } {
  const sorted = [...dates].sort()
  if (sorted.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000
    if (diff === 1) {
      streak++
      if (streak > longest) longest = streak
    } else {
      streak = 1
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  let current = 0
  const d = new Date(today)
  while (dates.has(d.toISOString().slice(0, 10))) {
    current++
    d.setDate(d.getDate() - 1)
  }

  return { current, longest }
}

export async function compileActivityPayload() {
  const sessions = await getCachedSessions()
  const dailyActivity = calcDailyStatsFromSessions(sessions)

  const hourCounts: Record<string, number> = {}
  const dowCounts: number[] = [0, 0, 0, 0, 0, 0, 0]
  const activeDates = new Set<string>()

  for (const s of sessions) {
    if (!s.start_time) continue
    const d = new Date(s.start_time)
    if (isNaN(d.getTime())) continue
    dowCounts[d.getDay()]++
    activeDates.add(s.start_time.slice(0, 10))
    const hour = String(d.getHours())
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  }

  const streaks = calcStreaks(activeDates)

  let mostActiveDay = ''
  let mostActiveMsgs = 0
  for (const da of dailyActivity) {
    if (da.messageCount > mostActiveMsgs) {
      mostActiveMsgs = da.messageCount
      mostActiveDay = da.date
    }
  }

  const hourCountsArr = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourCounts[String(i)] ?? 0,
  }))

  return {
    daily_activity: dailyActivity,
    hour_counts: hourCountsArr,
    dow_counts: dowCounts.map((count, i) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      count,
    })),
    streaks,
    most_active_day: mostActiveDay,
    most_active_day_msgs: mostActiveMsgs,
    total_active_days: activeDates.size,
  }
}
