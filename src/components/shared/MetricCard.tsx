interface MetricCardProps {
  icon: string
  value: string | number
  label: string
}

export function MetricCard({ icon, value, label }: MetricCardProps) {
  return (
    <div className="rounded-r-2 border border-border bg-bg-2 p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-r bg-bg-3 text-lg">
        {icon}
      </div>
      <p className="text-2xl font-semibold text-text">{value}</p>
      <p className="mt-0.5 text-xs text-text-2">{label}</p>
    </div>
  )
}
