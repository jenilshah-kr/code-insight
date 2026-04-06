import { NextResponse } from 'next/server'
import { getCachedSessions } from '@/common/helpers/session-cache'
import type { ExportBundle, ImportComparison } from '@/common/types/models'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null) as ExportBundle | null

  if (!payload || !payload.sessions) {
    return NextResponse.json({ error: 'Invalid import payload' }, { status: 400 })
  }

  const existing = await getCachedSessions()
  const existingIds = new Set(existing.map(s => s.session_id))

  const sessions_to_add = payload.sessions.filter(s => !existingIds.has(s.session_id))

  const diff: ImportComparison = {
    total_in_export: payload.sessions.length,
    already_present: payload.sessions.length - sessions_to_add.length,
    new_sessions: sessions_to_add.length,
    sessions_to_add,
  }

  // Note: actual file writing is intentionally not implemented here
  // to prevent accidental corruption of ~/.claude/ live data.
  // The import feature shows a diff preview only.

  return NextResponse.json(diff)
}
