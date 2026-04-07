import { NextResponse } from 'next/server'
import { getAnalyticsSourceFromRequest } from '@/common/helpers/analytics-source'
import { getStorageBytesForSource, loadPluginsForSource, loadSettingsForSource, loadSkillsForSource } from '@/common/helpers/analytics-reader'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const source = getAnalyticsSourceFromRequest(req)
  const [settings, storageBytes, skills, plugins] = await Promise.all([
    loadSettingsForSource(source),
    getStorageBytesForSource(source),
    loadSkillsForSource(source),
    loadPluginsForSource(source),
  ])
  return NextResponse.json({ settings, storageBytes, skills, plugins })
}
