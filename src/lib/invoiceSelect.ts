/**
 * Columns on the Supabase `invoices` table used by the creator dashboard list.
 * Keep in sync with DB migrations; dedupe before joining for PostgREST `.select()`.
 */
export const CREATOR_INVOICE_SELECT_COLUMNS = [
  'id',
  'creator_id',
  'creator_name',
  'campaign',
  'amount',
  'gst',
  'account_holder_name',
  'pan_number',
  'gst_number',
  'account_no',
  'ifsc',
  'assigned_im',
  'assigned_im_phone',
  'invoice_number',
  'invoice_file_url',
  'status',
  'im_remark',
  'rejection_note',
  'tds_amount',
  'tds_deducted',
  'tds_percentage',
  'final_payable_amount',
  'amount_paid',
  'payment_history',
  'created_at',
  'updated_at',
  'cleared_at',
] as const

export function creatorInvoiceSelect(): string {
  return [...new Set(CREATOR_INVOICE_SELECT_COLUMNS)].join(',')
}
