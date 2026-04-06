'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/common/components/layout/page-header'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

interface TodoItem {
  id?: string
  content?: string
  status?: string
  priority?: string
  [key: string]: unknown
}

interface TodoRecord {
  name: string
  data: unknown
  mtime: string
}

type FilterMode = 'all' | 'pending' | 'in_progress' | 'completed'

function parseTodos(data: unknown): TodoItem[] {
  if (Array.isArray(data)) return data as TodoItem[]
  if (data && typeof data === 'object' && 'todos' in data)
    return parseTodos((data as { todos: unknown }).todos)
  return []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function normalizeStatus(s?: string): string {
  return s ?? 'pending'
}

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null
  const styles: Record<string, string> = {
    high:   'bg-[#dc2626]/10 dark:bg-[#f87171]/10 text-[#dc2626] dark:text-[#f87171] border-[#dc2626]/30 dark:border-[#f87171]/30',
    medium: 'bg-[#b45309]/10 dark:bg-[#fbbf24]/10 text-[#b45309] dark:text-[#fbbf24] border-[#b45309]/30 dark:border-[#fbbf24]/30',
    low:    'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30',
  }
  const cls = styles[priority] ?? 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30'
  return (
    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>
      {priority}
    </span>
  )
}

// ── Status icon + color ───────────────────────────────────────────────────────
const STATUS_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  pending:     { icon: '○', color: 'text-muted-foreground', bg: 'bg-muted-foreground/10',  label: 'pending'     },
  in_progress: { icon: '◎', color: 'text-[#b45309] dark:text-[#fbbf24]', bg: 'bg-[#b45309]/10 dark:bg-[#fbbf24]/10', label: 'in progress' },
  completed:   { icon: '✓', color: 'text-[#047857] dark:text-[#6ee7b7]', bg: 'bg-[#047857]/10 dark:bg-[#6ee7b7]/10', label: 'completed'   },
}

function getStatusMeta(s?: string) {
  return STATUS_META[s ?? 'pending'] ?? STATUS_META.pending
}

// ── Filter tab ────────────────────────────────────────────────────────────────
function FilterTab({
  label, count, active, accent, onClick,
}: {
  label: string; count: number; active: boolean; accent: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border transition-all',
        active
          ? `border-[${accent}] bg-[${accent}]/5`
          : 'border-border bg-card hover:border-primary/30',
      ].join(' ')}
    >
      <span className={`text-2xl font-mono font-bold ${active ? `text-[${accent}]` : 'text-foreground'}`}>
        {count}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </button>
  )
}

// ── Todo row ──────────────────────────────────────────────────────────────────
function TodoRow({ item, file }: { item: TodoItem; file: TodoRecord }) {
  const status = normalizeStatus(item.status)
  const meta = getStatusMeta(status)
  const isCompleted = status === 'completed'

  return (
    <div className={[
      'group flex items-start gap-3 px-4 py-3.5 rounded-lg border transition-all',
      isCompleted
        ? 'border-border bg-card'
        : 'border-border bg-card hover:border-primary/30',
    ].join(' ')}>

      {/* Status icon */}
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${meta.bg}`}>
        <span className={`text-xs font-mono font-bold ${meta.color}`}>{meta.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-mono leading-relaxed ${isCompleted ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
          {String(item.content ?? JSON.stringify(item))}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {/* Status badge */}
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>

          {/* Priority */}
          <PriorityBadge priority={item.priority} />

          {/* Source file */}
          <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
            {file.name}
          </span>

          {/* Date */}
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {formatDate(file.mtime)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TodosPage() {
  const { data, error, isLoading } = useSWR<{ todos: TodoRecord[] }>(
    '/api/todos', fetcher, { refreshInterval: 10_000 }
  )
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')

  const todos = data?.todos ?? []

  const allItems: Array<{ file: TodoRecord; item: TodoItem }> = todos.flatMap(file =>
    parseTodos(file.data).map(item => ({ file, item }))
  )

  const counts = {
    all:         allItems.length,
    pending:     allItems.filter(x => normalizeStatus(x.item.status) === 'pending').length,
    in_progress: allItems.filter(x => normalizeStatus(x.item.status) === 'in_progress').length,
    completed:   allItems.filter(x => normalizeStatus(x.item.status) === 'completed').length,
  }

  const filtered = allItems.filter(({ item }) => {
    if (filter !== 'all' && normalizeStatus(item.status) !== filter) return false
    if (search && !String(item.content ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const FILTER_TABS: { key: FilterMode; label: string; accent: string }[] = [
    { key: 'all',         label: 'all',         accent: '#d97706' },
    { key: 'pending',     label: 'pending',     accent: '#94a3b8' },
    { key: 'in_progress', label: 'in progress', accent: '#fbbf24' },
    { key: 'completed',   label: 'done',        accent: '#6ee7b7' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="claude-code-analytics · todos" subtitle="~/.claude/todos/" />
      <div className="p-4 md:p-6 space-y-5">

        {error && <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}

        {isLoading && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Filter tabs with counts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FILTER_TABS.map(({ key, label, accent }) => (
                <FilterTab
                  key={key}
                  label={label}
                  count={counts[key]}
                  active={filter === key}
                  accent={accent}
                  onClick={() => setFilter(key)}
                />
              ))}
            </div>

            {/* Search */}
            <div className="border border-border rounded-lg bg-card focus-within:border-primary/40 transition-colors">
              <input
                className="w-full bg-transparent px-4 py-2.5 text-sm font-mono text-foreground placeholder-muted-foreground/50 outline-none"
                placeholder="search todos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Result count */}
            {(search || filter !== 'all') && (
              <p className="text-xs font-mono text-muted-foreground/60">
                showing <span className="text-[#b45309] dark:text-[#fbbf24]">{filtered.length}</span> of {allItems.length} todos
              </p>
            )}

            {/* List */}
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">✓</p>
                <p className="text-muted-foreground/60 text-sm font-mono">
                  {allItems.length === 0
                    ? 'No todos found in ~/.claude/todos/'
                    : 'No todos match your filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(({ file, item }, i) => (
                  <TodoRow key={i} item={item} file={file} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
