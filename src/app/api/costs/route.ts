import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { compileCostAnalytics } from '@/modules/spending/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (getAnalyticsSourceFromRequest(req) === 'copilot') {
    return NextResponse.json({ error: 'Costs are not supported for Copilot analytics yet' }, { status: 501 })
  }
  const result = await compileCostAnalytics()
  if (!result) {
    return NextResponse.json({ error: 'No session data found' }, { status: 404 })
  }
  return NextResponse.json(result)
}
