'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/common/components/layout/page-header'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

interface PlanRecord {
  name: string
  content: string
  mtime: string
  project: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function extractTitle(content: string): string | null {
  const firstLine = content.split('\n').find(l => l.trim())
  if (firstLine?.startsWith('#')) return firstLine.replace(/^#+\s*/, '').trim()
  return null
}

// Minimal markdown renderer — handles headings, bold, code, lists, hr, plain text
function MarkdownLine({ line }: { line: string }) {
  // h1
  if (/^#\s/.test(line))
    return <p className="text-foreground font-bold text-base font-mono mt-4 mb-1 first:mt-0">{line.replace(/^#\s/, '')}</p>
  // h2
  if (/^##\s/.test(line))
    return <p className="text-primary font-bold text-sm font-mono mt-3 mb-1">{line.replace(/^##\s/, '')}</p>
  // h3
  if (/^###\s/.test(line))
    return <p className="text-foreground font-semibold text-sm font-mono mt-2 mb-0.5">{line.replace(/^###\s/, '')}</p>
  // hr
  if (/^---+$/.test(line.trim()))
    return <hr className="border-border my-3" />
  // empty
  if (!line.trim())
    return <div className="h-2" />
  // bullet list
  if (/^[-*]\s/.test(line))
    return (
      <p className="text-foreground/80 dark:text-[#cbd5e1] text-sm font-mono flex gap-2">
        <span className="text-primary flex-shrink-0">›</span>
        <InlineMarkdown text={line.replace(/^[-*]\s/, '')} />
      </p>
    )
  // numbered list
  if (/^\d+\.\s/.test(line)) {
    const [num, ...rest] = line.split(/\.\s(.+)/)
    return (
      <p className="text-foreground/80 dark:text-[#cbd5e1] text-sm font-mono flex gap-2">
        <span className="text-primary flex-shrink-0 w-5 text-right">{num}.</span>
        <InlineMarkdown text={rest.join('. ')} />
      </p>
    )
  }
  // code block marker — handled at block level, fallback
  if (line.startsWith('```'))
    return <span className="text-muted-foreground/80 text-xs font-mono">{line}</span>

  return <p className="text-foreground/80 dark:text-[#cbd5e1] text-sm font-mono"><InlineMarkdown text={line} /></p>
}

function InlineMarkdown({ text }: { text: string }) {
  // Bold + italic: ***text***
  // Bold: **text**
  // Inline code: `text`
  const parts = text.split(/(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('***') && p.endsWith('***'))
          return <strong key={i} className="text-primary italic">{p.slice(3, -3)}</strong>
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i} className="text-foreground font-bold">{p.slice(2, -2)}</strong>
        if (p.startsWith('*') && p.endsWith('*'))
          return <em key={i} className="text-muted-foreground italic">{p.slice(1, -1)}</em>
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} className="text-emerald-700 dark:text-[#6ee7b7] bg-muted px-1 rounded text-xs">{p.slice(1, -1)}</code>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const result: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let codeLang = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLang = line.slice(3).trim()
        codeLines = []
      } else {
        inCodeBlock = false
        result.push(
          <div key={i} className="my-2 rounded border border-border bg-muted overflow-x-auto">
            {codeLang && (
              <div className="px-3 py-1 border-b border-border text-[10px] font-mono text-muted-foreground/80">{codeLang}</div>
            )}
            <pre className="px-3 py-2 text-xs font-mono text-foreground leading-relaxed">{codeLines.join('\n')}</pre>
          </div>
        )
        codeLines = []
        codeLang = ''
      }
      continue
    }
    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }
    result.push(<MarkdownLine key={i} line={line} />)
  }

  return <div className="space-y-0.5">{result}</div>
}

function PlanCard({ plan }: { plan: PlanRecord }) {
  const [expanded, setExpanded] = useState(false)
  const lines = plan.content.split('\n').filter(l => l.trim())
  const title = extractTitle(plan.content)
  const words = wordCount(plan.content)

  // Preview: first 8 non-empty lines
  const previewContent = plan.content.split('\n').slice(0, 12).join('\n')
  const hasMore = plan.content.split('\n').length > 12

  return (
    <div className={[
      'border rounded-lg transition-all duration-200',
      expanded ? 'border-primary/50 bg-card' : 'border-border bg-card hover:border-primary/30',
    ].join(' ')}>

      {/* Header — always visible */}
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-[#d97706] text-base">📋</span>
            <span className="text-foreground font-mono text-sm font-bold truncate">
              {title ?? plan.name}
            </span>
          </div>
          {title && title !== plan.name && (
            <p className="text-muted-foreground/80 text-xs font-mono mb-2 pl-7">{plan.name}</p>
          )}
          <div className="flex items-center gap-4 pl-7 flex-wrap">
            <span className="text-muted-foreground/80 text-xs font-mono">{formatDate(plan.mtime)}</span>
            <span className="text-muted-foreground/80 text-xs font-mono">{lines.length} lines</span>
            <span className="text-muted-foreground/80 text-xs font-mono">{words} words</span>
            {plan.project && (
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {plan.project}
              </span>
            )}
          </div>
        </div>
        <div className={[
          'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded border text-xs font-mono transition-colors',
          expanded ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground/80',
        ].join(' ')}>
          {expanded ? '▲' : '▼'}
        </div>
      </button>

      {/* Preview (collapsed) */}
      {!expanded && (
        <div className="px-5 pb-4 border-t border-border/50">
          <div className="pt-3">
            <MarkdownContent content={previewContent} />
            {hasMore && (
              <p className="text-muted-foreground/80 text-xs font-mono mt-2 pl-1">
                — {plan.content.split('\n').length - 12} more lines, click to expand —
              </p>
            )}
          </div>
        </div>
      )}

      {/* Full content (expanded) */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-primary/20">
          <div className="pt-4">
            <MarkdownContent content={plan.content} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlansPage() {
  const { data, error, isLoading } = useSWR<{ plans: PlanRecord[] }>(
    '/api/plans', fetcher, { refreshInterval: 30_000 }
  )
  const [search, setSearch] = useState('')

  const plans = data?.plans ?? []
  const filtered = plans.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="claude-code-analytics · plans" subtitle="~/.claude/plans/" />
      <div className="p-4 md:p-6 space-y-5">

        {error && <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Search + count */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1 border border-border rounded-lg bg-card w-full focus-within:border-primary/40 transition-colors">
                <input
                  className="w-full bg-transparent px-4 py-2.5 text-sm font-mono text-foreground placeholder-muted-foreground/50 outline-none"
                  placeholder="search plans by name or content..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <p className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                <span className="text-amber-600 dark:text-[#fbbf24] font-bold">{filtered.length}</span>
                {filtered.length !== plans.length && (
                  <span className="text-muted-foreground/80"> of {plans.length}</span>
                )} plans
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#d97706] text-2xl mb-3">📋</p>
                <p className="text-muted-foreground/80 text-sm font-mono">
                  {plans.length === 0
                    ? 'No plans found in ~/.claude/plans/'
                    : 'No plans match your search.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(plan => (
                  <PlanCard key={plan.name} plan={plan} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
