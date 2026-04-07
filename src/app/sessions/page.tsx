'use client'

import { PageHeader } from '@/common/components/layout/page-header'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import { ConversationList } from '@/modules/conversations/components/conversation-list'
import type { ConversationWithFacet } from '@/common/types/models'

export default function SessionsPage() {
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
        {showLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && <ConversationList sessions={data.sessions} />}
      </div>
    </div>
  )
}
