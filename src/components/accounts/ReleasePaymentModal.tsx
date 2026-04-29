import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import type { Invoice } from '../../lib/types'
import { fmtAmount } from '../../lib/utils'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'

export type PaymentReason = 'Advance Released' | 'GST Hold' | 'TDS Cut' | 'Custom Note'

const PAYMENT_REASONS: PaymentReason[] = [
  'Advance Released',
  'GST Hold',
  'TDS Cut',
  'Custom Note',
]

const GST_HOLD_NOTE =
  'When you file GST, please send a screenshot to your dedicated IM member to release this hold.'

interface ReleasePaymentModalProps {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onSubmit: (args: {
    invoice: Invoice
    amountToRelease: number
    paymentReason: PaymentReason
    noteToCreator: string
    utrNumber: string
  }) => Promise<void>
}

export function ReleasePaymentModal({ open, invoice, onClose, onSubmit }: ReleasePaymentModalProps) {
  const [amountStr, setAmountStr] = useState('')
  const [utrNumber, setUtrNumber] = useState('')
  const [paymentReason, setPaymentReason] = useState<PaymentReason>('Advance Released')
  const [noteToCreator, setNoteToCreator] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pendingBalance = useMemo(() => {
    if (!invoice) return 0
    const total = Number(invoice.final_payable_amount ?? 0)
    const paid = Number((invoice as Invoice & { amount_paid?: number | null }).amount_paid ?? 0)
    const n = total - paid
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }, [invoice])

  useEffect(() => {
    if (!open || !invoice) return
    setSubmitting(false)
    setPaymentReason('Advance Released')
    setAmountStr(String(pendingBalance))
    setUtrNumber('')
    setNoteToCreator('')
  }, [open, invoice, pendingBalance])

  useEffect(() => {
    if (!open) return
    if (paymentReason === 'GST Hold') {
      setNoteToCreator(GST_HOLD_NOTE)
    }
  }, [open, paymentReason])

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleSubmit() {
    if (!invoice) return
    const n = Number(amountStr.replace(/,/g, '').trim())
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a valid amount greater than zero')
      return
    }
    const utrTrimmed = utrNumber.trim()
    setSubmitting(true)
    try {
      await onSubmit({
        invoice,
        amountToRelease: n,
        paymentReason,
        noteToCreator: noteToCreator.trim(),
        utrNumber: utrTrimmed,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to release payment')
      setSubmitting(false)
    }
  }

  if (!invoice) return null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Release payment"
      subtitle={`${invoice.id} · ${invoice.creator_name} · Pending balance: ${fmtAmount(pendingBalance)}`}
      footer={
        <>
          <Button variant="outline" size="sm" disabled={submitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="green" size="sm" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Releasing…' : 'Release payment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-2">
            Amount to release (₹)
          </label>
          <input
            type="number"
            min={1}
            step="1"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full rounded-r border border-border bg-bg-3 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-text-3">
            Defaulted to pending balance: {fmtAmount(pendingBalance)}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-2">UTR Number</label>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Bank reference / UTR (optional)"
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-2">Payment reason</label>
          <select
            value={paymentReason}
            onChange={(e) => setPaymentReason(e.target.value as PaymentReason)}
            className="w-full appearance-none rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm font-medium text-text transition-colors hover:border-white/15 hover:bg-[#202020] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
          >
            {PAYMENT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-2">Note to creator</label>
          <textarea
            value={noteToCreator}
            onChange={(e) => setNoteToCreator(e.target.value)}
            placeholder="Write a short note for the creator…"
            rows={4}
            className="w-full resize-none rounded-md border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>
      </div>
    </Modal>
  )
}
