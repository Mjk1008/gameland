'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Extends the base setInterval+fetch idiom already used in BottomNav.tsx
// (notif-count, 30s/no backoff) with a visibility check — skips fetching
// while the tab is hidden, and refetches immediately when it comes back —
// so a backgrounded phone doesn't keep polling a live match day for nothing.
export function usePolling<T>(url: string, opts?: { activeMs?: number; initial?: T }) {
  const activeMs = opts?.activeMs ?? 8000
  const [data, setData] = useState<T | null>(opts?.initial ?? null)
  const urlRef = useRef(url)
  urlRef.current = url

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(urlRef.current)
      if (res.ok) setData(await res.json())
    } catch { /* keep last good snapshot on a transient failure */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      fetch(url).then(r => (r.ok ? r.json() : null)).then(j => { if (!cancelled && j) setData(j) }).catch(() => {})
    }
    const id = setInterval(tick, activeMs)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [url, activeMs])

  return { data, setData, refresh }
}
