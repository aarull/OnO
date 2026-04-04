export type Role = 'creator' | 'im' | 'accounts'

export type InvoiceStatus = 'submitted' | 'im_review' | 'im_approved' | 'released' | 'rejected'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  im_member_name?: string
  created_at: string
}

export interface Invoice {
  id: string
  creator_id: string
  creator_name: string
  campaign: string
  amount: number
  gst: boolean
  account_no: string
  ifsc: string
  assigned_im: string
  status: InvoiceStatus
  rejection_note: string
  created_at: string
  updated_at: string
}

export interface AuditEntry {
  id: string
  invoice_id: string
  action: string
  done_by: string
  note: string
  created_at: string
}
