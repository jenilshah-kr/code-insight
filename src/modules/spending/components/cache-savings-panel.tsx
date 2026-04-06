'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { ModelSpendBreakdown } from '@/common/types/models'
import { formatCost, formatTokens } from '@/common/helpers/formatters'

interface Props {
  models: ModelSpendBreakdown[]
  totalSavings: number
}

interface RowProps {
  label: string
  value: string
  labelColor?: string
  valueColor?: string
  bold?: boolean
}

function Row({ label, value, labelColor, valueColor, bold }: RowProps) {
  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-geist-mono), monospace',
    fontSize: 13,
    fontWeight: bold ? 700 : 400,
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
      <span style={{ ...mono, color: labelColor ?? 'var(--muted-foreground)' }}>{label}</span>
      <span style={{ ...mono, color: valueColor ?? 'var(--foreground)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

export function CacheSavingsPanel({ models, totalSavings }: Props) {
  const totalCacheRead = models.reduce((s, m) => s + (m.cache_read_tokens ?? 0), 0)
  const totalInput     = models.reduce((s, m) => s + (m.input_tokens     ?? 0), 0)
  const hitRate        = totalCacheRead + totalInput > 0
    ? totalCacheRead / (totalCacheRead + totalInput)
    : 0

  const totalPaid    = models.reduce((s, m) => s + (m.estimated_cost ?? 0), 0)
  const withoutCache = totalPaid + totalSavings

  const donutData = [
    { name: 'hit',  value: hitRate },
    { name: 'miss', value: 1 - hitRate },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, height: 140 }}>
      {/* Metric rows */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        <Row label="Cache hit rate"     value={`${(hitRate * 100).toFixed(1)}%`} valueColor="#34d399" bold />
        <Row label="Context from cache" value={formatTokens(totalCacheRead)} />
        <Row label="Context from input" value={formatTokens(totalInput)} />
        <div style={{ borderTop: '1px solid var(--border)' }} />
        <Row label="Without cache" value={formatCost(withoutCache)} valueColor="var(--destructive)" />
        <Row label="You paid"      value={formatCost(totalPaid)} />
        <Row label="Savings"       value={formatCost(totalSavings)} labelColor="#34d399" valueColor="#34d399" bold />
      </div>

      {/* Recharts donut */}
      <div style={{ width: 140, height: 140, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="72%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill="#34d399" />
              <Cell fill="rgba(248,113,113,0.25)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
