import type { TurnUsage, ModelMetrics } from '@/common/types/models'

interface ModelRates {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

export const RATES: Record<string, ModelRates> = {
  'claude-opus-4-6': {
    input:      15.00 / 1_000_000,
    output:     75.00 / 1_000_000,
    cacheWrite: 18.75 / 1_000_000,
    cacheRead:   1.50 / 1_000_000,
  },
  'claude-opus-4-5-20251101': {
    input:      15.00 / 1_000_000,
    output:     75.00 / 1_000_000,
    cacheWrite: 18.75 / 1_000_000,
    cacheRead:   1.50 / 1_000_000,
  },
  'claude-sonnet-4-6': {
    input:       3.00 / 1_000_000,
    output:     15.00 / 1_000_000,
    cacheWrite:  3.75 / 1_000_000,
    cacheRead:   0.30 / 1_000_000,
  },
  'claude-haiku-4-5': {
    input:       0.80 / 1_000_000,
    output:       4.00 / 1_000_000,
    cacheWrite:   1.00 / 1_000_000,
    cacheRead:    0.08 / 1_000_000,
  },
  'claude-sonnet-4-5': {
    input:       3.00 / 1_000_000,
    output:     15.00 / 1_000_000,
    cacheWrite:  3.75 / 1_000_000,
    cacheRead:   0.30 / 1_000_000,
  },
  '<synthetic>': {
    input: 0, output: 0, cacheWrite: 0, cacheRead: 0,
  },
}

function getRates(model: string): ModelRates {
  if (RATES[model]) return RATES[model]
  // fuzzy match on prefix
  for (const key of Object.keys(RATES)) {
    if (model.startsWith(key) || key.startsWith(model.split('-').slice(0, 4).join('-'))) {
      return RATES[key]
    }
  }
  return RATES['claude-opus-4-6']
}

export function calcCostFromUsage(model: string, usage: TurnUsage): number {
  const p = getRates(model)
  return (
    (usage.input_tokens                ?? 0) * p.input      +
    (usage.output_tokens               ?? 0) * p.output     +
    (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite +
    (usage.cache_read_input_tokens     ?? 0) * p.cacheRead
  )
}

export function calcCostFromInfo(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = getRates(model)
  return inputTokens * p.input + outputTokens * p.output
}

export interface CacheSavingsResult {
  savedUSD: number
  hitRate: number
  wouldHavePaidUSD: number
}

export function calcCacheEfficiency(
  model: string,
  usage: ModelMetrics,
): CacheSavingsResult {
  const p = getRates(model)
  const savedPerToken = p.input - p.cacheRead
  const savedUSD = usage.cacheReadInputTokens * savedPerToken
  const totalContext = usage.inputTokens + usage.cacheReadInputTokens
  const hitRate = totalContext > 0
    ? usage.cacheReadInputTokens / totalContext
    : 0
  const wouldHavePaidUSD =
    (usage.inputTokens + usage.cacheReadInputTokens) * p.input +
    usage.outputTokens * p.output +
    usage.cacheCreationInputTokens * p.cacheWrite
  return { savedUSD, hitRate, wouldHavePaidUSD }
}

export function calcTotalCostFromModel(model: string, usage: ModelMetrics): number {
  const p = getRates(model)
  return (
    (usage.inputTokens                ?? 0) * p.input      +
    (usage.outputTokens               ?? 0) * p.output     +
    (usage.cacheCreationInputTokens   ?? 0) * p.cacheWrite +
    (usage.cacheReadInputTokens       ?? 0) * p.cacheRead
  )
}

export { getRates }
export type { ModelRates }
