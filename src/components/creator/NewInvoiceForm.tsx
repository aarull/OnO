import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { cn, fmtAmount, roundMoney } from '../../lib/utils'
import { PageHeader } from '../layout/PageHeader'
import { FormInput } from '../shared/FormInput'
import { FormSelect } from '../shared/FormSelect'
import { ToggleGroup } from '../shared/ToggleGroup'
import type { Invoice } from '../../lib/types'

const IM_MEMBER_NAMES = [
  'Prerna Chaturvedi',
  'Arnav Pratap Singh',
  'Riya Garg',
  'Aman Pachisia',
] as const

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

type CommissionPercent = 0 | 10 | 20

function AgencyCommissionPills({
  value,
  onChange,
}: {
  value: CommissionPercent
  onChange: (v: CommissionPercent) => void
}) {
  const options: { label: string; value: CommissionPercent }[] = [
    { label: 'None', value: 0 },
    { label: '10%', value: 10 },
    { label: '20%', value: 20 },
  ]
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-text-2">Agency Commission</p>
      <p className="text-[11px] leading-relaxed text-text-3">
        Optional. Deducted from your estimated payout before any accounts-side adjustments.
      </p>
      <div
        className="flex gap-1 rounded-full border border-border bg-bg-3/70 p-1 shadow-inner shadow-black/20"
        role="radiogroup"
        aria-label="Agency commission rate"
      >
        {options.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'min-w-0 flex-1 rounded-full px-3 py-2 text-center text-xs font-semibold tracking-wide transition-all duration-200',
                active
                  ? 'bg-indigo-600 text-white shadow-[0_0_18px_rgba(79,70,229,0.45)] ring-1 ring-indigo-400/40'
                  : 'border border-border/70 bg-bg-2/40 text-text-2 hover:border-border hover:bg-bg-4/60 hover:text-text'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PdfDropzoneProps {
  file: File | null
  onFileChange: (file: File | null) => void
  error?: string
}

function PdfDropzone({ file, onFileChange, error }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(list: FileList | null) {
    const f = list?.[0]
    if (!f) {
      onFileChange(null)
      return
    }
    if (!isPdfFile(f)) {
      toast.error('Only PDF files are allowed')
      onFileChange(null)
      return
    }
    onFileChange(f)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-text-2">Invoice PDF</p>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-r border-2 border-dashed px-4 py-7 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-border focus-visible:ring-offset-2 focus-visible:ring-offset-bg-2',
          dragOver
            ? 'border-accent-border bg-accent/15'
            : error
              ? 'border-red bg-bg-3'
              : 'border-border bg-bg-3 hover:border-accent-border/60 hover:bg-bg-4/80'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          aria-label="Upload invoice PDF"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <span className="text-sm font-medium text-text">Drag and Drop or Click to Upload</span>
        <span className="text-[11px] text-text-3">PDF only</span>
        {file && (
          <span className="mt-1 max-w-full truncate px-2 text-xs font-medium text-accent-2">
            {file.name}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
}

export function NewInvoiceForm() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const [step, setStep] = useState<1 | 2>(1)
  const [campaign, setCampaign] = useState('')
  const [amount, setAmount] = useState('')
  const [gst, setGst] = useState('yes')
  const [commissionPercent, setCommissionPercent] = useState<CommissionPercent>(0)
  const [pan, setPan] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [assignedIm, setAssignedIm] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null)
  const [useSavedDetails, setUseSavedDetails] = useState(true)

  const baseAmount = useMemo(() => {
    const n = Number(amount)
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [amount])

  const gstAmount = useMemo(() => {
    if (gst !== 'yes') return 0
    return roundMoney(baseAmount * 0.18)
  }, [gst, baseAmount])

  const commissionAmount = useMemo(
    () => roundMoney((baseAmount * commissionPercent) / 100),
    [baseAmount, commissionPercent]
  )

  const totalPayable = useMemo(
    () => roundMoney(baseAmount + gstAmount - commissionAmount),
    [baseAmount, gstAmount, commissionAmount]
  )

  function clearPanError() {
    setErrors((prev) => {
      if (!prev.pan) return prev
      const { pan: _, ...rest } = prev
      return rest
    })
  }

  useEffect(() => {
    async function loadMostRecentInvoice() {
      try {
        const data: Invoice[] = await api.get('/invoices')
        const list = Array.isArray(data) ? data : []
        const sorted = [...list].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const last = sorted.find((i) => i.account_no?.trim() && i.ifsc?.trim()) ?? null
        setSavedInvoice(last)
        setUseSavedDetails(Boolean(last))
      } catch {
        setSavedInvoice(null)
        setUseSavedDetails(false)
      }
    }
    void loadMostRecentInvoice()
  }, [])

  useEffect(() => {
    if (!savedInvoice) return
    if (!useSavedDetails) return
    setAccountHolderName(savedInvoice.account_holder_name ?? '')
    setAccountNo(savedInvoice.account_no ?? '')
    setIfsc(savedInvoice.ifsc ?? '')
    setPan((savedInvoice.pan_number ?? savedInvoice.pan ?? '').toUpperCase())
    setErrors((prev) => {
      const { accountNo: _a, ifsc: _i, pan: _p, ...rest } = prev
      return rest
    })
  }, [savedInvoice, useSavedDetails])

  function maskAccount(acct: string) {
    const raw = (acct ?? '').replace(/\s+/g, '')
    const last4 = raw.slice(-4)
    if (!last4) return '****'
    return `****${last4}`
  }

  function validateStep1(): boolean {
    const next: Record<string, string> = {}
    if (!campaign.trim()) next.campaign = 'Campaign name is required'
    if (!amount || Number(amount) <= 0) next.amount = 'Enter a valid amount'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function validateStep2(): boolean {
    const next: Record<string, string> = {}
    if (!assignedIm) next.assignedIm = 'Please select an IM member'
    if (!pan.trim()) next.pan = 'PAN is required'
    if (!accountNo.trim()) next.accountNo = 'Account number is required'
    if (!ifsc.trim()) next.ifsc = 'IFSC code is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function goNext() {
    if (!validateStep1()) return
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step !== 2) return
    if (!validateStep2()) return

    setSubmitting(true)
    try {
      const payload = {
        campaign: campaign.trim(),
        amount: Number(amount),
        gst: gst === 'yes',
        pan: pan.trim(),
        account_holder_name: accountHolderName.trim(),
        account_no: accountNo.trim(),
        ifsc: ifsc.trim(),
        assigned_im: assignedIm,
        document_mode: 'auto',
        commission_rate: commissionPercent,
        commission_percentage: commissionPercent,
        commission_amount: commissionAmount,
      }

      if (pdfFile) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => {
          fd.append(k, typeof v === 'boolean' ? String(v) : String(v ?? ''))
        })
        fd.append('invoice_pdf', pdfFile)
        await api.postForm('/invoices', fd)
      } else {
        await api.post('/invoices', payload)
      }
      toast.success('Invoice submitted!')
      navigate('/dashboard/creator')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit invoice'
      toast.error(message)
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
        className="max-w-[620px] rounded-r-2 border border-white/10 bg-bg-2 p-6 space-y-5"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <div
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              step === 1 ? 'bg-accent-2' : 'bg-border'
            )}
          />
          <div
            className={cn(
              'h-1.5 w-10 rounded-full transition-colors',
              step === 2 ? 'bg-accent-2/80' : 'bg-border'
            )}
          />
          <div
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              step === 2 ? 'bg-accent-2' : 'bg-border'
            )}
          />
        </div>

        {step === 1 && (
          <div className="space-y-5 animate-slide-in">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-3">
                Campaign details
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-3">
                Set your campaign and estimate your payout.
              </p>
            </div>

            <FormInput
              label="Campaign Name"
              placeholder="e.g. Summer Collection Shoot"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              error={errors.campaign}
            />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <FormInput
                      label="Base Amount (₹)"
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
                        { label: 'GST +18%', value: 'yes' },
                        { label: 'No GST', value: 'no' },
                      ]}
                      value={gst}
                      onChange={setGst}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-text-3">GST applicable?</p>
              </div>
              <AgencyCommissionPills value={commissionPercent} onChange={setCommissionPercent} />
            </div>

            {/* Estimated payout card */}
            <div className="rounded-r-2 border border-white/10 bg-gradient-to-b from-bg-3/80 to-bg-3/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-3">
                Estimated payout
              </p>
              <dl className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-text-2">Base</dt>
                  <dd className="font-medium tabular-nums text-text">{fmtAmount(baseAmount)}</dd>
                </div>
                {gstAmount > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-text-2">GST (18%)</dt>
                    <dd className="font-medium tabular-nums text-accent-2">
                      +{fmtAmount(gstAmount)}
                    </dd>
                  </div>
                )}
                {commissionAmount > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-text-2">Agency commission ({commissionPercent}%)</dt>
                    <dd className="font-medium tabular-nums text-red">
                      -{fmtAmount(commissionAmount)}
                    </dd>
                  </div>
                )}
                <div className="border-t border-border pt-3">
                  <div className="flex items-end justify-between gap-3">
                    <dt className="text-sm font-semibold uppercase tracking-wide text-text">
                      Total payable
                    </dt>
                    <dd className="font-serif text-xl font-medium tabular-nums tracking-[-0.02em] text-accent-2">
                      {fmtAmount(totalPayable)}
                    </dd>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-text-3">
                    Final amount may be subject to TDS deductions by accounts after review.
                  </p>
                </div>
              </dl>
            </div>

            <button
              type="button"
              onClick={goNext}
              className="w-full rounded-r bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
            >
              Next: Payout Details →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-slide-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-text-3">
                  Payout &amp; proof
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-text-3">
                  Confirm your banking details and optionally attach your invoice PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-medium text-text-2 hover:text-text"
              >
                ← Back
              </button>
            </div>

            {savedInvoice && (
              <div className="rounded-r-2 border border-white/10 bg-bg-3/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-text-3">
                      Use saved details
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-text-3">
                      Last used: {savedInvoice.account_holder_name ?? '—'} · {maskAccount(savedInvoice.account_no)} ·{' '}
                      {(savedInvoice.ifsc ?? '').slice(0, 4).toUpperCase()}****
                    </p>
                  </div>
                  <ToggleGroup
                    options={[
                      { label: 'On', value: 'on' },
                      { label: 'Off', value: 'off' },
                    ]}
                    value={useSavedDetails ? 'on' : 'off'}
                    onChange={(v) => setUseSavedDetails(v === 'on')}
                  />
                </div>
              </div>
            )}

            {!useSavedDetails && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Account Holder"
                  placeholder="Name as per bank records"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
                <FormInput
                  label="PAN"
                  placeholder="e.g. ABCDE1234F"
                  value={pan}
                  onChange={(e) => {
                    setPan(e.target.value.toUpperCase())
                    clearPanError()
                  }}
                  maxLength={10}
                  className="uppercase"
                  error={errors.pan}
                />
                <FormInput
                  label="Account Number"
                  placeholder="XXXX XXXX XXXX"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  error={errors.accountNo}
                />
                <FormInput
                  label="IFSC"
                  placeholder="e.g. SBIN0001234"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  error={errors.ifsc}
                  className="uppercase"
                />
              </div>
            )}

            {useSavedDetails && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Account Holder"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  disabled
                />
                <FormInput
                  label="PAN"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  disabled
                />
                <FormInput
                  label="Account Number"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  disabled
                />
                <FormInput
                  label="IFSC"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  disabled
                />
              </div>
            )}

            <FormSelect
              label="Assign to IM Member"
              options={[{ value: '', label: 'Select IM member' }, ...imOptions]}
              value={assignedIm}
              onChange={(e) => setAssignedIm(e.target.value)}
              error={errors.assignedIm}
            />

            {/* Optional PDF upload */}
            <div className="pt-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-3">
                Upload invoice PDF (optional)
              </p>
              <PdfDropzone
                file={pdfFile}
                onFileChange={(f) => {
                  setPdfFile(f)
                  setErrors((prev) => {
                    if (!prev.invoicePdf) return prev
                    const { invoicePdf: _, ...rest } = prev
                    return rest
                  })
                }}
                error={errors.invoicePdf}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-r bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Invoice →'}
            </button>
          </div>
        )}
      </form>
    </>
  )
}
