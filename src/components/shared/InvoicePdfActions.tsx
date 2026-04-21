import type { Invoice } from '../../lib/types'
import { cn } from '../../lib/utils'
import {
  handleInvoiceDownload,
  handleInvoiceView,
  hasBackendPdf,
  hasUploadedPdfFile,
} from '../../lib/invoiceDocumentActions'

const linkStyles =
  'text-xs font-medium text-accent-2 underline-offset-2 transition-colors hover:text-accent hover:underline'
const disabledStyles = 'text-xs font-medium text-text-3 cursor-not-allowed'

interface InvoicePdfActionsProps {
  invoice: Invoice
  onViewTimeline: (invoice: Invoice) => void
  className?: string
  linkClassName?: string
}

export function InvoicePdfActions({
  invoice,
  onViewTimeline,
  className,
  linkClassName,
}: InvoicePdfActionsProps) {
  const pdfReady = hasBackendPdf(invoice) || hasUploadedPdfFile(invoice)

  async function onView(e: React.MouseEvent) {
    e.stopPropagation()
    await handleInvoiceView(invoice, onViewTimeline)
  }

  async function onDownload(e: React.MouseEvent) {
    e.stopPropagation()
    await handleInvoiceDownload(invoice)
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={onView} className={linkClassName ?? linkStyles}>
        View
      </button>
      <span className="select-none text-[10px] text-text-3" aria-hidden>
        ·
      </span>
      {pdfReady ? (
        <button type="button" onClick={onDownload} className={linkClassName ?? linkStyles}>
          Download
        </button>
      ) : (
        <button
          type="button"
          disabled
          title="Processing PDF…"
          className={cn(linkClassName ?? disabledStyles)}
        >
          Download
        </button>
      )}
    </div>
  )
}
