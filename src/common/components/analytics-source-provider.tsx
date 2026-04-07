'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ANALYTICS_SOURCE_COOKIE,
  DEFAULT_ANALYTICS_SOURCE,
  getAnalyticsCapabilities,
  getAnalyticsDataRoot,
  getAnalyticsProductLabel,
  getAnalyticsSourceLabel,
  type AnalyticsSource,
  type SourceCapabilities,
} from '@/common/helpers/analytics-source'
import { warmMainSupportedTabData } from '@/common/helpers/analytics-api'

interface AnalyticsSourceContextValue {
  source: AnalyticsSource
  setSource: (source: AnalyticsSource) => void
  label: string
  productLabel: string
  dataRoot: string
  capabilities: SourceCapabilities
}

const AnalyticsSourceContext = createContext<AnalyticsSourceContextValue>({
  source: DEFAULT_ANALYTICS_SOURCE,
  setSource: () => {},
  label: getAnalyticsSourceLabel(DEFAULT_ANALYTICS_SOURCE),
  productLabel: getAnalyticsProductLabel(DEFAULT_ANALYTICS_SOURCE),
  dataRoot: getAnalyticsDataRoot(DEFAULT_ANALYTICS_SOURCE),
  capabilities: getAnalyticsCapabilities(DEFAULT_ANALYTICS_SOURCE),
})

function persistAnalyticsSource(source: AnalyticsSource) {
  localStorage.setItem(ANALYTICS_SOURCE_COOKIE, source)
  document.cookie = `${ANALYTICS_SOURCE_COOKIE}=${source}; path=/; max-age=31536000; samesite=lax`
}

export function AnalyticsSourceProvider({
  children,
  initialSource,
}: {
  children: React.ReactNode
  initialSource: AnalyticsSource
}) {
  const router = useRouter()
  const [source, setSourceState] = useState<AnalyticsSource>(initialSource)
  const prewarmedSourceRef = useRef<AnalyticsSource | null>(null)

  useEffect(() => {
    persistAnalyticsSource(source)
    if (prewarmedSourceRef.current === source) {
      prewarmedSourceRef.current = null
      return
    }
    warmMainSupportedTabData(source)
  }, [source])

  const setSource = useCallback((next: AnalyticsSource) => {
    if (next === source) return
    prewarmedSourceRef.current = next
    warmMainSupportedTabData(next)
    setSourceState(next)
    persistAnalyticsSource(next)
    router.refresh()
  }, [router, source])

  const value = useMemo<AnalyticsSourceContextValue>(() => ({
    source,
    setSource,
    label: getAnalyticsSourceLabel(source),
    productLabel: getAnalyticsProductLabel(source),
    dataRoot: getAnalyticsDataRoot(source),
    capabilities: getAnalyticsCapabilities(source),
  }), [source, setSource])

  return (
    <AnalyticsSourceContext.Provider value={value}>
      {children}
    </AnalyticsSourceContext.Provider>
  )
}

export function useAnalyticsSource() {
  return useContext(AnalyticsSourceContext)
}
