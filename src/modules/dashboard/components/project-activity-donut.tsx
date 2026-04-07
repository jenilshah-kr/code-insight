'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import type { WorkspaceSummary } from '@/common/types/models'

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f87171', '#fb923c', '#38bdf8']

export function ProjectActivityDonut() {
  const { data, error, isLoading } = useAnalyticsSWR<{ projects: WorkspaceSummary[] }>('/api/projects', {
    refreshInterval: 30_000,
  })
  const showLoading = isLoading && !data

  if (error) return <p className="text-destructive text-sm text-center py-8">Error: {String(error)}</p>
  if (showLoading) return <p className="text-muted-foreground/50 text-sm text-center py-8">Loading…</p>
  if (!data) return null

  const sorted = [...data.projects]
    .filter(p => p.session_count > 0)
    .sort((a, b) => b.session_count - a.session_count)

  if (sorted.length === 0) {
    return <p className="text-muted-foreground/50 text-sm text-center py-8">No data</p>
  }

  const top = sorted.slice(0, 6)
  const others = sorted.slice(6)
  const othersCount = others.reduce((s, p) => s + p.session_count, 0)

  const chartData = [
    ...top.map(p => ({ name: p.display_name, value: p.session_count })),
    ...(othersCount > 0 ? [{ name: 'Others', value: othersCount }] : []),
  ]

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={68}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(val: any) => [val ?? 0, 'sessions']}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend — wraps naturally, no overlap */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
        {chartData.map((entry, i) => (
          <span key={entry.name} className="flex items-center gap-1 min-w-0">
            <span
              className="shrink-0 rounded-full"
              style={{ width: 7, height: 7, background: COLORS[i % COLORS.length] }}
            />
            <span
              className="truncate max-w-[100px]"
              style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-geist-mono), monospace' }}
              title={entry.name}
            >
              {entry.name}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
