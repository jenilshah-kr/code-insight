import { NextResponse } from 'next/server'
import { compileWorkspaceDetail } from '@/modules/workspaces/service'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const payload = await compileWorkspaceDetail(slug)
  return NextResponse.json(payload)
}
