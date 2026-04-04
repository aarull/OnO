import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { EmptyState } from './EmptyState'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
}

interface InvoiceTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
}

export function InvoiceTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
}: InvoiceTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState icon="📄" message="No invoices found" />
  }

  return (
    <div className="overflow-x-auto rounded-r-2 border border-border">
      <table className="w-full">
        <thead>
          <tr className="bg-bg-3">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-3"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-border transition-colors',
                onRowClick && 'cursor-pointer hover:bg-bg-3/50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-text">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
