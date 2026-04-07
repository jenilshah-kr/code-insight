import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { loadPlansForSource } from '@/common/helpers/analytics-reader'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const source = getAnalyticsSourceFromRequest(req)
  if (source === 'copilot') {
    return NextResponse.json({ error: 'Plans are not supported for Copilot analytics yet' }, { status: 501 })
  }
  const plans = await loadPlansForSource(source)
  return NextResponse.json({ plans })
}
