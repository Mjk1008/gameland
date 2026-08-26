'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, DISP, Wordmark } from '@/components/ui'
import { faDigits } from '@/lib/jalali'

function padFa(n: number) {
  return faDigits(String(Math.max(0, n)).padStart(2, '0'))
}

function remaining(targetMs: number) {
  const ms = targetMs - Date.now()
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

export default function KickoffBar({ posters, targetMs }: { posters: string[]; targetMs: number }) {
  const [left, setLeft] = useState(() => remaining(targetMs))
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    setLeft(remaining(targetMs))
    const t = setInterval(() => {
      const next = remaining(targetMs)
      setLeft(next)
      if (!next) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [targetMs])

  useEffect(() => {
    if (posters.length < 2) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setSlide(s => (s + 1) % posters.length), 6000)
    return () => clearInterval(t)
  }, [posters.length])

  const ended = !left

  return (
    <div style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 6, margin: '-14px -16px 0' }}>
      {left && (
        <div className="gl-kickoff">
          {posters.length > 0 && (
            <div className="gl-kickoff-wash" aria-hidden>
              {posters.map((src, i) => (
                <img key={src} src={src} alt="" className={slide === i ? 'is-on' : undefined} />
              ))}
            </div>
          )}
          {posters[0] && (
            <div className="gl-kickoff-thumb">
              {posters.map((src, i) => (
                <img key={src} src={src} alt="" className={slide === i ? 'is-on' : undefined} />
              ))}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, position: 'relative', zIndex: 2 }}>
            <div dir="ltr" className="gl-num" suppressHydrationWarning style={{ fontFamily: DISP, fontWeight: 800, fontSize: 23, lineHeight: 1, color: C.gold, letterSpacing: '.04em', fontVariantNumeric: 'tabular-nums', textShadow: '0 1px 10px rgba(20,17,13,.55)' }}>
              {padFa(left.d)}<span style={{ color: 'rgba(245,166,35,.38)', fontWeight: 700, padding: '0 3px', letterSpacing: 0 }}>:</span>
              {padFa(left.h)}<span style={{ color: 'rgba(245,166,35,.38)', fontWeight: 700, padding: '0 3px', letterSpacing: 0 }}>:</span>
              {padFa(left.m)}<span style={{ color: 'rgba(245,166,35,.38)', fontWeight: 700, padding: '0 3px', letterSpacing: 0 }}>:</span>
              {padFa(left.s)}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(246,239,228,.72)', textShadow: '0 1px 8px rgba(20,17,13,.8)' }}>شروع · ۱۶ شهریور</div>
          </div>
          <Link href="/competitions" className="gl-kickoff-cta">ثبت‌نام</Link>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px', background: 'rgba(20,17,13,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
        <Wordmark size={17} />
        {ended && (
          <span className="gl-label" style={{ fontSize: 11, color: C.tbody, display: 'inline-flex', alignItems: 'center', gap: 6, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 11px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.win }} />LIVE
          </span>
        )}
      </div>
    </div>
  )
}
