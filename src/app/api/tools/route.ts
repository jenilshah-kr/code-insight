import { NextResponse } from 'next/server'
import { getCachedSessions } from '@/common/helpers/session-cache'
import { compileInstrumentAnalytics } from '@/modules/instruments/service'
import type { InstrumentAnalytics } from '@/common/types/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sessions = await getCachedSessions()
  const result: InstrumentAnalytics = await compileInstrumentAnalytics(sessions)
  return NextResponse.json(result)
}
