import { NextResponse } from 'next/server'
import { compileWorkspaceList } from '@/modules/workspaces/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await compileWorkspaceList()
  return NextResponse.json(payload)
}
