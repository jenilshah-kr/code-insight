import { getCachedSessions, getCachedDerived } from '@/common/helpers/session-cache'
import { calcTotalCostFromModel, calcCacheEfficiency } from '@/common/helpers/rates'
import { workspaceDisplayName } from '@/common/helpers/formatters'
import type { SpendAnalytics, ModelSpendBreakdown, DailySpend, WorkspaceSpend, ModelMetrics } from '@/common/types/models'

export function compileCostAnalytics(): Promise<SpendAnalytics | null> {
  return getCachedDerived('cost-analytics', _compileCostAnalytics)
}

async function _compileCostAnalytics(): Promise<SpendAnalytics | null> {
  const sessions = await getCachedSessions()
  if (sessions.length === 0) return null

  // Aggregate per-model totals from live session data
  const modelAgg = new Map<string, ModelMetrics>()
  const sessionsByDate = new Map<string, typeof sessions>()
  const projectMap = new Map<string, { cost: number; input: number; output: number }>()

  for (const s of sessions) {
    const modelKey = s.model ?? 'unknown'
    const usage: ModelMetrics = {
      inputTokens: s.input_tokens ?? 0,
      outputTokens: s.output_tokens ?? 0,
      cacheCreationInputTokens: s.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: s.cache_read_input_tokens ?? 0,
      costUSD: 0,
      webSearchRequests: 0,
    }

    // Per-model aggregate
    const prev = modelAgg.get(modelKey)
    modelAgg.set(modelKey, prev ? {
      inputTokens: prev.inputTokens + usage.inputTokens,
      outputTokens: prev.outputTokens + usage.outputTokens,
      cacheCreationInputTokens: prev.cacheCreationInputTokens + usage.cacheCreationInputTokens,
      cacheReadInputTokens: prev.cacheReadInputTokens + usage.cacheReadInputTokens,
      costUSD: 0,
      webSearchRequests: 0,
    } : usage)

    // Daily grouping
    if (s.start_time) {
      const date = s.start_time.slice(0, 10)
      const arr = sessionsByDate.get(date) ?? []
      arr.push(s)
      sessionsByDate.set(date, arr)
    }

    // Per-project aggregate
    const pp = s.project_path ?? ''
    const cost = calcTotalCostFromModel(modelKey, usage)
    const prev2 = projectMap.get(pp) ?? { cost: 0, input: 0, output: 0 }
    projectMap.set(pp, {
      cost: prev2.cost + cost,
      input: prev2.input + usage.inputTokens,
      output: prev2.output + usage.outputTokens,
    })
  }

  // Build model breakdown + totals
  let totalCost = 0
  let totalSavings = 0
  const models: ModelSpendBreakdown[] = [...modelAgg.entries()].map(([model, usage]) => {
    const cost = calcTotalCostFromModel(model, usage)
    const eff = calcCacheEfficiency(model, usage)
    totalCost += cost
    totalSavings += eff.savedUSD
    return {
      model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_write_tokens: usage.cacheCreationInputTokens,
      cache_read_tokens: usage.cacheReadInputTokens,
      estimated_cost: cost,
      cache_savings: eff.savedUSD,
      cache_hit_rate: eff.hitRate,
    }
  }).sort((a, b) => b.estimated_cost - a.estimated_cost)

  // Build daily spend
  const daily: DailySpend[] = [...sessionsByDate.entries()]
    .map(([date, daySessions]) => {
      const costs: Record<string, number> = {}
      let dayTotal = 0
      for (const s of daySessions) {
        const modelKey = s.model ?? 'unknown'
        const cost = calcTotalCostFromModel(modelKey, {
          inputTokens: s.input_tokens ?? 0,
          outputTokens: s.output_tokens ?? 0,
          cacheCreationInputTokens: s.cache_creation_input_tokens ?? 0,
          cacheReadInputTokens: s.cache_read_input_tokens ?? 0,
          costUSD: 0,
          webSearchRequests: 0,
        })
        costs[modelKey] = (costs[modelKey] ?? 0) + cost
        dayTotal += cost
      }
      return { date, costs, total: dayTotal }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const by_project: WorkspaceSpend[] = [...projectMap.entries()]
    .map(([slug, data]) => ({
      slug,
      display_name: workspaceDisplayName(slug),
      estimated_cost: data.cost,
      input_tokens: data.input,
      output_tokens: data.output,
    }))
    .sort((a, b) => b.estimated_cost - a.estimated_cost)
    .slice(0, 20)

  return { total_cost: totalCost, total_savings: totalSavings, models, daily, by_project }
}
