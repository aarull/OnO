import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Invoice } from '../lib/types'

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get('/invoices')
      setInvoices(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { invoices, loading, error, refetch }
}

export function useInvoice(id: string) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get(`/invoices/${id}`)
      setInvoice(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { invoice, loading, error, refetch }
}

export async function createInvoice(data: {
  campaign: string
  amount: number
  gst: boolean
  account_no: string
  ifsc: string
  assigned_im: string
}) {
  return api.post('/invoices', data)
}

export async function updateInvoiceStatus(
  id: string,
  status: string,
  note?: string
) {
  return api.patch(`/invoices/${id}/status`, { status, note })
}
