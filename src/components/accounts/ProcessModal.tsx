import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../shared/Modal'
import type { InvoiceStatus } from '../../lib/types'

type RejectPayerStatus = Extract<
  InvoiceStatus,
  'payer_rejected_audit' | 'payer_rejected_im'
>

interface ProcessModalProps {
  open: boolean
  onClose: () => void
  invoiceId: string
  creatorName: string
  onConfirm: (utr: string) => void | Promise<void>
  /** Final Payer: reject payment back to auditor or IM */
  onRejectPayout?: (status: RejectPayerStatus, remark: string) => void | Promise<void>
}

export function ProcessModal({
  open,
  onClose,
  invoiceId,
  creatorName,
  onConfirm,
  onRejectPayout,
}: ProcessModalProps) {
  const [mode, setMode] = useState<'release' | 'reject'>('release')
  const [utr, setUtr] = useState('')
  const [rejectRemark, setRejectRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode('release')
    setUtr('')
    setRejectRemark('')
    setSubmitting(false)
  }, [open])

  function handleClose() {
    if (submitting) return
    setMode('release')
    setUtr('')
    setRejectRemark('')
    onClose()
  }

  async function handleConfirmRelease() {
    setSubmitting(true)
    try {
      await Promise.resolve(onConfirm(utr.trim()))
      setUtr('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRejectTo(status: RejectPayerStatus) {
    if (!onRejectPayout) return
    const remark = rejectRemark.trim()
    if (!remark) {
      toast.error('Rejection remark is required')
      return
    }
    setSubmitting(true)
    try {
      await Promise.resolve(onRejectPayout(status, remark))
      setRejectRemark('')
      setMode('release')
    } finally {
      setSubmitting(false)
    }
  }

  const isReject = mode === 'reject'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isReject ? 'Reject payment' : 'Release payment'}
      subtitle={
        isReject
          ? `Return ${invoiceId} — ${creatorName}. Choose where to send this invoice.`
          : `Confirm release for ${invoiceId} (${creatorName})`
      }
      footer={
        isReject ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode('release')}
            className="rounded-r border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-bg-3 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={handleClose}
              className="rounded-r border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-bg-3 disabled:opacity-50"
            >
              Cancel
            </button>
            {onRejectPayout && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setMode('reject')}
                className="rounded-r border border-amber/40 bg-amber/10 px-4 py-2 text-sm font-medium text-amber transition-colors hover:bg-amber/20 disabled:opacity-50"
              >
                Reject payment
              </button>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleConfirmRelease()}
              className="rounded-r bg-green/15 px-4 py-2 text-sm font-medium text-green transition-colors hover:bg-green/25 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Mark as released ✓'}
            </button>
          </>
        )
      }
    >
      {isReject ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-2">
              Rejection remark <span className="text-red">*</span>
            </label>
            <textarea
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              placeholder="Explain why payment is being rejected (visible to the receiving team)…"
              rows={4}
              required
              className="w-full resize-none rounded-r border border-border bg-bg-3 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-amber/50 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleRejectTo('payer_rejected_audit')}
              className="flex-1 rounded-r border border-amber/45 bg-amber/10 px-4 py-2.5 text-sm font-medium text-amber transition-colors hover:bg-amber/20 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Reject to AP Auditor'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleRejectTo('payer_rejected_im')}
              className="flex-1 rounded-r border border-red/40 bg-red/10 px-4 py-2.5 text-sm font-medium text-red transition-colors hover:bg-red/20 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Reject to IM team'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-2">Bank UTR</label>
          <input
            type="text"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="e.g. NEFT / RTGS reference"
            autoComplete="off"
            className="w-full rounded-r border border-border bg-bg-3 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
          <p className="mt-2 text-xs text-text-3">
            Optional reference recorded with this release.
          </p>
        </div>
      )}
    </Modal>
  )
}
