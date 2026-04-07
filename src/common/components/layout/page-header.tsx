'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { Star, RefreshCw } from 'lucide-react'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import {
  getAnalyticsDataRoot,
  getAnalyticsHistoryPath,
  getAnalyticsMemoryPath,
  getAnalyticsPlansPath,
  getAnalyticsSettingsPath,
  getAnalyticsTodosPath,
} from '@/common/helpers/analytics-source'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showStarButton?: boolean
}

const GITHUB_REPO = '/code-insight'

function formatTimestamp(d: Date) {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function PageHeader({ title, subtitle, showStarButton = false }: PageHeaderProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState<string>(() => formatTimestamp(new Date()))
  const { source, productLabel, label } = useAnalyticsSource()

  useEffect(() => {
    const id = setInterval(() => setNow(formatTimestamp(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await mutate(() => true, undefined, { revalidate: true })
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  const displayTime = now || '—'
  const sourceTitlePrefix = source === 'claude' ? 'claude-code-analytics' : 'copilot-cli-analytics'
  const resolvedTitle = title.replace(/^claude-code-analytics/i, sourceTitlePrefix)
  const resolvedSubtitle = subtitle
    ?.replaceAll('~/.claude/history.jsonl', getAnalyticsHistoryPath(source))
    .replaceAll('~/.claude/settings.json', getAnalyticsSettingsPath(source))
    .replaceAll('~/.claude/projects/*/memory/', getAnalyticsMemoryPath(source))
    .replaceAll('~/.claude/plans/', getAnalyticsPlansPath(source))
    .replaceAll('~/.claude/todos/', getAnalyticsTodosPath(source))
    .replaceAll('~/.claude/', `${getAnalyticsDataRoot(source)}/`)

  // Split title: first word large, rest smaller — or show as-is
  const words = resolvedTitle.split(/[-_\s]/)
  const firstWord = words[0]
  const restWords = words.slice(1).join('-')

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      {/* Thin top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.4) 40%, rgba(59,130,246,0.3) 70%, transparent)',
        }}
      />

      <div className="px-6 md:px-8 py-4 flex items-start justify-between gap-4">
        {/* Left: title block */}
        <div className="min-w-0 space-y-1.5">
          {/* Eyebrow */}
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-[1px]"
              style={{ background: 'var(--primary)', opacity: 0.6 }}
            />
            <span className="section-label" style={{ opacity: 0.7 }}>
              Kroger Engineering · {productLabel}
            </span>
          </div>

          {/* Main title */}
          <h1
            className="leading-none font-display"
            style={{ fontWeight: 800, fontSize: '1.65rem', letterSpacing: '-0.01em' }}
          >
            <span className="text-foreground">{firstWord}</span>
            {restWords && (
              <span className="text-muted-foreground/60 font-display" style={{ fontWeight: 600 }}>
                -{restWords}
              </span>
            )}
          </h1>

          {/* Subtitle + timestamp row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
            {resolvedSubtitle && (
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: 12,
                  color: 'var(--muted-foreground)',
                  letterSpacing: '0.04em',
                }}
              >
                {resolvedSubtitle}
              </span>
            )}
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted/50"
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 11,
                color: 'var(--muted-foreground)',
                letterSpacing: '0.03em',
              }}
              suppressHydrationWarning
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--chart-2)', boxShadow: '0 0 4px rgba(52,211,153,0.4)' }}
              />
              {displayTime}
            </span>
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted/50"
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 11,
                color: 'var(--muted-foreground)',
                letterSpacing: '0.03em',
              }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <button
            onClick={handleRefresh}
            aria-label="Refresh data"
            className="flex items-center gap-2 px-4 py-2 rounded border transition-all duration-200 cursor-pointer"
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 12,
              letterSpacing: '0.05em',
              borderColor: refreshing ? 'var(--primary)' : 'var(--border)',
              color: refreshing ? 'var(--primary)' : 'var(--muted-foreground)',
              background: refreshing ? 'rgba(59,130,246,0.05)' : 'transparent',
            }}
          >
            <RefreshCw
              className="w-3.5 h-3.5"
              style={{
                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              }}
            />
            {refreshing ? 'refreshing' : 'refresh'}
          </button>

          {showStarButton && (
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded border transition-all duration-200"
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 12,
                letterSpacing: '0.05em',
                borderColor: 'color-mix(in srgb, var(--label-amber) 40%, transparent)',
                color: 'var(--label-amber)',
                background: 'color-mix(in srgb, var(--label-amber) 6%, transparent)',
              }}
            >
              <Star className="w-3.5 h-3.5" />
              star
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
