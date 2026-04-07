'use client'

import { useState } from 'react'
import { BarChart2, PieChart, Clock } from 'lucide-react'
import { UsageOverTimeChart } from './usage-over-time-chart'
import { BusyHoursChart } from './busy-hours-chart'
import { ModelBreakdownDonut } from './model-breakdown-donut'
import { ProjectActivityDonut } from './project-activity-donut'
import { SessionSummaryTable } from './session-summary-table'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import { formatTokens } from '@/common/helpers/formatters'
import type { DailyStats, ModelMetrics } from '@/common/types/models'
import type { WorkspaceSummary } from '@/common/types/models'

function toMmDdYyyy(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const y = date.getFullYear()
  return `${m}/${d}/${y}`
}

function getDefaultDates() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 7)
  return { from: toMmDdYyyy(from), to: toMmDdYyyy(to) }
}

interface StatItemProps {
  label: string
  value: string | number
  large?: boolean
  color?: string
}

function StatItem({ label, value, large, color = 'var(--foreground)' }: StatItemProps) {
  return (
    <span className="flex items-baseline gap-1.5 shrink-0">
      <span
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 11,
          color: 'var(--muted-foreground)',
          letterSpacing: '0.03em',
        }}
      >
        {label}:
      </span>
      <span
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: large ? 22 : 14,
          fontWeight: 700,
          color,
          letterSpacing: large ? '-0.02em' : '0',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </span>
  )
}

function ChartCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60">{icon}</span>
        <h2
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--muted-foreground)',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

interface DashboardStatsPayload {
  stats: {
    totalMessages: number
    dailyActivity: DailyStats[]
    modelUsage: Record<string, ModelMetrics>
    hourCounts: Record<string, number>
  }
  computed: {
    sessionCount: number
    sessionsThisMonth: number
    sessionsThisWeek: number
    totalTokens: number
    storageBytes: number
  }
}

export function DashboardClient() {
  const defaults = getDefaultDates()
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo] = useState(defaults.to)

  const { data, error, isLoading } = useAnalyticsSWR<DashboardStatsPayload>('/api/stats', { refreshInterval: 5_000 })
  const { data: projectsData } = useAnalyticsSWR<{ projects: WorkspaceSummary[] }>('/api/projects', {
    refreshInterval: 30_000,
  })
  const showLoading = isLoading && !data

  if (error) return <p className="p-6 text-destructive text-sm font-mono">Error: {String(error)}</p>
  if (showLoading) {
    return (
      <div className="p-6 space-y-3">
        <div className="h-8 bg-muted rounded animate-pulse w-2/3" />
        <div className="h-6 bg-muted rounded animate-pulse w-1/4" />
        <div className="grid grid-cols-[1fr_320px] gap-4 mt-4">
          <div className="h-64 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    )
  }
  if (!data) return null

  const { stats, computed } = data
  const hourCounts: Record<string, number> = stats.hourCounts ?? {}
  const projectCount = projectsData?.projects?.filter(p => p.session_count > 0).length ?? '—'

  const storageDisplay =
    computed.storageBytes > 0
      ? computed.storageBytes >= 1_048_576
        ? `${(computed.storageBytes / 1_048_576).toFixed(1)} MB`
        : `${(computed.storageBytes / 1_024).toFixed(1)} KB`
      : '—'

  return (
    <div className="p-6 space-y-4">
      {/* ── Inline stats bar ── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <StatItem label="messages" value={(stats.totalMessages ?? 0).toLocaleString()} large color="var(--metric-messages)" />
        <StatItem label="total sessions" value={computed.sessionCount.toLocaleString()} large color="var(--metric-sessions)" />
        <StatItem label="this month" value={computed.sessionsThisMonth} color="var(--metric-period)" />
        <StatItem label="this week" value={computed.sessionsThisWeek} color="var(--metric-period)" />
        <StatItem label="tokens" value={formatTokens(computed.totalTokens)} large color="var(--metric-tokens)" />
        <StatItem label="projects" value={projectCount} large color="var(--metric-projects)" />
        <StatItem label="storage" value={storageDisplay} large color="var(--metric-storage)" />
      </div>

      {/* ── Date range filter ── */}
      <div className="flex items-center gap-3">
        {(['from', 'to'] as const).map((key) => (
          <label key={key} className="flex items-center gap-2">
            <span
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 11,
                color: 'var(--muted-foreground)',
                letterSpacing: '0.04em',
              }}
            >
              {key}:
            </span>
            <input
              type="text"
              value={key === 'from' ? dateFrom : dateTo}
              onChange={(e) =>
                key === 'from' ? setDateFrom(e.target.value) : setDateTo(e.target.value)
              }
              placeholder="MM/DD/YYYY"
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 12,
                color: 'var(--foreground)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '3px 8px',
                width: 100,
                outline: 'none',
              }}
            />
          </label>
        ))}
      </div>

      {/* ── Row 1: Usage chart (wide) + Project donut (narrow) ── */}
      <div className="grid grid-cols-[1fr_300px] gap-4">
        <ChartCard icon={<BarChart2 size={13} />} title="Token Usage Over Time">
          <UsageOverTimeChart
            data={stats.dailyActivity ?? []}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        </ChartCard>

        <ChartCard icon={<PieChart size={13} />} title="Project Activity Distribution">
          <ProjectActivityDonut />
        </ChartCard>
      </div>

      {/* ── Row 2: Peak hours + Model distribution ── */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard icon={<Clock size={13} />} title="Peak Hours">
          <BusyHoursChart hourCounts={hourCounts} />
        </ChartCard>

        <ChartCard icon={<PieChart size={13} />} title="Model Distribution">
          {stats.modelUsage && Object.keys(stats.modelUsage).length > 0 ? (
            <ModelBreakdownDonut modelUsage={stats.modelUsage} />
          ) : (
            <p className="text-muted-foreground/50 text-sm text-center py-8">No data</p>
          )}
        </ChartCard>
      </div>

      {/* ── Recent conversations ── */}
      <div className="border border-border rounded bg-card p-4">
        <h2
          className="mb-3"
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--muted-foreground)',
            textTransform: 'uppercase',
          }}
        >
          Recent Conversations
        </h2>
        <SessionSummaryTable />
      </div>
    </div>
  )
}
