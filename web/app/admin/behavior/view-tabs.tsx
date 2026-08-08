'use client'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { C } from '@/components/ui'

const VIEWS = [
  { key: 'overview', label: 'خلاصه' },
  { key: 'retention', label: 'ماندگاری' },
  { key: 'paths', label: 'مسیرها' },
  { key: 'raw', label: 'رویدادها' },
] as const

function ViewTabsInner() {
  const pathname = usePathname()
  const search = useSearchParams()
  const view = search.get('bview') ?? 'overview'

  return (
    <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 10px' }}>
      {VIEWS.map(v => {
        const p = new URLSearchParams(search.toString())
        p.set('bview', v.key)
        if (!p.get('tab')) p.set('tab', 'behavior')
        const on = view === v.key
        return (
          <a key={v.key} href={`${pathname}?${p.toString()}`}
            style={{
              all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 11, fontWeight: 700,
              padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
              border: `1px solid ${on ? C.accent : C.line}`,
              background: on ? C.accentSoft : C.sf1,
              color: on ? C.accent : C.tbody,
            }}>
            {v.label}
          </a>
        )
      })}
    </div>
  )
}

export default function BehaviorViewTabs() {
  return (
    <Suspense fallback={null}>
      <ViewTabsInner />
    </Suspense>
  )
}

export type BehaviorView = typeof VIEWS[number]['key']
