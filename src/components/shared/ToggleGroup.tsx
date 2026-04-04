import { cn } from '../../lib/utils'

interface ToggleGroupProps {
  options: Array<{ label: string; value: string }>
  value: string
  onChange: (value: string) => void
}

export function ToggleGroup({ options, value, onChange }: ToggleGroupProps) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-r border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-accent-border bg-accent/20 text-accent-2'
                : 'border-border bg-bg-3 text-text-2 hover:bg-bg-4 hover:text-text'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
