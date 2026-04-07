import { NextResponse } from 'next/server'
import { getCachedSessions } from '@/common/helpers/session-cache'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { compileInstrumentAnalytics } from '@/modules/instruments/service'
import type { InstrumentAnalytics } from '@/common/types/models'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const source = getAnalyticsSourceFromRequest(req)
  const sessions = await getCachedSessions(source)
  const result: InstrumentAnalytics = await compileInstrumentAnalytics(sessions, source)
  return NextResponse.json(result)
}
