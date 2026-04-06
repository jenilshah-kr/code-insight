'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts'
import type { InstrumentSummary } from '@/common/types/models'
import { GROUP_COLORS, classifyTool, instrumentDisplayName } from '@/common/helpers/tool-groups'

interface Props {
  tools: InstrumentSummary[]
}

export function InstrumentRankingChart({ tools }: Props) {
  const top = tools.slice(0, 20)

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, top.length * 28)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          width={120}
          tickFormatter={instrumentDisplayName}
        />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any, _name: any, props: any) => [
            `${(val ?? 0).toLocaleString()} calls · ${props.payload.session_count} sessions`,
            instrumentDisplayName(props.payload.name),
          ]}
        />
        <Bar dataKey="total_calls" radius={[0, 3, 3, 0]}>
          {top.map((t, i) => (
            <Cell key={i} fill={GROUP_COLORS[classifyTool(t.name)]} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
