'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/common/components/layout/page-header'
import type { CommandRecord } from '@/common/types/models'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function projectName(p: string) {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}

const PAGE_LIMIT = 50

export default function HistoryPage() {
  const { data, error, isLoading } = useSWR<{ history: CommandRecord[] }>(
    '/api/history?limit=2000', fetcher, { refreshInterval: 30_000 }
  )
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const entries = useMemo(() => {
    const all = [...(data?.history ?? [])].reverse()
    if (!search) return all
    const q = search.toLowerCase()
    return all.filter(e =>
      e.display?.toLowerCase().includes(q) ||
      e.project?.toLowerCase().includes(q)
    )
  }, [data, search])

  const totalPages = Math.ceil(entries.length / PAGE_LIMIT)
  const pageEntries = entries.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT)

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="claude-code-analytics · history" subtitle="~/.claude/history.jsonl" />
      <div className="p-4 md:p-6 space-y-4">
        {error && <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 border border-border rounded bg-card w-full">
                <input
                  className="w-full bg-transparent px-4 py-2.5 text-sm font-mono text-foreground placeholder-muted-foreground/50 outline-none"
                  placeholder="search commands..."
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
              <p className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                <span className="text-[#b45309] dark:text-[#fbbf24] font-bold">{entries.length}</span> entries
              </p>
            </div>

            {pageEntries.length === 0 ? (
              <p className="text-muted-foreground/60 text-sm font-mono text-center py-12">
                {(data.history?.length ?? 0) === 0 ? 'No history found in ~/.claude/history.jsonl' : 'No entries match your search.'}
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  {pageEntries.map((entry, i) => (
                    <div
                      key={i}
                      className="border border-border rounded bg-card px-4 py-3 hover:border-primary/30 transition-colors"
                    >
                      <p className="text-sm font-mono text-foreground leading-relaxed break-words">
                        {entry.display || '—'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {entry.timestamp && (
                          <span className="text-xs font-mono text-muted-foreground/60">
                            {formatTime(entry.timestamp)}
                          </span>
                        )}
                        {entry.project && (
                          <span className="text-xs font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                            {projectName(entry.project)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-sm font-mono border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ← prev
                    </button>
                    <span className="text-sm font-mono text-muted-foreground/60">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm font-mono border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
