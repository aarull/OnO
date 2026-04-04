import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: Array<{ value: string; label: string }>
  error?: string
}

export function FormSelect({ label, options, error, className, id, ...rest }: FormSelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-xs font-medium text-text-2">
        {label}
      </label>
      <select
        id={selectId}
        className={cn(
          'rounded-r border bg-bg-3 px-3 py-2 text-sm text-text outline-none transition-colors',
          'focus:border-accent-border',
          error ? 'border-red' : 'border-border',
          className
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}
