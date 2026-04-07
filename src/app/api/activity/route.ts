import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { compileActivityPayload } from '@/modules/timeline/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await compileActivityPayload(getAnalyticsSourceFromRequest(req))
  return NextResponse.json(payload)
}
