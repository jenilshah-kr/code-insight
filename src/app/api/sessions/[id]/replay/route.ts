import { NextResponse } from 'next/server'
import { resolveSessionJSONL } from '@/common/helpers/data-reader'
import { parseSessionPlayback } from '@/common/helpers/turn-parser'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const jsonlPath = await resolveSessionJSONL(id)

  if (!jsonlPath) {
    return NextResponse.json({ error: 'Session JSONL not found' }, { status: 404 })
  }

  const replay = await parseSessionPlayback(jsonlPath, id)
  return NextResponse.json(replay)
}
