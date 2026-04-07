import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { loadSessionInfo, loadFacet } from '@/common/helpers/data-reader'
import { getCachedSessions } from '@/common/helpers/session-cache'
import { calcCostFromUsage } from '@/common/helpers/rates'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (getAnalyticsSourceFromRequest(req) === 'copilot') {
    return NextResponse.json({ error: 'Session detail is not supported for Copilot analytics yet' }, { status: 501 })
  }
  const { id } = await params
  const [meta, facet] = await Promise.all([loadSessionInfo(id), loadFacet(id)])

  // loadSessionInfo only finds session-meta/*.json files (legacy path).
  // Fall back to JSONL-derived sessions for machines without that directory.
  const resolved = meta ?? (await getCachedSessions('claude')).find(s => s.session_id === id) ?? null

  if (!resolved) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const estimated_cost = calcCostFromUsage('claude-opus-4-6', {
    input_tokens: resolved.input_tokens ?? 0,
    output_tokens: resolved.output_tokens ?? 0,
    cache_creation_input_tokens: resolved.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: resolved.cache_read_input_tokens ?? 0,
  })

  return NextResponse.json({ session: { ...resolved, facet, estimated_cost } })
}
