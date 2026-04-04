import { useState } from 'react'
import { Modal } from '../shared/Modal'

interface ProcessModalProps {
  open: boolean
  onClose: () => void
  invoiceId: string
  creatorName: string
  onConfirm: (note: string) => void
}

export function ProcessModal({ open, onClose, invoiceId, creatorName, onConfirm }: ProcessModalProps) {
  const [note, setNote] = useState('')

  function handleConfirm() {
    onConfirm(note)
    setNote('')
  }

  function handleClose() {
    setNote('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Process Payment"
      subtitle={`Confirm payment processing for ${invoiceId} (${creatorName})`}
      footer={
        <>
          <button
            onClick={handleClose}
            className="rounded-r border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:bg-bg-3"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-r bg-green/15 px-4 py-2 text-sm font-medium text-green transition-colors hover:bg-green/25"
          >
            Mark as Released ✓
          </button>
        </>
      }
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-2">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. NEFT processed via Axis Bank"
          rows={3}
          className="w-full resize-none rounded-r border border-border bg-bg-3 px-3 py-2 text-sm text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
        />
      </div>
    </Modal>
  )
}
