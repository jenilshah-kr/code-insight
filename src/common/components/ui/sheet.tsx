'use client'

import { useEffect } from 'react'
import { cn } from '@/common/helpers/helpers'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'right' | 'left'
  className?: string
}

export function Sheet({ open, onClose, children, side = 'right', className }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'relative bg-card border-border shadow-xl flex flex-col',
          side === 'right' ? 'ml-auto border-l' : 'mr-auto border-r',
          'w-[480px] max-w-[90vw] h-full overflow-auto',
          className,
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6 pb-3 border-b border-border', className)} {...props} />
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-bold text-foreground pr-8', className)} {...props} />
}

export function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4 flex-1 overflow-auto', className)} {...props} />
}
