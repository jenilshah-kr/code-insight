import { NextResponse } from 'next/server'
import { compileActivityPayload } from '@/modules/timeline/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await compileActivityPayload()
  return NextResponse.json(payload)
}
