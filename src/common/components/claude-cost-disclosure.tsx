'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Tooltip, type TooltipAlign } from '@/common/components/ui/tooltip'
import { cn } from '@/common/helpers/helpers'

export const CLAUDE_COST_DISCLAIMER =
  'Dollar figures shown here are estimated using Claude API token pricing and cache rates. They do not reflect Claude Code subscription charges.'

interface ClaudeCostHintProps {
  label?: ReactNode
  className?: string
  tooltipClassName?: string
  align?: TooltipAlign
}

export function ClaudeCostHint({
  label,
  className,
  tooltipClassName,
  align = 'center',
}: ClaudeCostHintProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 align-middle', className)}>
      {label}
      <Tooltip
        align={align}
        className={cn('w-64 max-w-[18rem] whitespace-normal text-left leading-relaxed', tooltipClassName)}
        content={CLAUDE_COST_DISCLAIMER}
      >
        <span
          tabIndex={0}
          aria-label="Explain Claude cost estimates"
          className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">Explain Claude cost estimates</span>
        </span>
      </Tooltip>
    </span>
  )
}

export function ClaudeCostNote({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] font-mono leading-relaxed text-muted-foreground',
        className,
      )}
    >
      {CLAUDE_COST_DISCLAIMER}
    </div>
  )
}
