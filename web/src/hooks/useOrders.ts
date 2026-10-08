import { useEffect, useState } from 'react'
import { fetchOrders, toApiError } from '../api/orders'
import type { ApiError, OrdersResponse } from '../api/orders'

interface Result {
  path: string
  requestKey: string
  data: OrdersResponse | null // last successful response
  error: ApiError | null
}

// Loads the list at `path` (null: nothing to load) and reloads it when `refreshTick` changes.
export function useOrders(path: string | null, refreshTick: number) {
  const [result, setResult] = useState<Result | null>(null)

  // `loading` is derived from this key, so the effect never sets state synchronously.
  const requestKey = `${path}#${refreshTick}`

  useEffect(() => {
    if (path === null) return

    // Ignore responses that arrive after a newer request has started.
    let ignore = false

    fetchOrders(path).then(
      (data) => {
        if (!ignore) setResult({ path, requestKey, data, error: null })
      },
      (error: unknown) => {
        if (ignore) return
        setResult((previous) => ({
          path,
          requestKey,
          data: previous?.path === path ? previous.data : null,
          error: toApiError(error),
        }))
      },
    )

    return () => {
      ignore = true
    }
  }, [path, requestKey])

  // Never show rows from a different list; a refresh of the same list keeps them.
  const current = path !== null && result?.path === path ? result : null

  return {
    orders: current?.data?.orders ?? null,
    generatedAt: current?.data?.generated_at ?? null,
    loading: path !== null && result?.requestKey !== requestKey,
    error: current?.error ?? null,
  }
}
