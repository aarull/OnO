import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { Invoice } from '../../lib/types'
import { fmtAmount } from '../../lib/utils'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'

interface FixResubmitAccountsModalProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onSubmit: (invoiceId: string, amount: number) => Promise<void>
}

export function FixResubmitAccountsModal({
  open,
  onClose,
  invoice,
  onSubmit,
}: FixResubmitAccountsModalProps) {
  const [amountStr, setAmountStr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && invoice) {
      setAmountStr(String(invoice.amount))
      setSubmitting(false)
    }
  }, [open, invoice])

  async function handleSubmit() {
    if (!invoice) return
    const n = Number(amountStr.replace(/,/g, '').trim())
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a valid base amount greater than zero')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(invoice.id, n)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resubmit')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    onClose()
  }

  if (!invoice) return null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Fix base amount"
      subtitle={`${invoice.id} · ${invoice.creator_name} — after save, the invoice returns to IM approved so AP Audit can re-verify TDS on the new amount.`}
      footer={
        <>
          <Button variant="outline" size="sm" disabled={submitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-r border border-amber/35 bg-amber/[0.07] px-3 py-2 text-xs text-text-2">
          Only the base amount changes here. Prior audit totals are cleared so AP Audit can
          re-apply TDS on the new amount. If banking is wrong, use{' '}
          <span className="font-medium text-amber">Reject to creator</span> instead.
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-2">Base amount (₹)</label>
          <input
            type="number"
            min={1}
            step="1"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full rounded-r border border-border bg-bg-3 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-text-3">
            Current on file: {fmtAmount(invoice.amount)}
            {invoice.gst && ' · GST flag unchanged (18% still applies if enabled)'}
          </p>
        </div>
      </div>
    </Modal>
  )
}
