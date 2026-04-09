'use client'

import { use } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/common/components/layout/page-header'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { ClaudeCostHint, ClaudeCostNote } from '@/common/components/claude-cost-disclosure'
import { SourceUnsupportedState } from '@/common/components/source-unsupported-state'
import { DetailPanel } from '@/modules/conversations/components/replay/detail-panel'
import { UserMessageCard, AssistantMessageCard } from '@/modules/conversations/components/replay/turn-blocks'
import { UsageAccumulationChart } from '@/modules/conversations/components/replay/token-accumulation-chart'
import { formatCost, formatTokens, formatDuration, workspaceDisplayName } from '@/common/helpers/formatters'
import type { PlaybackData, SessionInfo } from '@/common/types/models'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

type ReplayResponse = PlaybackData

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { capabilities } = useAnalyticsSource()

  const { data: replayData, error: replayError, isLoading: replayLoading } =
    useSWR<ReplayResponse>(capabilities.sessionDetail ? `/api/sessions/${id}/replay` : null, fetcher)

  const { data: metaData } =
    useSWR<{ session: SessionInfo & { estimated_cost: number } }>(
      capabilities.sessionDetail ? `/api/sessions/${id}` : null,
      fetcher
    )

  const meta = metaData?.session

  if (!capabilities.sessionDetail) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="session replay" subtitle="source-specific session detail" />
        <div className="p-6">
          <SourceUnsupportedState
            feature="Session replay"
            detail="Copilot session detail needs a dedicated replay parser for events.jsonl before this page can render turn-by-turn output."
          />
        </div>
      </div>
    )
  }

  if (replayError) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="session replay" subtitle="error" />
        <div className="p-6 text-[#dc2626] dark:text-[#f87171] text-sm font-mono">
          Error: {String(replayError)}
        </div>
      </div>
    )
  }

  if (replayLoading || !replayData) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="session replay" subtitle="loading..." />
        <div className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-${i % 2 === 0 ? '16' : '24'} bg-muted rounded animate-pulse`} />
          ))}
        </div>
      </div>
    )
  }

  const replay = replayData
  const projectName = meta ? workspaceDisplayName(meta.project_path ?? '') : id.slice(0, 8)

  // Total token counts from replay
  let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0
  for (const t of replay.turns) {
    if (t.usage) {
      totalInput      += t.usage.input_tokens ?? 0
      totalOutput     += t.usage.output_tokens ?? 0
      totalCacheWrite += t.usage.cache_creation_input_tokens ?? 0
      totalCacheRead  += t.usage.cache_read_input_tokens ?? 0
    }
  }
  const totalTokens = totalInput + totalOutput + totalCacheWrite + totalCacheRead

  // Build tool results map: tool_use_id -> result (from user turns)
  const toolResults = new Map<string, { content: string; is_error: boolean }>()
  for (const t of replay.turns) {
    if (t.type === 'user' && t.tool_results) {
      for (const r of t.tool_results) {
        toolResults.set(r.tool_use_id, { content: r.content, is_error: r.is_error })
      }
    }
  }

  // Build compaction map: index of turn before which a compaction occurred
  const compactionByTurnIndex = new Map(replay.compactions.map(c => [c.turn_index, c]))

  let assistantTurnNum = 0

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <PageHeader
        title={`${projectName} · ${replay.slug ?? id.slice(0, 8)}`}
        subtitle={`${replay.git_branch ?? '?'} · v${replay.version ?? '?'} · est. API cost ${formatCost(replay.total_cost ?? 0)}`}
      />

      {/* Stats bar */}
      <div className="border-b border-border px-4 py-2.5 flex flex-wrap gap-4 items-center text-sm">
        <span className="text-muted-foreground">
          turns: <span className="text-foreground font-bold">{replay.turns.filter(t => t.type === 'assistant').length}</span>
        </span>
        <span className="text-border">·</span>
        <span className="text-muted-foreground">
          tokens: <span className="text-[#1d4ed8] dark:text-[#60a5fa] font-bold">{formatTokens(totalTokens)}</span>
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ClaudeCostHint label={<span>est. API cost:</span>} align="left" />
          <span className="text-[#d97706] font-bold">{formatCost(replay.total_cost ?? 0)}</span>
        </span>
        {meta && (
          <>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">
              duration: <span className="text-foreground font-bold">{formatDuration(meta.duration_minutes ?? 0)}</span>
            </span>
          </>
        )}
        {replay.compactions.length > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="text-amber-400">⚡ {replay.compactions.length} compaction{replay.compactions.length !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>

      <div className="px-4 pt-3">
        <ClaudeCostNote />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden pt-3">
        {/* Conversation replay */}
        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-6 max-w-6xl">
          {replay.turns.map((turn, i) => {
            const compactionBefore = compactionByTurnIndex.get(i)

            if (turn.type === 'user') {
              return (
                <UserMessageCard
                  key={turn.uuid || i}
                  turn={turn}
                  turnNumber={i + 1}
                  compactionBefore={compactionBefore}
                  toolResults={toolResults}
                />
              )
            }

            assistantTurnNum++
            return (
              <AssistantMessageCard
                key={turn.uuid || i}
                turn={turn}
                turnNumber={assistantTurnNum}
                compactionBefore={compactionBefore}
                toolResults={toolResults}
              />
            )
          })}
        </div>

        {/* Sidebar */}
        <div className="w-64 border-l border-border overflow-y-auto px-4 py-6 flex-shrink-0">
          <DetailPanel replay={replay} meta={meta} />
        </div>
      </div>

      {/* Token accumulation chart */}
      <div className="border-t border-border px-4 py-4">
        <UsageAccumulationChart turns={replay.turns} compactions={replay.compactions} />
      </div>
    </div>
  )
}
