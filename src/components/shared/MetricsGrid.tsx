import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface MetricsGridProps {
  children: ReactNode
  columns?: 3 | 4
}

export function MetricsGrid({ children, columns = 4 }: MetricsGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'
      )}
    >
      {children}
    </div>
  )
}
