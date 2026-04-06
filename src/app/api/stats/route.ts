import { NextResponse } from 'next/server'
import { compileStatsPayload } from '@/modules/dashboard/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await compileStatsPayload()
  return NextResponse.json(payload)
}
