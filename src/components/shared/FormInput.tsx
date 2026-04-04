import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function FormInput({ label, error, className, id, ...rest }: FormInputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-text-2">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'rounded-r border bg-bg-3 px-3 py-2 text-sm text-text outline-none transition-colors',
          'placeholder:text-text-3 focus:border-accent-border',
          error ? 'border-red' : 'border-border',
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}
