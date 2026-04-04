export const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  im_review: 'IM Review',
  im_approved: 'IM Approved',
  released: 'Released',
  rejected: 'Rejected',
}

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  submitted: { bg: 'bg-blue-bg', text: 'text-blue', dot: 'bg-blue' },
  im_review: { bg: 'bg-amber-bg', text: 'text-amber', dot: 'bg-amber animate-pulse' },
  im_approved: { bg: 'bg-green-bg', text: 'text-green', dot: 'bg-green' },
  released: { bg: 'bg-green-bg border border-green/30', text: 'text-green', dot: 'bg-green' },
  rejected: { bg: 'bg-red-bg', text: 'text-red', dot: 'bg-red' },
}

export const AVATAR_COLORS = [
  { bg: 'bg-accent-bg', text: 'text-accent-2' },
  { bg: 'bg-green-bg', text: 'text-green' },
  { bg: 'bg-amber-bg', text: 'text-amber' },
  { bg: 'bg-red-bg', text: 'text-red' },
  { bg: 'bg-blue-bg', text: 'text-blue' },
]
