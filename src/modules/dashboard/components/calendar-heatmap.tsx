'use client'

import { useMemo } from 'react'
import { format, startOfWeek, addDays, eachWeekOfInterval } from 'date-fns'
import type { DailyStats } from '@/common/types/models'
import { useAppearance } from '@/common/components/appearance-provider'

interface Props {
  data: DailyStats[]
}

// dark:  empty → dark gray → dim green → mid green → bright green
const DARK_SHADES  = ['#1e2128', '#1e3a2f', '#16a34a', '#22c55e', '#86efac']
// light: empty → very light green → soft green → medium green → vivid green
const LIGHT_SHADES = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127']

const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

export function CalendarHeatmap({ data }: Props) {
  const { theme } = useAppearance()
  const shades = theme === 'dark' ? DARK_SHADES : LIGHT_SHADES

  function getShade(count: number, max: number): string {
    if (count === 0) return shades[0]
    const ratio = count / max
    if (ratio < 0.2) return shades[1]
    if (ratio < 0.4) return shades[2]
    if (ratio < 0.7) return shades[3]
    return shades[4]
  }

  const { weeks, maxCount } = useMemo(() => {
    const countMap = new Map<string, number>()
    let maxCount = 0
    for (const d of data) {
      countMap.set(d.date, d.messageCount)
      if (d.messageCount > maxCount) maxCount = d.messageCount
    }

    const today = new Date()
    const startDate = startOfWeek(addDays(today, -52 * 7), { weekStartsOn: 0 })
    const weekStarts = eachWeekOfInterval({ start: startDate, end: today }, { weekStartsOn: 0 })
    const weeks = weekStarts.map(weekStart =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i)
        const dateStr = format(d, 'yyyy-MM-dd')
        return { date: d, dateStr, count: countMap.get(dateStr) ?? 0 }
      })
    )

    return { weeks, maxCount }
  }, [data])

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5 min-w-max">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {DAYS.map((label, i) => (
            <div key={i} className="h-3 text-[8px] text-muted-foreground/50 flex items-center w-6">
              {label}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            <div className="h-3 text-[8px] text-muted-foreground/40 whitespace-nowrap">
              {week[0].date.getDate() <= 7 ? format(week[0].date, 'MMM') : ''}
            </div>
            {week.map((day, di) => (
              <div
                key={di}
                className="w-3 h-3 rounded-sm cursor-default"
                style={{ backgroundColor: getShade(day.count, maxCount || 1) }}
                title={`${day.dateStr}: ${day.count} messages`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2">
        <span className="text-[13px] text-muted-foreground/40">less</span>
        {shades.map((s, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s }} />
        ))}
        <span className="text-[13px] text-muted-foreground/40">more</span>
      </div>
    </div>
  )
}
