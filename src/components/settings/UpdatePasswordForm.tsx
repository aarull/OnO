import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { FormInput } from '../shared/FormInput'

export function UpdatePasswordForm() {
const [password, setPassword] = useState('')
const [confirm, setConfirm] = useState('')
const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
const [submitting, setSubmitting] = useState(false)

function validate(): boolean {
const next: { password?: string; confirm?: string } = {}
if (password.length < 6) {
next.password = 'Password must be at least 6 characters'
}
if (confirm.length < 6) {
next.confirm = 'Confirmation must be at least 6 characters'
}
if (password.length >= 6 && confirm.length >= 6 && password !== confirm) {
next.confirm = 'Passwords do not match'
}
setErrors(next)
return Object.keys(next).length === 0
}

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  // ADD THESE 4 LINES HERE:
  if (!supabase) {
    toast.error('Password updates are temporarily disabled (Missing Keys)')
    return
  }

  if (!validate()) return

setSubmitting(true)
try {
const { error } = await supabase.auth.updateUser({ password })

if (error) {
console.error('[UpdatePassword]', error)
toast.error(error.message || 'Could not update password')
return
}

toast.success('Password updated successfully')
setPassword('')
setConfirm('')
setErrors({})
} catch (err) {
console.error('[UpdatePassword]', err)
toast.error(err instanceof Error ? err.message : 'Could not update password')
} finally {
setSubmitting(false)
}
}

return (
<form
onSubmit={handleSubmit}
className="max-w-[480px] space-y-5 rounded-r-2 border border-border bg-bg-2 p-6"
>
<FormInput
label="New Password"
type="password"
autoComplete="new-password"
placeholder="At least 6 characters"
value={password}
onChange={(e) => {
setPassword(e.target.value)
if (errors.password) setErrors((s) => ({ ...s, password: undefined }))
}}
error={errors.password}
/>
<FormInput
label="Confirm New Password"
type="password"
autoComplete="new-password"
placeholder="Re-enter password"
value={confirm}
onChange={(e) => {
setConfirm(e.target.value)
if (errors.confirm) setErrors((s) => ({ ...s, confirm: undefined }))
}}
error={errors.confirm}
/>
<button
type="submit"
disabled={submitting}
className="w-full rounded-r bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
>
{submitting ? 'Updating…' : 'Update Password'}
</button>
</form>
)
}
