interface EmptyStateProps {
  icon: string
  message: string
}

export function EmptyState({ icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 text-sm text-text-3">{message}</p>
    </div>
  )
}
