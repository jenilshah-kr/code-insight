'use client'

import { useAnalyticsSource } from '@/common/components/analytics-source-provider'

export function SourceUnsupportedState({
  feature,
  detail,
}: {
  feature: string
  detail: string
}) {
  const { label, productLabel } = useAnalyticsSource()

  return (
    <div className="border border-border rounded bg-card p-6 space-y-3">
      <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">
        Unsupported in {label} mode
      </p>
      <p className="text-foreground text-sm">
        <span className="font-semibold">{feature}</span> is not available in {productLabel} yet.
      </p>
      <p className="text-muted-foreground text-sm">{detail}</p>
    </div>
  )
}
