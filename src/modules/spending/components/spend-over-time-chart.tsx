'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { DailySpend } from '@/common/types/models'
import { formatCost } from '@/common/helpers/formatters'
import { format, parseISO } from 'date-fns'

interface Props {
  daily: DailySpend[]
}

export function SpendOverTimeChart({ daily }: Props) {
  const data = daily.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    total: d.total,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#fbbf24" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCost}
          width={55}
        />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any) => [formatCost(val ?? 0), 'estimated API cost']}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#fbbf24"
          strokeWidth={2}
          fill="url(#gradSpend)"
          dot={false}
          activeDot={{ r: 3, fill: '#fbbf24' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
