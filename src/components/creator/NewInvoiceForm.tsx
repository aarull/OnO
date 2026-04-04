import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { PageHeader } from '../layout/PageHeader'
import { FormInput } from '../shared/FormInput'
import { FormSelect } from '../shared/FormSelect'
import { ToggleGroup } from '../shared/ToggleGroup'

const IM_MEMBER_NAMES = [
  'Prerna Chaturvedi',
  'Arnav Pratap Singh',
  'Riya Garg',
  'Aman Pachisia',
] as const

export function NewInvoiceForm() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const [campaign, setCampaign] = useState('')
  const [amount, setAmount] = useState('')
  const [gst, setGst] = useState('yes')
  const [pan, setPan] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [assignedIm, setAssignedIm] = useState('')
  const [docMode, setDocMode] = useState('auto')
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (!amount || Number(amount) <= 0) next.amount = 'Enter a valid amount'
    if (!pan.trim() && !gstNumber.trim()) {
      next.panOrGst = 'Please provide either a PAN or GST Number'
    }
    if (!accountNo.trim()) next.accountNo = 'Account number is required'
    if (!ifsc.trim()) next.ifsc = 'IFSC code is required'
    if (!assignedIm) next.assignedIm = 'Please select an IM member'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await api.post('/invoices', {
        campaign: campaign.trim(),
        amount: Number(amount),
        gst: gst === 'yes',
        pan: pan.trim(),
        gst_number: gstNumber.trim(),
        account_holder_name: accountHolderName.trim(),
        account_no: accountNo.trim(),
        ifsc: ifsc.trim(),
        assigned_im: assignedIm,
      })
      toast.success('Invoice submitted!')
      navigate('/dashboard/creator')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit invoice')
    } finally {
      setSubmitting(false)
    }
  }

  const imOptions = IM_MEMBER_NAMES.map((name) => ({ value: name, label: name }))

  return (
    <>
      <PageHeader
        title="New Invoice"
        subtitle="Fill in your campaign and payment details"
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-[580px] rounded-r-2 border border-border bg-bg-2 p-6 space-y-5"
      >
        <FormInput
          label="Campaign Name"
          placeholder="e.g. Summer Collection Shoot"
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          error={errors.campaign}
        />

        <div className="space-y-1.5">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <FormInput
                label="Amount (₹)"
                type="number"
                placeholder="50000"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
              />
            </div>
            <div className="pb-0.5">
              <ToggleGroup
                options={[
                  { label: 'Yes +18%', value: 'yes' },
                  { label: 'No', value: 'no' },
                ]}
                value={gst}
                onChange={setGst}
              />
            </div>
          </div>
          <p className="text-[11px] text-text-3">GST applicable?</p>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="PAN Number"
              placeholder="e.g. ABCDE1234F"
              value={pan}
              onChange={(e) => {
                setPan(e.target.value.toUpperCase())
                clearPanGstError()
              }}
              maxLength={10}
              className="uppercase"
            />
            <FormInput
              label="GST Number"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={gstNumber}
              onChange={(e) => {
                setGstNumber(e.target.value.toUpperCase())
                clearPanGstError()
              }}
              maxLength={15}
              className="uppercase"
            />
          </div>
          {errors.panOrGst && (
            <p className="mt-1.5 text-xs text-red">{errors.panOrGst}</p>
          )}
        </div>

        <FormInput
          label="Account Holder Name"
          placeholder="Name as per bank records"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Account Number"
            placeholder="XXXX XXXX XXXX"
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            error={errors.accountNo}
          />
          <FormInput
            label="IFSC Code"
            placeholder="e.g. SBIN0001234"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value)}
            error={errors.ifsc}
          />
        </div>

        <FormSelect
          label="Assign to IM Member"
          options={[{ value: '', label: 'Select IM member' }, ...imOptions]}
          value={assignedIm}
          onChange={(e) => setAssignedIm(e.target.value)}
          error={errors.assignedIm}
        />

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-text-2">Invoice Document</p>
          <ToggleGroup
            options={[
              { label: 'Auto-generate PDF', value: 'auto' },
              { label: 'Upload PDF', value: 'upload' },
            ]}
            value={docMode}
            onChange={setDocMode}
          />
          {docMode === 'auto' && (
            <p className="text-[11px] text-text-3">
              A PDF invoice will be generated automatically from the details above.
            </p>
          )}
          {docMode === 'upload' && (
            <p className="text-[11px] text-text-3">
              PDF upload will be available in a future update.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-r bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Invoice →'}
        </button>
      </form>
    </>
  )
}
