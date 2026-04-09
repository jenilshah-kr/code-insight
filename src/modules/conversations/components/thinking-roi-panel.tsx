'use client'

import { useMemo } from 'react'
import type { ConversationWithFacet } from '@/common/types/models'
import { formatCost } from '@/common/helpers/formatters'

interface Props {
  sessions: ConversationWithFacet[]
}

function avg(arr: number[]) {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function Metric({ label, a, b, format, lowerIsBetter = false }: {
  label: string
  a: number
  b: number
  format: (v: number) => string
  lowerIsBetter?: boolean
}) {
  const diff = b === 0 ? null : ((a - b) / b)
  const positive = lowerIsBetter ? (diff !== null && diff < 0) : (diff !== null && diff > 0)
  const negative = lowerIsBetter ? (diff !== null && diff > 0) : (diff !== null && diff < 0)

  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono font-bold text-[15px] text-foreground">{format(a)}</span>
        {diff !== null && Math.abs(diff) > 0.01 && (
          <span className={`text-[11px] font-mono ${positive ? 'text-[#34d399]' : negative ? 'text-[#f87171]' : 'text-muted-foreground/40'}`}>
            {positive ? '▲' : '▼'} {Math.abs(diff * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/40">{format(b)} without</p>
    </div>
  )
}

export function ThinkingRoiPanel({ sessions }: Props) {
  const { withStats, withoutStats } = useMemo(() => {
    const withThinking = sessions.filter(s => s.has_thinking)
    const withoutThinking = sessions.filter(s => !s.has_thinking)

    function stats(group: ConversationWithFacet[]) {
      return {
        count: group.length,
        avgCost: avg(group.map(s => s.estimated_cost ?? 0)),
        avgCommits: avg(group.map(s => s.git_commits ?? 0)),
        avgToolErrors: avg(group.map(s => s.tool_errors ?? 0)),
        avgMessages: avg(group.map(s => (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0))),
        avgTools: avg(group.map(s => Object.values(s.tool_counts ?? {}).reduce((a, b) => a + b, 0))),
      }
    }

    return { withStats: stats(withThinking), withoutStats: stats(withoutThinking) }
  }, [sessions])

  if (withStats.count === 0) return null

  const withPct = Math.round((withStats.count / sessions.length) * 100)

  return (
    <div className="border border-border rounded bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-label">🧠 Thinking Token ROI</h2>
          <p className="text-[12px] text-muted-foreground/50 mt-0.5">
            sessions with extended thinking vs without
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-foreground">{withStats.count}</p>
          <p className="text-[11px] text-muted-foreground/50">{withPct}% of sessions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="avg cost"
          a={withStats.avgCost}
          b={withoutStats.avgCost}
          format={formatCost}
          lowerIsBetter
        />
        <Metric
          label="avg commits"
          a={withStats.avgCommits}
          b={withoutStats.avgCommits}
          format={v => v.toFixed(2)}
        />
        <Metric
          label="avg tool errors"
          a={withStats.avgToolErrors}
          b={withoutStats.avgToolErrors}
          format={v => v.toFixed(2)}
          lowerIsBetter
        />
        <Metric
          label="avg messages"
          a={withStats.avgMessages}
          b={withoutStats.avgMessages}
          format={v => v.toFixed(1)}
        />
      </div>

      <p className="text-[11px] text-muted-foreground/30 mt-3">
        ▲/▼ = thinking sessions vs non-thinking baseline · green = better outcome
      </p>
    </div>
  )
}
