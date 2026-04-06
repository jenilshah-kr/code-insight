import { NextResponse } from 'next/server'
import { loadPlans } from '@/common/helpers/data-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const plans = await loadPlans()
  return NextResponse.json({ plans })
}
