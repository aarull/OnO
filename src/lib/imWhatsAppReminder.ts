import toast from 'react-hot-toast'
import type { Invoice } from './types'

export const IM_PHONE_DIRECTORY: Record<string, string> = {
  'Arnav Pratap Singh': '919220605836',
  'Riya Garg': '917455926116',
  'Aman Pachisia': '919220605814',
  'Bhumika Sharma': '919871249753',
  'Prerna Chaturvedi': '919997179214',
}

export function handleWhatsAppReminder(invoice: Invoice): void {
  const imName = invoice.assigned_im || 'Team'
  const invNumber = invoice.invoice_number ?? invoice.id
  const phone = invoice.assigned_im_phone ?? IM_PHONE_DIRECTORY[imName]

  if (!phone) {
    toast.error('No contact number assigned.')
    return
  }

  const message = `Hi ${imName}, this is a gentle reminder regarding the payment for Invoice #${invNumber}. Could you please check the status?`
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
}
