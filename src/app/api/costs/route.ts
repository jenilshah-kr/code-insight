import { NextResponse } from 'next/server'
import { compileCostAnalytics } from '@/modules/spending/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await compileCostAnalytics()
  if (!result) {
    return NextResponse.json({ error: 'No session data found' }, { status: 404 })
  }
  return NextResponse.json(result)
}
