interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
}

export function MetricCard({ label, value, sub, color = 'var(--foreground)' }: MetricCardProps) {
  return (
    <div className="border border-border rounded bg-card p-4 space-y-1">
      <p className="section-label">{label}</p>
      <p
        className="font-mono font-bold tabular-nums leading-none"
        style={{ fontSize: '1.75rem', letterSpacing: '-0.02em', color }}
      >
        {value}
      </p>
      {sub && <p className="text-muted-foreground/60 text-[12px] font-mono">{sub}</p>}
    </div>
  )
}
