import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'accent' | 'outline' | 'green' | 'red'
  size?: 'sm' | 'xs'
  children: ReactNode
}

const variantStyles: Record<ButtonProps['variant'], string> = {
  accent:
    'bg-gradient-to-r from-accent to-accent-2 text-white hover:opacity-90 active:opacity-80',
  outline:
    'bg-transparent border border-border text-text-2 hover:bg-bg-3 hover:text-text active:bg-bg-4',
  green: 'bg-green text-white hover:opacity-90 active:opacity-80',
  red: 'bg-red text-white hover:opacity-90 active:opacity-80',
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-sm',
  xs: 'px-3 py-1.5 text-xs',
}

export function Button({
  variant,
  size = 'sm',
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-r font-medium transition-all',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}
