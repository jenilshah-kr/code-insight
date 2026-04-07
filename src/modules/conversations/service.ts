import { getCachedSessions, getCachedFacets, getCachedDerived } from '@/common/helpers/session-cache'
import type { AnalyticsSource } from '@/common/helpers/analytics-source'
import { calcCostFromUsage } from '@/common/helpers/rates'
import type { ConversationWithFacet } from '@/common/types/models'

export function compileConversationsList(source: AnalyticsSource = 'claude'): Promise<{ sessions: ConversationWithFacet[]; total: number }> {
  return getCachedDerived('sessions-list', () => _compileConversationsList(source), source)
}

async function _compileConversationsList(source: AnalyticsSource): Promise<{ sessions: ConversationWithFacet[]; total: number }> {
  const [sessions, facets] = await Promise.all([
    getCachedSessions(source),
    getCachedFacets(source),
  ])
  const facetMap = new Map(facets.map(f => [f.session_id, f]))

  const result: ConversationWithFacet[] = sessions.map(s => {
    const estimated_cost = source === 'claude'
      ? calcCostFromUsage('claude-opus-4-6', {
        input_tokens: s.input_tokens ?? 0,
        output_tokens: s.output_tokens ?? 0,
        cache_creation_input_tokens: s.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: s.cache_read_input_tokens ?? 0,
      })
      : 0
    return {
      ...s,
      facet: source === 'claude' ? facetMap.get(s.session_id) : undefined,
      estimated_cost,
    }
  })

  return { sessions: result, total: result.length }
}
