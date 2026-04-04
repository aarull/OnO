import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { AuditEntry } from '../lib/types'

export function useAuditLog(invoiceId?: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const path = invoiceId ? `/audit?invoice_id=${invoiceId}` : '/audit'
      const data = await api.get(path)
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit log')
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { entries, loading, error, refetch }
}
