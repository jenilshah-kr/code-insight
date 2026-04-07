import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { compileConversationsList } from '@/modules/conversations/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await compileConversationsList(getAnalyticsSourceFromRequest(req))
  return NextResponse.json(payload)
}
