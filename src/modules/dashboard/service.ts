import { getStorageBytes } from '@/common/helpers/data-reader'
import { getCachedSessions, getCachedDerived } from '@/common/helpers/session-cache'
import { calcTotalCostFromModel, getRates } from '@/common/helpers/rates'
import type { DailyStats, ModelMetrics, SessionInfo } from '@/common/types/models'

export function calcDailyStatsFromSessions(sessions: SessionInfo[]): DailyStats[] {
  const byDate = new Map<string, { messages: number; sessions: number; tools: number }>()
  for (const s of sessions) {
    const date = s.start_time.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const existing = byDate.get(date) ?? { messages: 0, sessions: 0, tools: 0 }
    existing.messages += (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)
    existing.sessions += 1
    existing.tools += Object.values(s.tool_counts ?? {}).reduce((a, b) => a + b, 0)
    byDate.set(date, existing)
  }
  return Array.from(byDate.entries())
    .map(([date, { messages, sessions: count, tools }]) => ({
      date,
      messageCount: messages,
      sessionCount: count,
      toolCallCount: tools,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}


export function compileStatsPayload() {
  return getCachedDerived('stats', _compileStatsPayload)
}

async function _compileStatsPayload() {
  const [sessions, storageBytes] = await Promise.all([
    getCachedSessions(),
    getStorageBytes(),
  ])

  const dailyActivity = calcDailyStatsFromSessions(sessions)

  // Build live modelUsage from sessions
  const liveModelUsage: Record<string, ModelMetrics> = {}
  for (const s of sessions) {
    const key = s.model ?? 'unknown'
    const e = liveModelUsage[key] ?? {
      inputTokens: 0, outputTokens: 0,
      cacheReadInputTokens: 0, cacheCreationInputTokens: 0,
      costUSD: 0, webSearchRequests: 0,
    }
    e.inputTokens += s.input_tokens ?? 0
    e.outputTokens += s.output_tokens ?? 0
    e.cacheReadInputTokens += s.cache_read_input_tokens ?? 0
    e.cacheCreationInputTokens += s.cache_creation_input_tokens ?? 0
    liveModelUsage[key] = e
  }

  let totalCost = 0
  let totalCacheSavings = 0
  for (const [model, usage] of Object.entries(liveModelUsage)) {
    const cost = calcTotalCostFromModel(model, usage)
    totalCost += cost
    const p = getRates(model)
    totalCacheSavings += (usage.cacheReadInputTokens ?? 0) * (p.input - p.cacheRead)
  }

  const totalInputTokens = sessions.reduce((s, m) => s + (m.input_tokens ?? 0), 0)
  const totalOutputTokens = sessions.reduce((s, m) => s + (m.output_tokens ?? 0), 0)
  const totalCacheReadTokens = sessions.reduce((s, m) => s + (m.cache_read_input_tokens ?? 0), 0)
  const totalCacheWriteTokens = sessions.reduce((s, m) => s + (m.cache_creation_input_tokens ?? 0), 0)
  const totalTokens = totalInputTokens + totalOutputTokens + totalCacheReadTokens + totalCacheWriteTokens

  const liveHourCounts: Record<string, number> = {}
  for (const s of sessions) {
    const hour = new Date(s.start_time).getHours().toString()
    liveHourCounts[hour] = (liveHourCounts[hour] ?? 0) + 1
  }

  let totalToolCalls = 0
  for (const s of sessions) {
    for (const count of Object.values(s.tool_counts ?? {})) {
      totalToolCalls += count
    }
  }

  const activeDays = dailyActivity.filter(d => d.sessionCount > 0).length

  const avgSessionMinutes =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / sessions.length
      : 0

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const sessionsThisMonth = sessions.filter(s => new Date(s.start_time) >= monthStart).length
  const sessionsThisWeek = sessions.filter(s => new Date(s.start_time) >= weekStart).length

  const liveMessageCount = sessions.reduce(
    (s, m) => s + (m.user_message_count ?? 0) + (m.assistant_message_count ?? 0), 0
  )

  const longestSession = sessions.reduce(
    (best, s) => {
      const msgs = (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)
      return msgs > best.messageCount
        ? { sessionId: s.session_id, duration: s.duration_minutes, messageCount: msgs, timestamp: s.start_time }
        : best
    },
    { sessionId: '', duration: 0, messageCount: 0, timestamp: '' }
  )

  const stats = {
    version: 0,
    lastComputedDate: '',
    dailyActivity,
    tokensByDate: [],
    modelUsage: liveModelUsage,
    totalSessions: sessions.length,
    totalMessages: liveMessageCount,
    longestSession,
    firstSessionDate: sessions[sessions.length - 1]?.start_time ?? '',
    hourCounts: liveHourCounts,
    totalSpeculationTimeSavedMs: 0,
  }

  return {
    stats,
    computed: {
      totalCost,
      totalCacheSavings,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens,
      totalCacheWriteTokens,
      totalToolCalls,
      activeDays,
      avgSessionMinutes,
      sessionsThisMonth,
      sessionsThisWeek,
      storageBytes,
      sessionCount: sessions.length,
    },
  }
}
