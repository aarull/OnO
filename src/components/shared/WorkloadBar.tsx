import { initials, avatarColor, cn } from '../../lib/utils'

interface WorkloadBarProps {
  name: string
  count: number
  total: number
}

export function WorkloadBar({ name, count, total }: WorkloadBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const avatar = avatarColor(name)

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          avatar.bg,
          avatar.text
        )}
      >
        {initials(name)}
      </div>
      <span className="w-28 shrink-0 truncate text-sm text-text">{name}</span>
      <span className="w-8 shrink-0 text-center text-xs font-medium text-text-2">{count}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
