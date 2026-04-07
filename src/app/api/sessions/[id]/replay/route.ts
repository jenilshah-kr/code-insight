import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { resolveSessionJSONL } from '@/common/helpers/data-reader'
import { parseSessionPlayback } from '@/common/helpers/turn-parser'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (getAnalyticsSourceFromRequest(req) === 'copilot') {
    return NextResponse.json({ error: 'Session replay is not supported for Copilot analytics yet' }, { status: 501 })
  }
  const { id } = await params
  const jsonlPath = await resolveSessionJSONL(id)

  if (!jsonlPath) {
    return NextResponse.json({ error: 'Session JSONL not found' }, { status: 404 })
  }

  const replay = await parseSessionPlayback(jsonlPath, id)
  return NextResponse.json(replay)
}
