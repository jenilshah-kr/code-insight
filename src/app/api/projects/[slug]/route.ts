import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { compileWorkspaceDetail } from '@/modules/workspaces/service'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const payload = await compileWorkspaceDetail(slug, getAnalyticsSourceFromRequest(req))
  return NextResponse.json(payload)
}
