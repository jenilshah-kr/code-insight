import { NextResponse } from 'next/server'
import { loadTodos } from '@/common/helpers/data-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const todos = await loadTodos()
  return NextResponse.json({ todos })
}
