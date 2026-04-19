export type Role = 'creator' | 'im' | 'accounts'

export type InvoiceStatus =
  | 'submitted'
  | 'im_review'
  | 'im_approved'
  | 'audit_cleared'
  | 'partially_paid'
  | 'audit_rejected'
  | 'payer_rejected_audit'
  | 'payer_rejected_im'
  | 'released'
  | 'rejected'

export interface PaymentHistoryEntry {
  /** ISO date/time string of the payment event */
  created_at: string
  /** Amount released/paid in this event */
  amount: number
  /** Reason category selected by payer */
  reason: string
  /** Optional note to creator */
  note?: string | null
}

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  im_member_name?: string
  created_at: string
}

export interface InvoiceCreatorRef {
  gst_number?: string | null
  pan_number?: string | null
}

export interface Invoice {
  id: string
  creator_id: string
  creator_name: string
  /** When API embeds creator identity (e.g. pan_number) */
  creator?: InvoiceCreatorRef
  campaign: string
  amount: number
  gst: boolean
  account_holder_name?: string
  pan?: string
  /** When present from API, shown in invoice detail identity card (preferred over legacy `pan`) */
  pan_number?: string | null
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
  /** IM return / fix-request copy when API sends it separately from rejection_note */
  im_remark?: string | null
  rejection_note: string
  /** Set when auditor clears for payment (1% of base when TDS applied) */
  tds_amount?: number | null
  /** True when AP auditor applied 1% TDS on clear for payment */
  tds_deducted?: boolean | null
  /** Agency commission % (preferred API field) */
  commission_rate?: number | null
  /** Legacy / alternate field for commission % */
  commission_percentage?: number | null
  /** Rupee amount deducted for agency commission */
  commission_amount?: number | null
  /** Base + GST − TDS after audit */
  final_payable_amount?: number | null
  /** Total amount already released/paid against this invoice (for partial releases) */
  amount_paid?: number | null
  /** Payment releases / partial release notes from Final Payer */
  payment_history?: PaymentHistoryEntry[] | null
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
