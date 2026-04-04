import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'

interface RejectModalProps {
  open: boolean
  onClose: () => void
  invoiceId: string
  creatorName: string
  onConfirm: (reason: string) => void
}

export function RejectModal({ open, onClose, invoiceId, creatorName, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState(false)

  function handleConfirm() {
    if (!reason.trim()) {
      setError(true)
      return
    }
    onConfirm(reason.trim())
    setReason('')
    setError(false)
  }

  function handleClose() {
    setReason('')
    setError(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Reject Invoice"
      subtitle={`${invoiceId} · ${creatorName}`}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="red" size="sm" onClick={handleConfirm}>
            Send Rejection
          </Button>
        </>
      }
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-text">
          Rejection reason <span className="text-red">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            if (e.target.value.trim()) setError(false)
          }}
          placeholder="Explain clearly — this will be shown to the creator..."
          rows={4}
          className="w-full resize-none rounded-r border border-border bg-bg-3 px-4 py-3 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
        />
        {error && (
          <p className="mt-2 text-xs text-red">Please provide a rejection reason.</p>
        )}
      </div>
    </Modal>
  )
}
