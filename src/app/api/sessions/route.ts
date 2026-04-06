import { NextResponse } from 'next/server'
import { compileConversationsList } from '@/modules/conversations/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await compileConversationsList()
  return NextResponse.json(payload)
}
