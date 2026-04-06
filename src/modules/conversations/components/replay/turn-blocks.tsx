'use client'

import { useState } from 'react'
import { InvocationBadge } from './tool-call-badge'
import { CompressionCard } from './compaction-card'
import { formatCost, formatTokens, formatDurationMs, formatDate } from '@/common/helpers/formatters'
import type { SessionTurn, CompactionEvent, ToolInvocation } from '@/common/types/models'

interface TurnCardProps {
  turn: SessionTurn
  turnNumber: number
  compactionBefore?: CompactionEvent
  toolResults: Map<string, { content: string; is_error: boolean }>
}

function UsageBadge({ turn }: { turn: SessionTurn }) {
  if (!turn.usage) return null
  const u = turn.usage
  const parts = [
    u.input_tokens ? `in:${formatTokens(u.input_tokens)}` : '',
    u.output_tokens ? `out:${formatTokens(u.output_tokens)}` : '',
    u.cache_creation_input_tokens ? `cW:${formatTokens(u.cache_creation_input_tokens)}` : '',
    u.cache_read_input_tokens ? `cR:${formatTokens(u.cache_read_input_tokens)}` : '',
  ].filter(Boolean).join(' ')

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-mono bg-muted border border-border text-muted-foreground">
      🪙 {parts}
      {turn.estimated_cost ? ` · ${formatCost(turn.estimated_cost)}` : ''}
    </span>
  )
}

export function UserMessageCard({ turn, compactionBefore, toolResults }: TurnCardProps) {
  return (
    <div>
      {compactionBefore && <CompressionCard event={compactionBefore} />}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-bold text-muted-foreground/60 uppercase tracking-wider">User</span>
          <span className="text-sm text-muted-foreground/40">
            {new Date(turn.timestamp).toLocaleTimeString()}
          </span>
        </div>
        {turn.text && (
          <div className="bg-muted/50 border border-border/30 rounded-lg px-4 py-3">
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {turn.text}
            </p>
          </div>
        )}
        {turn.tool_results && turn.tool_results.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {turn.tool_results.map(r => (
              <div
                key={r.tool_use_id}
                className={`text-sm font-mono px-2.5 py-1.5 rounded border ${r.is_error ? 'bg-red-950/30 border-red-800/40 text-red-400' : 'bg-muted/50 border-border/30 text-muted-foreground/60'}`}
              >
                <span className="text-muted-foreground/40 mr-1">→</span>
                {r.content.slice(0, 200)}{r.content.length > 200 ? '…' : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function AssistantMessageCard({ turn, turnNumber, toolResults }: TurnCardProps) {
  const [thinkingOpen, setThinkingOpen] = useState(false)
  const modelShort = turn.model?.includes('opus-4-6') ? 'opus-4.6'
    : turn.model?.includes('opus-4-5') ? 'opus-4.5'
    : turn.model?.includes('sonnet') ? 'sonnet'
    : turn.model ?? 'claude'

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-sm font-bold text-primary/80 uppercase tracking-wider">Claude</span>
        <span className="text-sm text-muted-foreground/40">{modelShort}</span>
        <span className="text-sm text-muted-foreground/30">#{turnNumber}</span>
        {turn.turn_duration_ms && (
          <span className="text-sm text-muted-foreground/40">⏱ {formatDurationMs(turn.turn_duration_ms)}</span>
        )}
        <UsageBadge turn={turn} />
      </div>

      {turn.has_thinking && (
        <div className="mb-2">
          <button
            onClick={() => setThinkingOpen(o => !o)}
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            🧠 thinking block {thinkingOpen ? '▲' : '▾'}
          </button>
          {thinkingOpen && turn.thinking_text && (
            <div className="mt-1.5 bg-indigo-950/30 border border-indigo-800/30 rounded px-3 py-2">
              <pre className="text-sm text-indigo-200/60 whitespace-pre-wrap max-h-48 overflow-auto">
                {turn.thinking_text.slice(0, 2000)}
              </pre>
            </div>
          )}
        </div>
      )}

      {turn.tool_calls && turn.tool_calls.length > 0 && (
        <div className="mb-2 space-y-1">
          {turn.tool_calls.map(tc => (
            <InvocationBadge
              key={tc.id}
              tool={tc}
              result={toolResults.get(tc.id)}
            />
          ))}
        </div>
      )}

      {turn.text && (
        <div className="prose prose-invert max-w-none">
          <div className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
            {turn.text.slice(0, 3000)}
            {turn.text.length > 3000 && (
              <span className="text-muted-foreground/40"> …[{(turn.text.length - 3000).toLocaleString()} more chars]</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
