import type { ReactNode, MouseEvent } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, subtitle, children, footer }: ModalProps) {
  if (!open) return null

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md animate-fade-up rounded-r-3 border border-border bg-bg-2 p-8">
        <div className="mb-6">
          <h2 className="font-serif text-lg text-text">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
        </div>

        <div>{children}</div>

        {footer && <div className="mt-6 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}
