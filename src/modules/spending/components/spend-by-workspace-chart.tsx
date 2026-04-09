'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts'
import type { WorkspaceSpend } from '@/common/types/models'
import { formatCost } from '@/common/helpers/formatters'

interface Props {
  projects: WorkspaceSpend[]
}

export function SpendByWorkspaceChart({ projects }: Props) {
  const top = projects.slice(0, 15)

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, top.length * 30)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 60, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatCost}
        />
        <YAxis
          type="category"
          dataKey="display_name"
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          width={130}
        />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any) => [formatCost(val ?? 0), 'estimated API cost']}
        />
        <Bar dataKey="estimated_cost" radius={[0, 3, 3, 0]}>
          {top.map((_, i) => (
            <Cell
              key={i}
              fill={`rgba(251,191,36,${1 - (i / top.length) * 0.6})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
