'use client'

import { ClaudeCostNote } from '@/common/components/claude-cost-disclosure'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { PageHeader } from '@/common/components/layout/page-header'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import { ConversationList } from '@/modules/conversations/components/conversation-list'
import { ThinkingRoiPanel } from '@/modules/conversations/components/thinking-roi-panel'
import type { ConversationWithFacet } from '@/common/types/models'

export default function SessionsPage() {
  const { source } = useAnalyticsSource()
  const { data, error, isLoading } = useAnalyticsSWR<{ sessions: ConversationWithFacet[]; total: number }>(
    '/api/sessions',
    { refreshInterval: 5_000 }
  )
  const showLoading = isLoading && !data

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="claude-code-analytics · sessions"
        subtitle={data ? `${data.total} total sessions` : 'loading...'}
      />
      <div className="p-6">
        {error && (
          <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>
        )}
        {source === 'claude' && <ClaudeCostNote className="mb-4" />}
        {showLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && (
          <div className="space-y-4">
            {source === 'claude' && <ThinkingRoiPanel sessions={data.sessions} />}
            <ConversationList sessions={data.sessions} />
          </div>
        )}
      </div>
    </div>
  )
}
