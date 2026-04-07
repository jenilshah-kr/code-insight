'use client'

import { preload } from 'swr'
import type { AnalyticsSource } from '@/common/helpers/analytics-source'

export type AnalyticsSWRKey = readonly [AnalyticsSource, string]

const MAIN_SUPPORTED_TAB_API_URLS = [
  '/api/stats',
  '/api/projects',
  '/api/sessions',
  '/api/tools',
  '/api/activity',
  '/api/history?limit=2000',
  '/api/settings',
] as const

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value
}

export function getSourceScopedUrl(url: string, source: AnalyticsSource): string {
  const hashIndex = url.indexOf('#')
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex)
  const baseUrl = hashIndex === -1 ? url : url.slice(0, hashIndex)
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}source=${source}${hash}`
}

export async function fetchAnalyticsJson<Data>(url: string, source?: AnalyticsSource): Promise<Data> {
  const response = await fetch(source ? getSourceScopedUrl(url, source) : url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`API error ${response.status}`)
  }
  return response.json() as Promise<Data>
}

export async function fetchAnalyticsKey<Data>([source, url]: AnalyticsSWRKey): Promise<Data> {
  return fetchAnalyticsJson<Data>(url, source)
}

export function warmMainSupportedTabData(source: AnalyticsSource) {
  for (const url of MAIN_SUPPORTED_TAB_API_URLS) {
    const request = preload(
      [source, url] as AnalyticsSWRKey,
      fetchAnalyticsKey as (key: AnalyticsSWRKey) => Promise<unknown>
    )
    if (isPromiseLike(request)) {
      void request.catch(() => {})
    }
  }
}
