import { useCallback, useEffect, useState } from 'react'

// Tick that increments every `intervalMs` and on `refresh()`; lists reload when it changes.
// Paused while the tab is hidden, with an immediate refresh when it becomes visible.
export function useAutoRefresh(intervalMs: number) {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((count) => count + 1), [])

  useEffect(() => {
    let timer: number | undefined
    const start = () => {
      timer = window.setInterval(refresh, intervalMs)
    }
    const stop = () => window.clearInterval(timer)
    const onVisibilityChange = () => {
      stop()
      if (!document.hidden) {
        refresh()
        start()
      }
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs, refresh])

  return { tick, refresh }
}
