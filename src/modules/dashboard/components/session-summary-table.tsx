'use client'

import Link from 'next/link'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import { formatRelativeDate, workspaceDisplayName, shortConversationModelName } from '@/common/helpers/formatters'
import type { ConversationWithFacet } from '@/common/types/models'

function getLastActivityMs(s: ConversationWithFacet): number {
  return new Date(s.start_time).getTime() + (s.duration_minutes ?? 0) * 60_000
}

function getLastActivityStr(s: ConversationWithFacet): string {
  return new Date(getLastActivityMs(s)).toISOString()
}

function getConversationState(s: ConversationWithFacet): 'in_progress' | 'completed' {
  const minutesAgo = (Date.now() - getLastActivityMs(s)) / 60_000
  return minutesAgo < 30 ? 'in_progress' : 'completed'
}

function getStatus(s: ConversationWithFacet): 'active' | 'inactive' {
  const daysAgo = (Date.now() - getLastActivityMs(s)) / 86_400_000
  return daysAgo < 7 ? 'active' : 'inactive'
}

export function SessionSummaryTable() {
  const { capabilities } = useAnalyticsSource()
  const { data, error, isLoading } = useAnalyticsSWR<{ sessions: ConversationWithFacet[] }>('/api/sessions', {
    refreshInterval: 5_000,
  })
  const showLoading = isLoading && !data

  const recent = (data?.sessions ?? []).slice(0, 10)
  if (error) return <p className="text-destructive text-sm text-center py-4">Error: {String(error)}</p>
  if (showLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
    )
  }
  if (recent.length === 0) return <p className="text-muted-foreground/50 text-sm text-center py-4">No conversations yet</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {[
              { label: 'Conversation ID', align: 'left' },
              { label: 'Project', align: 'left' },
              { label: 'Model', align: 'left' },
              { label: 'Messages', align: 'right' },
              { label: 'Last Activity', align: 'right' },
              { label: 'State', align: 'center' },
              { label: 'Status', align: 'center' },
            ].map(({ label, align }) => (
              <th
                key={label}
                className={`py-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider text-${align}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recent.map(s => {
            const state = getConversationState(s)
            const status = getStatus(s)
            const msgCount = (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)

            return (
              <tr key={s.session_id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                <td className="py-2 font-mono">
                  {capabilities.sessionDetail ? (
                    <Link
                      href={`/sessions/${s.session_id}`}
                      className="text-primary hover:underline"
                      title={s.session_id}
                    >
                      {s.session_id.slice(0, 8)}
                    </Link>
                  ) : (
                    <span
                      className="text-muted-foreground"
                      title="Session detail is not available in Copilot mode"
                    >
                      {s.session_id.slice(0, 8)}
                    </span>
                  )}
                </td>
                <td className="py-2 max-w-[160px]">
                  <span className="truncate block text-foreground">
                    {workspaceDisplayName(s.project_path ?? '')}
                  </span>
                </td>
                <td className="py-2 text-muted-foreground">{shortConversationModelName(s)}</td>
                <td className="py-2 text-right text-muted-foreground tabular-nums">{msgCount.toLocaleString()}</td>
                <td className="py-2 text-right text-muted-foreground whitespace-nowrap">
                  {formatRelativeDate(getLastActivityStr(s))}
                </td>
                <td className="py-2 text-center">
                  {state === 'in_progress' ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      in progress
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      completed
                    </span>
                  )}
                </td>
                <td className="py-2 text-center">
                  {status === 'active' ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      active
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                      inactive
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
