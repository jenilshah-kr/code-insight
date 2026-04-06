'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ModelMetrics } from '@/common/types/models'
import { calcTotalCostFromModel } from '@/common/helpers/rates'
import { formatCost } from '@/common/helpers/formatters'

const COLORS = ['#fbbf24', '#60a5fa', '#34d399', '#a78bfa', '#f87171', '#fb923c']

interface Props {
  modelUsage: Record<string, ModelMetrics>
}

function shortModel(m: string): string {
  if (m.includes('opus-4-6'))   return 'Opus 4.6'
  if (m.includes('opus-4-5'))   return 'Opus 4.5'
  if (m.includes('sonnet-4-6')) return 'Sonnet 4.6'
  if (m.includes('sonnet-4-5')) return 'Sonnet 4.5'
  if (m.includes('haiku-4-5'))  return 'Haiku 4.5'
  return m.split('-').slice(-2).join(' ')
}

export function ModelBreakdownDonut({ modelUsage }: Props) {
  const data = Object.entries(modelUsage)
    .map(([model, usage]) => ({
      name: shortModel(model),
      value: calcTotalCostFromModel(model, usage),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return <p className="text-muted-foreground/50 text-sm text-center py-8">No data</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any) => [formatCost(val ?? 0), 'cost']}
        />
        <Legend
          formatter={(value) => <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
