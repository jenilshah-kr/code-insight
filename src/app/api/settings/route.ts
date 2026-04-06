import { NextResponse } from 'next/server'
import { loadSettings, getStorageBytes, loadSkills, loadPlugins } from '@/common/helpers/data-reader'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [settings, storageBytes, skills, plugins] = await Promise.all([
    loadSettings(),
    getStorageBytes(),
    loadSkills(),
    loadPlugins(),
  ])
  return NextResponse.json({ settings, storageBytes, skills, plugins })
}
