'use client'

import { PageHeader } from '@/common/components/layout/page-header'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import { CalendarHeatmap } from '@/modules/dashboard/components/calendar-heatmap'
import { BusyHoursChart } from '@/modules/dashboard/components/busy-hours-chart'
import { WeekdayChart } from '@/modules/timeline/components/weekday-chart'
import { StreakPanel } from '@/modules/timeline/components/streak-panel'
import { UsageOverTimeChart } from '@/modules/dashboard/components/usage-over-time-chart'
import type { DailyStats } from '@/common/types/models'

interface ActivityData {
  daily_activity: DailyStats[]
  hour_counts: Array<{ hour: number; count: number }>
  dow_counts: Array<{ day: string; count: number }>
  streaks: { current: number; longest: number }
  most_active_day: string
  most_active_day_msgs: number
  total_active_days: number
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-card p-4">
      <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function ActivityPage() {
  const { data, error, isLoading } = useAnalyticsSWR<ActivityData>('/api/activity', {
    refreshInterval: 5_000,
  })
  const showLoading = isLoading && !data

  // hourCounts as Record<string, number> for BusyHoursChart
  const hourCounts = data
    ? Object.fromEntries(data.hour_counts.map(h => [String(h.hour), h.count]))
    : {}

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="claude-code-analytics · activity" subtitle="patterns, streaks, peak hours" />
      <div className="p-6 space-y-6">
        {error && <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {showLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && (
          <>
            {/* Streaks + Peak Hours — compact side by side at top */}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
              <Card title="Streaks & Highlights">
                <StreakPanel
                  current={data.streaks.current}
                  longest={data.streaks.longest}
                  totalActiveDays={data.total_active_days}
                  mostActiveDay={data.most_active_day}
                  mostActiveDayMsgs={data.most_active_day_msgs}
                />
              </Card>
              <Card title="Peak Hours">
                <BusyHoursChart hourCounts={hourCounts} />
              </Card>
              <Card title="Day of Week Patterns">
                <WeekdayChart data={data.dow_counts} />
              </Card>
            </div>

            {/* Activity calendar heatmap — full width, prominent */}
            <Card title="Activity Calendar">
              <CalendarHeatmap data={data.daily_activity} />
            </Card>

            {/* Usage over time — full width, below calendar */}
            <Card title="Usage Over Time">
              <UsageOverTimeChart data={data.daily_activity} days={90} />
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
