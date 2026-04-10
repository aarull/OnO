export type Role = 'creator' | 'im' | 'accounts'

export type InvoiceStatus =
  | 'submitted'
  | 'im_review'
  | 'im_approved'
  | 'audit_cleared'
  | 'audit_rejected'
  | 'released'
  | 'rejected'

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
  account_holder_name?: string
  pan?: string
  gst_number?: string
  account_no: string
  ifsc: string
  assigned_im: string
  /** Optional override; otherwise IM_PHONE_DIRECTORY lookup by assigned_im */
  assigned_im_phone?: string
  invoice_number?: string
  /** Present when creator uploaded a PDF; fetch with auth to open/download */
  invoice_file_url?: string
  status: InvoiceStatus
  rejection_note: string
  /** Set when auditor clears for payment (1% of base when TDS applied) */
  tds_amount?: number | null
  /** Base + GST − TDS after audit */
  final_payable_amount?: number | null
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
