import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { compileWorkspaceList } from '@/modules/workspaces/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const payload = await compileWorkspaceList(getAnalyticsSourceFromRequest(req))
  return NextResponse.json(payload)
}
