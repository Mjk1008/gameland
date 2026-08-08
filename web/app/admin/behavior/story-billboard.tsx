'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { C } from '@/components/ui'

function StoryBillboardInner({
  text,
  pending,
  showFunnelDrill,
}: {
  text: string
  pending: number
  showFunnelDrill: boolean
}) {
  const pathname = usePathname()
  const search = useSearchParams()

  const drillHref = (view: string) => {
    const p = new URLSearchParams(search.toString())
    p.set('bview', view)
    if (!p.get('tab')) p.set('tab', 'behavior')
    return `${pathname}?${p.toString()}`
  }

  const actionBtn: React.CSSProperties = {
    all: 'unset',
    cursor: 'pointer',
    minHeight: 36,
    display: 'inline-flex',
    alignItems: 'center',
    border: `1px solid ${C.line2}`,
    background: C.sf2,
    color: C.tbody,
    borderRadius: 8,
    padding: '0 12px',
    fontSize: 10,
    fontWeight: 700,
    textDecoration: 'none',
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(168,85,247,.08),rgba(245,166,35,.06))',
      border: '1px solid rgba(168,85,247,.25)',
      borderRadius: 16,
      padding: '14px 16px',
    }}>
      <div className="gl-label" style={{ fontSize: 10, fontWeight: 800, color: C.accent, letterSpacing: '.06em', marginBottom: 6 }}>
        خلاصه
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.85, color: C.thi }}>{text}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {showFunnelDrill && (
          <Link href={drillHref('funnel')} style={actionBtn}>گلوگاه قیف</Link>
        )}
        {pending > 0 && (
          <Link href="/admin/requests" style={{ ...actionBtn, borderColor: C.live, color: C.live }}>
            صف تأیید · {pending}
          </Link>
        )}
        <Link href={drillHref('overview')} style={actionBtn}>روند فعالیت</Link>
        <Link href={drillHref('raw')} style={actionBtn}>رویدادهای خام</Link>
      </div>
    </div>
  )
}

export default function StoryBillboard(props: { text: string; pending: number; showFunnelDrill: boolean }) {
  return (
    <Suspense fallback={<div style={{ minHeight: 80 }} />}>
      <StoryBillboardInner {...props} />
    </Suspense>
  )
}
