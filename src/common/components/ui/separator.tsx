import { cn } from '@/common/helpers/helpers'

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'w-[1px] h-full',
        className,
      )}
      {...props}
    />
  )
}
