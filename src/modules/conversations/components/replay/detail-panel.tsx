'use client'

import { ClaudeCostHint } from '@/common/components/claude-cost-disclosure'
import { formatCost, formatTokens, formatDuration, workspaceDisplayName } from '@/common/helpers/formatters'
import type { PlaybackData, SessionInfo } from '@/common/types/models'

interface Props {
  replay: PlaybackData
  meta?: SessionInfo
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/50 pb-3 mb-3">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">{title}</h3>
      {children}
    </div>
  )
}

export function DetailPanel({ replay, meta }: Props) {
  // Aggregate token totals
  let totalInput = 0, totalOutput = 0, totalCacheWrite = 0, totalCacheRead = 0
  for (const t of replay.turns) {
    if (t.usage) {
      totalInput      += t.usage.input_tokens ?? 0
      totalOutput     += t.usage.output_tokens ?? 0
      totalCacheWrite += t.usage.cache_creation_input_tokens ?? 0
      totalCacheRead  += t.usage.cache_read_input_tokens ?? 0
    }
  }
  const totalTokens = totalInput + totalOutput + totalCacheWrite + totalCacheRead
  const pct = (n: number) => totalTokens > 0 ? ((n / totalTokens) * 100).toFixed(1) + '%' : '0%'

  // Top tools
  const toolCounts = new Map<string, number>()
  for (const t of replay.turns) {
    for (const tc of t.tool_calls ?? []) {
      toolCounts.set(tc.name, (toolCounts.get(tc.name) ?? 0) + 1)
    }
  }
  const topTools = [...toolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const maxToolCount = topTools[0]?.[1] ?? 1

  // Compaction timeline
  const assistantTurns = replay.turns.filter(t => t.type === 'assistant')

  return (
    <div className="text-sm space-y-0">
      <PanelSection title="Token Breakdown">
        <div className="space-y-1 font-mono">
          {[
            { label: 'Input',       val: totalInput,      color: 'var(--label-blue)' },
            { label: 'Output',      val: totalOutput,     color: 'var(--label-amber)' },
            { label: 'Cache Write', val: totalCacheWrite, color: 'var(--label-violet)' },
            { label: 'Cache Read',  val: totalCacheRead,  color: 'var(--label-emerald)' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground w-20">{label}</span>
              <span style={{ color }} className="font-bold">{formatTokens(val)}</span>
              <span className="text-muted-foreground/50 text-[13px]">{pct(val)}</span>
            </div>
          ))}
          <div className="border-t border-border/50 pt-1 mt-1 flex justify-between font-bold">
            <span className="text-muted-foreground">TOTAL</span>
            <span className="text-foreground">{formatTokens(totalTokens)}</span>
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--label-amber)' }}>
              {formatCost(replay.total_cost)}
              <ClaudeCostHint align="right" />
            </span>
          </div>
        </div>
      </PanelSection>

      {topTools.length > 0 && (
        <PanelSection title="Tools Used">
          <div className="space-y-1">
            {topTools.map(([name, count]) => {
              const shortName = name.startsWith('mcp__')
                ? name.split('__').slice(1).join(' · ')
                : name
              const width = Math.round((count / maxToolCount) * 100)
              return (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="text-muted-foreground w-24 truncate" title={name}>{shortName}</span>
                  <div className="flex-1 bg-muted rounded-sm h-1.5 overflow-hidden">
                    <div className="h-full bg-[#d97706]/60 rounded-sm" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-muted-foreground/60 w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </PanelSection>
      )}

      {replay.compactions.length > 0 && (
        <PanelSection title="Compaction Timeline">
          <div className="space-y-1.5">
            {replay.compactions.map((c) => (
              <div key={c.uuid} className="flex items-start gap-1.5">
                <span className="text-amber-400">⚡</span>
                <div>
                  <span className="text-amber-300/80">Turn {c.turn_index}</span>
                  <span className="text-muted-foreground/50 mx-1">·</span>
                  <span className="text-muted-foreground/70">{c.trigger}</span>
                  <span className="text-muted-foreground/50 mx-1">·</span>
                  <span className="text-muted-foreground/60">{formatTokens(c.pre_tokens)} tok</span>
                </div>
              </div>
            ))}
          </div>
        </PanelSection>
      )}

      <PanelSection title="Session Metadata">
        <div className="space-y-1">
          {[
            { label: 'slug',    value: replay.slug },
            { label: 'version', value: replay.version },
            { label: 'branch',  value: replay.git_branch },
            { label: 'turns',   value: String(assistantTurns.length) },
            { label: 'compactions', value: replay.compactions.length > 0 ? String(replay.compactions.length) : undefined },
          ].filter(r => r.value).map(({ label, value }) => (
            <div key={label} className="flex gap-1.5">
              <span className="text-muted-foreground/50 w-20">{label}:</span>
              <span className="text-foreground/80 truncate">{value}</span>
            </div>
          ))}
          {meta && (
            <>
              <div className="flex gap-1.5">
                <span className="text-muted-foreground/50 w-20">project:</span>
                <span className="text-foreground/80 truncate">{workspaceDisplayName(meta.project_path ?? '')}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-muted-foreground/50 w-20">duration:</span>
                <span className="text-foreground/80">{formatDuration(meta.duration_minutes ?? 0)}</span>
              </div>
              {(meta.lines_added ?? 0) > 0 && (
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground/50 w-20">lines:</span>
                  <span className="text-green-400">+{meta.lines_added}</span>
                  <span className="text-red-400">-{meta.lines_removed}</span>
                </div>
              )}
              {meta.files_modified > 0 && (
                <div className="flex gap-1.5">
                  <span className="text-muted-foreground/50 w-20">files:</span>
                  <span className="text-foreground/80">{meta.files_modified} modified</span>
                </div>
              )}
            </>
          )}
        </div>
      </PanelSection>
    </div>
  )
}
