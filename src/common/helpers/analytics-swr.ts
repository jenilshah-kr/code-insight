'use client'

import { useMemo } from 'react'
import useSWR, { type SWRConfiguration, type SWRResponse, unstable_serialize, useSWRConfig } from 'swr'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { fetchAnalyticsJson, type AnalyticsSWRKey } from '@/common/helpers/analytics-api'

type AnalyticsCacheEntry<Data> = { data?: Data }

export function useAnalyticsSWR<Data>(
  url: string,
  config?: SWRConfiguration<Data, Error>
): SWRResponse<Data, Error> {
  const { source } = useAnalyticsSource()
  const { cache } = useSWRConfig()
  const key = useMemo<AnalyticsSWRKey>(() => [source, url], [source, url])
  const fallbackData = useMemo(
    () => (cache.get(unstable_serialize(key)) as AnalyticsCacheEntry<Data> | undefined)?.data,
    [cache, key]
  )

  return useSWR<Data, Error, AnalyticsSWRKey>(
    key,
    ([source, requestUrl]) => fetchAnalyticsJson<Data>(requestUrl, source),
    {
      revalidateIfStale: true,
      revalidateOnMount: true,
      ...config,
      fallbackData: config?.fallbackData ?? fallbackData,
    }
  )
}
