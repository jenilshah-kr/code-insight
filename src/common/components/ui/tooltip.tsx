'use client'

import { useState } from 'react'
import { cn } from '@/common/helpers/helpers'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50',
            'bg-card border border-border rounded px-2 py-1 text-[12px] text-foreground shadow-lg whitespace-nowrap',
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
