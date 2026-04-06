import { cn } from '@/common/helpers/helpers'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
        variant === 'default' && 'bg-primary/20 text-primary',
        variant === 'outline' && 'border border-border text-muted-foreground',
        variant === 'secondary' && 'bg-muted text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
