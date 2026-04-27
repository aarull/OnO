import { InvoiceDetail } from '../creator/InvoiceDetail'

interface InvoiceDetailPanelProps {
  invoiceId: string | null
  open: boolean
  onClose: () => void
  backLabel?: string
  showReminderToggle?: boolean
  /** When true, creator-style payout breakdown (no TDS line; Base + GST). */
  simplifiedCreatorPayout?: boolean
}

/** Slide-over timeline/detail for table “View” on auto-generated invoices */
export function InvoiceDetailPanel({
  invoiceId,
  open,
  onClose,
  backLabel = 'Back to list',
  showReminderToggle = false,
  simplifiedCreatorPayout = false,
}: InvoiceDetailPanelProps) {
  if (!open || !invoiceId) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Close detail"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className="relative z-[101] h-full w-full max-w-lg overflow-y-auto border-l border-border bg-bg-1 p-6 shadow-2xl sm:max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <InvoiceDetail
          invoiceId={invoiceId}
          onClose={onClose}
          backLabel={backLabel}
          showReminderToggle={showReminderToggle}
          simplifiedCreatorPayout={simplifiedCreatorPayout}
        />
      </div>
    </div>
  )
}
