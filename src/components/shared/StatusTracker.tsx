import type { InvoiceStatus } from '../../lib/types'
import { cn } from '../../lib/utils'

interface StatusTrackerProps {
  status: InvoiceStatus
}

const STEPS: { key: InvoiceStatus | 'rejected'; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'im_review', label: 'IM Review' },
  { key: 'im_approved', label: 'IM Approved' },
  { key: 'released', label: 'With Accounts' },
  { key: 'released', label: 'Released' },
]


function getStepIndex(status: InvoiceStatus): number {
  if (status === 'released') return 4
  if (status === 'im_approved') return 2
  if (status === 'im_review') return 1
  if (status === 'submitted') return 0
  return -1
}

export function StatusTracker({ status }: StatusTrackerProps) {
  const isRejected = status === 'rejected'
  const currentIndex = isRejected ? 1 : getStepIndex(status)

  const steps = isRejected
    ? [
        { label: 'Submitted', key: 'submitted' },
        { label: 'IM Review', key: 'im_review' },
        { label: 'Rejected', key: 'rejected' },
      ]
    : STEPS

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const isCompleted = !isRejected && i < currentIndex
        const isCurrent = isRejected ? i === 2 : i === currentIndex
        const isFuture = !isCompleted && !isCurrent
        const isLast = i === steps.length - 1
        const isRejectedStep = isRejected && i === 2

        return (
          <div key={`${step.key}-${i}`} className="flex gap-3">
            {/* Line + circle column */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  isCompleted && 'bg-green text-white',
                  isCurrent && !isRejectedStep && 'bg-accent text-white',
                  isRejectedStep && 'bg-red text-white',
                  isFuture && 'border border-border bg-bg-3 text-text-3'
                )}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isRejectedStep ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-px flex-1 min-h-5',
                    isCompleted ? 'bg-green' : 'bg-border'
                  )}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-5 pt-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted && 'text-green',
                  isCurrent && !isRejectedStep && 'text-accent-2',
                  isRejectedStep && 'text-red',
                  isFuture && 'text-text-3'
                )}
              >
                {step.label}
                {isCurrent && !isRejectedStep && (
                  <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
