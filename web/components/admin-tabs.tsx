'use client'
import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { C } from '@/components/ui'

// Page-level tab shell for admin hub pages (content/tournaments/analytics).
// Tab state lives in the URL (?tab=x) so a specific tab is linkable/bookmarkable —
// unlike the small in-page filter chips (e.g. analytics' time-range row), which
// are just view state and stay as local useState there.
export default function HubTabs({ tabs, param = 'tab' }: {
  tabs: { key: string; label: string; content: React.ReactNode }[]
  param?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const active = tabs.find(t => t.key === search.get(param))?.key ?? tabs[0]?.key

  const go = useCallback((key: string) => {
    const qs = new URLSearchParams(search.toString())
    qs.set(param, key)
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false })
  }, [router, pathname, search, param])

  return (
    <div>
      <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 12px' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => go(t.key)}
            style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12.5, fontWeight: 700, padding: '8px 14px', borderRadius: 999, background: active === t.key ? C.accentSoft : C.sf1, border: `1px solid ${active === t.key ? C.accent : C.line}`, color: active === t.key ? C.accent : C.tbody }}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find(t => t.key === active)?.content}
    </div>
  )
}
