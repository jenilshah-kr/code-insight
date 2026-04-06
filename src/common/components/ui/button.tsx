import { cn } from '@/common/helpers/helpers'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded font-mono transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-2 py-1 text-[12px]',
        size === 'md' && 'px-3 py-1.5 text-[13px]',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'outline' && 'border border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
        variant === 'ghost' && 'text-muted-foreground hover:text-foreground hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
