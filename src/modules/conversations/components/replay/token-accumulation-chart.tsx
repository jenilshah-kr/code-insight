'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { SessionTurn } from '@/common/types/models'
import { formatTokens } from '@/common/helpers/formatters'

interface Props {
  turns: SessionTurn[]
  compactions?: unknown[]
}

export { TokenAccumulationChart as UsageAccumulationChart }

export function TokenAccumulationChart({ turns }: Props) {
  let cumulative = 0
  const data = turns
    .filter(t => t.type === 'assistant' && t.usage)
    .map((t, i) => {
      const total = (t.usage?.input_tokens ?? 0) + (t.usage?.output_tokens ?? 0)
      cumulative += total
      return { turn: i + 1, tokens: cumulative, cost: t.estimated_cost ?? 0 }
    })

  if (data.length === 0) return null

  return (
    <div>
      <p className="section-label mb-2">Token Accumulation</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="turn" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={40} tickFormatter={formatTokens} />
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any) => [formatTokens(val ?? 0), 'cumulative tokens']}
          />
          <Line type="monotone" dataKey="tokens" stroke="#60a5fa" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
