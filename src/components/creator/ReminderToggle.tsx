import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'

interface ReminderToggleProps {
  invoiceId: string
}

export function ReminderToggle({ invoiceId }: ReminderToggleProps) {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (sent || sending) return
    setSending(true)
    try {
      await api.patch(`/invoices/${invoiceId}/reminder`, {})
      toast.success('Reminder sent!')
      setSent(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reminder')
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={sent || sending}
      className={cn(
        'rounded-r border px-4 py-2 text-sm font-medium transition-colors',
        sent
          ? 'border-border bg-bg-3 text-text-3 cursor-not-allowed'
          : 'border-accent-border bg-accent/10 text-accent-2 hover:bg-accent/20'
      )}
    >
      {sending ? 'Sending...' : sent ? 'Reminder Sent' : 'Send Gentle Reminder 🔔'}
    </button>
  )
}
