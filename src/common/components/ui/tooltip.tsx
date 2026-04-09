'use client'

import { useState } from 'react'
import { cn } from '@/common/helpers/helpers'

export type TooltipAlign = 'center' | 'left' | 'right'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  align?: TooltipAlign
}

export function Tooltip({ content, children, className, align = 'center' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocusCapture={() => setVisible(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          setVisible(false)
        }
      }}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute bottom-full mb-1.5 z-50',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            align === 'left' && 'left-0',
            align === 'right' && 'right-0',
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
