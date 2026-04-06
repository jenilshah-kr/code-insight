import { cn } from '@/common/helpers/helpers'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded bg-muted', className)}
      {...props}
    />
  )
}
