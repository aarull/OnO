import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { Invoice } from '../../lib/types'
import { Modal } from '../shared/Modal'
import { FormInput } from '../shared/FormInput'
import { FormSelect } from '../shared/FormSelect'
import { ToggleGroup } from '../shared/ToggleGroup'
import { Button } from '../shared/Button'

const IM_MEMBER_NAMES = [
  'Prerna Chaturvedi',
  'Arnav Pratap Singh',
  'Riya Garg',
  'Aman Pachisia',
] as const

export interface CreatorFixInvoicePayload {
  status: 'submitted'
  rejection_note: null
  campaign: string
  amount: number
  gst: boolean
  pan_number: string
  gst_number: string
  account_holder_name: string
  account_no: string
  ifsc: string
  assigned_im: string
}

interface CreatorFixInvoiceModalProps {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onSave: (invoiceId: string, payload: CreatorFixInvoicePayload) => Promise<void>
}

function panFromInvoice(inv: Invoice): string {
  return (inv.pan_number ?? inv.pan ?? '').trim()
}

export function CreatorFixInvoiceModal({
  open,
  invoice,
  onClose,
  onSave,
}: CreatorFixInvoiceModalProps) {
  const [campaign, setCampaign] = useState('')
  const [amount, setAmount] = useState('')
  const [gst, setGst] = useState('yes')
  const [pan, setPan] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [assignedIm, setAssignedIm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !invoice) return
    setCampaign(invoice.campaign ?? '')
    setAmount(String(invoice.amount ?? ''))
    setGst(invoice.gst ? 'yes' : 'no')
    setPan(panFromInvoice(invoice))
    setGstNumber((invoice.gst_number ?? '').trim())
    setAccountHolderName((invoice.account_holder_name ?? '').trim())
    setAccountNo((invoice.account_no ?? '').trim())
    setIfsc((invoice.ifsc ?? '').trim())
    setAssignedIm(invoice.assigned_im ?? '')
    setErrors({})
    setSubmitting(false)
  }, [open, invoice])

  function clearPanGstError() {
    setErrors((prev) => {
      if (!prev.panOrGst) return prev
      const { panOrGst: _, ...rest } = prev
      return rest
    })
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!campaign.trim()) next.campaign = 'Campaign name is required'
    if (!amount || Number(amount) <= 0) next.amount = 'Enter a valid base amount'
    if (!assignedIm.trim()) next.assignedIm = 'Please select an IM member'
    if (!pan.trim() && !gstNumber.trim()) {
      next.panOrGst = 'Provide either a PAN or GST number'
    }
    if (!accountNo.trim()) next.accountNo = 'Account number is required'
    if (!ifsc.trim()) next.ifsc = 'IFSC code is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!invoice) return
    if (!validate()) {
      toast.error('Please fix the highlighted fields')
      return
    }
    setSubmitting(true)
    try {
      const payload: CreatorFixInvoicePayload = {
        status: 'submitted',
        rejection_note: null,
        campaign: campaign.trim(),
        amount: Number(amount),
        gst: gst === 'yes',
        pan_number: pan.trim().toUpperCase(),
        gst_number: gstNumber.trim().toUpperCase(),
        account_holder_name: accountHolderName.trim(),
        account_no: accountNo.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        assigned_im: assignedIm.trim(),
      }
      await onSave(invoice.id, payload)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    onClose()
  }

  if (!invoice) return null

  const imOptions = IM_MEMBER_NAMES.map((name) => ({ value: name, label: name }))

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Fix & resubmit invoice"
      subtitle={`${invoice.id} — update details and return to the start of the review pipeline.`}
      footer={
        <>
          <Button variant="outline" size="sm" disabled={submitting} onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="accent" size="sm" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Saving…' : 'Save & resubmit'}
          </Button>
        </>
      }
    >
      <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pr-1">
        <div className="rounded-r border border-amber/35 bg-amber/[0.07] px-3 py-2 text-xs text-text-2">
          Your invoice will be set back to <span className="font-medium text-amber">Submitted</span>{' '}
          and the IM remark cleared after you save.
        </div>

        <FormInput
          label="Campaign name"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          error={errors.campaign}
        />

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[140px] flex-1">
              <FormInput
                label="Base amount (₹)"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
              />
            </div>
            <div className="pb-0.5">
              <p className="mb-1 text-xs font-medium text-text-2">GST +18%</p>
              <ToggleGroup
                options={[
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' },
                ]}
                value={gst}
                onChange={setGst}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="PAN number"
            placeholder="e.g. ABCDE1234F"
            value={pan}
            onChange={(e) => {
              setPan(e.target.value.toUpperCase())
              clearPanGstError()
            }}
            maxLength={10}
            className="font-mono uppercase"
          />
          <FormInput
            label="GST number"
            placeholder="e.g. 22AAAAA0000A1Z5"
            value={gstNumber}
            onChange={(e) => {
              setGstNumber(e.target.value.toUpperCase())
              clearPanGstError()
            }}
            maxLength={15}
            className="font-mono uppercase"
          />
        </div>
        {errors.panOrGst && <p className="text-xs text-red">{errors.panOrGst}</p>}

        <FormInput
          label="Account holder name"
          placeholder="Name as per bank records"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Bank account number"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            error={errors.accountNo}
          />
          <FormInput
            label="IFSC code"
            placeholder="e.g. SBIN0001234"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
            error={errors.ifsc}
            className="font-mono uppercase"
          />
        </div>

        <FormSelect
          label="Assign to IM member"
          options={[{ value: '', label: 'Select IM member' }, ...imOptions]}
          value={assignedIm}
          onChange={(e) => setAssignedIm(e.target.value)}
          error={errors.assignedIm}
        />
      </div>
    </Modal>
  )
}
