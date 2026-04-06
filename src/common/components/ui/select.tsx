import { cn } from '@/common/helpers/helpers'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'bg-muted border border-border rounded px-2 py-1 text-[13px] text-foreground outline-none focus:border-primary/50 cursor-pointer',
        className,
      )}
      {...props}
    />
  )
}
