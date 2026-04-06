import { getCachedSessions, getCachedFacets, getCachedDerived } from '@/common/helpers/session-cache'
import { calcCostFromUsage } from '@/common/helpers/rates'
import type { ConversationWithFacet } from '@/common/types/models'

export function compileConversationsList(): Promise<{ sessions: ConversationWithFacet[]; total: number }> {
  return getCachedDerived('sessions-list', _compileConversationsList)
}

async function _compileConversationsList(): Promise<{ sessions: ConversationWithFacet[]; total: number }> {
  const [sessions, facets] = await Promise.all([
    getCachedSessions(),
    getCachedFacets(),
  ])
  const facetMap = new Map(facets.map(f => [f.session_id, f]))

  const result: ConversationWithFacet[] = sessions.map(s => {
    const estimated_cost = calcCostFromUsage('claude-opus-4-6', {
      input_tokens: s.input_tokens ?? 0,
      output_tokens: s.output_tokens ?? 0,
      cache_creation_input_tokens: s.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: s.cache_read_input_tokens ?? 0,
    })
    return {
      ...s,
      facet: facetMap.get(s.session_id),
      estimated_cost,
    }
  })

  return { sessions: result, total: result.length }
}
