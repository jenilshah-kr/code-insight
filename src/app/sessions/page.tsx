'use client'

import useSWR from 'swr'
import { PageHeader } from '@/common/components/layout/page-header'
import { ConversationList } from '@/modules/conversations/components/conversation-list'
import type { ConversationWithFacet } from '@/common/types/models'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

export default function SessionsPage() {
  const { data, error, isLoading } = useSWR<{ sessions: ConversationWithFacet[]; total: number }>(
    '/api/sessions',
    fetcher,
    { refreshInterval: 5_000 }
  )

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
        {isLoading && (
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
