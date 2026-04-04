interface PageHeaderProps {
  title: string
  subtitle: string
  action?: { label: string; onClick: () => void }
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between">
      <div>
        <h1 className="font-serif text-xl text-text">{title}</h1>
        <p className="mt-1 text-sm text-text-2">{subtitle}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-r bg-gradient-to-r from-accent to-accent-2 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
