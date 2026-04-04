import { PageHeader } from '../../components/layout/PageHeader'
import { UpdatePasswordForm } from '../../components/settings/UpdatePasswordForm'

export default function Settings() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Settings"
        subtitle="Update your password and account security"
      />
      <UpdatePasswordForm />
    </div>
  )
}
