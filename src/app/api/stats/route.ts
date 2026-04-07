import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { compileStatsPayload } from '@/modules/dashboard/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await compileStatsPayload(getAnalyticsSourceFromRequest(req))
  return NextResponse.json(payload)
}
