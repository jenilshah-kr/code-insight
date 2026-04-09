'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { ClaudeCostHint } from '@/common/components/claude-cost-disclosure'
import { FeatureBadges } from './feature-badges'
import { formatCost, formatDuration, formatDate, workspaceDisplayName, encodeSlug, getConversationModel, shortConversationModelName } from '@/common/helpers/formatters'
import type { ConversationWithFacet } from '@/common/types/models'

const PAGE_LIMIT = 25

type SortField = 'start_time' | 'duration_minutes' | 'total_messages' | 'estimated_cost' | 'premium_requests' | 'tool_calls' | 'model'

type SortOrder = 'asc' | 'desc'

interface Props {
  sessions: ConversationWithFacet[]
}

function SortableHeader({
  label, k, sortKey, sortDir, onSort, hint, align = 'left',
}: {
  label: string
  k: SortField
  sortKey: SortField
  sortDir: SortOrder
  onSort: (k: SortField) => void
  hint?: React.ReactNode
  align?: 'left' | 'right'
}) {
  const active = sortKey === k
  return (
    <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      <button
        onClick={() => onSort(k)}
        className={`text-left text-[12px] font-bold uppercase tracking-wider whitespace-nowrap hover:text-foreground transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {label} {active ? (sortDir === 'desc' ? '↓' : '↑') : ''}
      </button>
      {hint}
    </div>
  )
}

export function ConversationList({ sessions }: Props) {
  const { source, capabilities } = useAnalyticsSource()
  const [sortKey, setSortKey] = useState<SortField>('start_time')
  const [sortDir, setSortDir] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [filterCompacted, setFilterCompacted] = useState(false)
  const [filterAgent, setFilterAgent] = useState(false)
  const [filterMcp, setFilterMcp] = useState(false)
  const [filterAbandoned, setFilterAbandoned] = useState(false)
  const [search, setSearch] = useState('')

  function isAbandoned(s: ConversationWithFacet) {
    const totalMsgs = (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)
    const totalTools = Object.values(s.tool_counts ?? {}).reduce((sum, c) => sum + c, 0)
    return totalMsgs < 6 && totalTools < 5 && (s.git_commits ?? 0) === 0
  }

  const abandonedCount = useMemo(() => sessions.filter(isAbandoned).length, [sessions])

  const filtered = useMemo(() => {
    let s = sessions
    if (filterCompacted) s = s.filter(x => x.has_compaction)
    if (filterAgent)     s = s.filter(x => x.uses_task_agent)
    if (filterMcp)       s = s.filter(x => x.uses_mcp)
    if (filterAbandoned) s = s.filter(isAbandoned)
    if (search) {
      const q = search.toLowerCase()
      s = s.filter(x =>
        x.project_path?.toLowerCase().includes(q) ||
        x.first_prompt?.toLowerCase().includes(q) ||
        x.slug?.toLowerCase().includes(q)
      )
    }
    return s
  }, [sessions, filterCompacted, filterAgent, filterMcp, filterAbandoned, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === 'model') {
        const am = getConversationModel(a) ?? ''
        const bm = getConversationModel(b) ?? ''
        return sortDir === 'desc' ? bm.localeCompare(am) : am.localeCompare(bm)
      }
      let av: number, bv: number
      if (sortKey === 'start_time') {
        av = new Date(a.start_time).getTime()
        bv = new Date(b.start_time).getTime()
      } else if (sortKey === 'total_messages') {
        av = (a.user_message_count ?? 0) + (a.assistant_message_count ?? 0)
        bv = (b.user_message_count ?? 0) + (b.assistant_message_count ?? 0)
      } else if (sortKey === 'tool_calls') {
        av = Object.values(a.tool_counts ?? {}).reduce((s, c) => s + c, 0)
        bv = Object.values(b.tool_counts ?? {}).reduce((s, c) => s + c, 0)
      } else {
        av = (a[sortKey] as number) ?? 0
        bv = (b[sortKey] as number) ?? 0
      }
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_LIMIT)
  const paginated = sorted.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT)

  function toggleSort(key: SortField) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Search project or prompt..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="bg-muted border border-border rounded px-2 py-1 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 w-52"
        />
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={filterCompacted}
            onChange={e => { setFilterCompacted(e.target.checked); setPage(1) }}
            className="accent-amber-500"
          />
          ⚡ compacted
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={filterAgent}
            onChange={e => { setFilterAgent(e.target.checked); setPage(1) }}
            className="accent-purple-500"
          />
          🤖 agent
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={filterMcp}
            onChange={e => { setFilterMcp(e.target.checked); setPage(1) }}
            className="accent-blue-500"
          />
          🔌 mcp
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={filterAbandoned}
            onChange={e => { setFilterAbandoned(e.target.checked); setPage(1) }}
            className="accent-red-500"
          />
          👻 abandoned
        </label>
        <span className="ml-auto text-[13px] text-muted-foreground">
          {filtered.length} sessions
          {abandonedCount > 0 && !filterAbandoned && (
            <span className="text-muted-foreground/40 ml-2">
              · {abandonedCount} ghost ({Math.round(abandonedCount / sessions.length * 100)}%)
            </span>
          )}
        </span>
      </div>

      {/* Table */}
      <div className="border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-3 py-2 text-left"><SortableHeader label="Date" k="start_time" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2 text-left"><span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Project</span></th>
                <th className="px-3 py-2 text-right"><SortableHeader label="Dur" k="duration_minutes" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2 text-right"><SortableHeader label="Msgs" k="total_messages" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2 text-right"><SortableHeader label="Tools" k="tool_calls" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2 text-left"><SortableHeader label="Model" k="model" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2 text-right">
                  <SortableHeader
                    label={source === 'claude' ? 'Est. cost' : 'Premium'}
                    k={source === 'claude' ? 'estimated_cost' : 'premium_requests'}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={toggleSort}
                    align="right"
                    hint={source === 'claude' ? <ClaudeCostHint align="right" /> : undefined}
                  />
                </th>
                <th className="px-3 py-2 text-left"><span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Flags</span></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => {
                const totalMsgs = (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)
                const totalTools = Object.values(s.tool_counts ?? {}).reduce((sum, c) => sum + c, 0)
                const projectName = workspaceDisplayName(s.project_path ?? '')
                const projectHref = s.project_path ? `/projects/${encodeSlug(s.project_path)}` : null

                return (
                  <tr
                    key={s.session_id}
                    className={`border-b border-border/50 hover:bg-muted transition-colors ${i % 2 === 0 ? '' : 'bg-muted/30'}`}
                  >
                    <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                      {formatDate(s.start_time)}
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      {capabilities.sessionDetail ? (
                        <Link
                          href={`/sessions/${s.session_id}`}
                          className="text-foreground hover:text-primary transition-colors font-medium truncate block"
                          title={s.project_path ?? ''}
                        >
                          {projectName}
                        </Link>
                      ) : projectHref && capabilities.projectDetail ? (
                        <Link
                          href={projectHref}
                          className="text-foreground hover:text-primary transition-colors font-medium truncate block"
                          title={s.project_path ?? ''}
                        >
                          {projectName}
                        </Link>
                      ) : (
                        <span
                          className="text-foreground font-medium truncate block"
                          title="Session detail is not available in Copilot mode"
                        >
                          {projectName}
                        </span>
                      )}
                      {s.first_prompt && (
                        <p className="text-muted-foreground/60 truncate text-[12px]">
                          {s.first_prompt.slice(0, 60)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                      {formatDuration(s.duration_minutes ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {totalMsgs.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {totalTools.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap text-[12px]">
                      {shortConversationModelName(s)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-primary">
                      {source === 'claude' ? formatCost(s.estimated_cost) : (s.premium_requests ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <FeatureBadges
                          has_compaction={s.has_compaction}
                          uses_task_agent={s.uses_task_agent}
                          uses_mcp={s.uses_mcp}
                          uses_web_search={s.uses_web_search}
                          uses_web_fetch={s.uses_web_fetch}
                          has_thinking={s.has_thinking}
                        />
                        {isAbandoned(s) && (
                          <span className="text-muted-foreground/40 text-[11px]" title="Ghost session: few messages, no commits, no tool calls">👻</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground/50 text-[13px]">
                    No sessions match filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} · {sorted.length} sessions
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ←
            </button>
            {(() => {
              const maxVisible = Math.min(5, totalPages)
              const startPage = Math.max(1, Math.min(page - 2, totalPages - maxVisible + 1))
              const numPages = Math.min(maxVisible, totalPages - startPage + 1)
              const pages = Array.from({ length: numPages }, (_, i) => startPage + i)
              return pages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-2 py-1 rounded border transition-colors ${p === page ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
                >
                  {p}
                </button>
              ))
            })()}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
