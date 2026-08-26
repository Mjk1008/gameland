'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { C, Wordmark } from '@/components/ui'
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
  // How many posters are actually in the DOM. Each one is a full-size cover blob
  // served through /api/event-cover — mounting all five above the fold costs
  // several MB on first paint. Start with one, pull the next in ahead of the
  // crossfade so the fade still has a frame at opacity 0 to start from.
  const [mountedCount, setMountedCount] = useState(1)

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

  // Second poster is only needed once the first crossfade is due; everything
  // after that mounts one slide ahead of when it is shown.
  useEffect(() => {
    if (posters.length < 2) return
    const t = setTimeout(() => setMountedCount(c => Math.max(c, 2)), 4000)
    return () => clearTimeout(t)
  }, [posters.length])

  useEffect(() => {
    setMountedCount(c => Math.min(posters.length, Math.max(c, slide + 2)))
  }, [slide, posters.length])

  const shown = posters.slice(0, mountedCount)

  const ended = !left
  const finalHours = left && left.d === 0

  return (
    <div style={{ position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 6, margin: '-14px -16px 0' }}>
      <div className="gl-kickoff-slab">
        {left && (
          <div
            className="gl-kickoff"
            role="timer"
            aria-label={`مانده ${faDigits(left.d)} روز و ${padFa(left.h)} ساعت تا شروع ۱۶ شهریور`}
          >
            {posters.length > 0 && (
              <div className="gl-kickoff-wash" aria-hidden>
                {shown.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    decoding="async"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className={slide === i ? 'is-on' : undefined}
                  />
                ))}
              </div>
            )}
            {posters[0] && (
              <div className="gl-kickoff-thumb" aria-hidden>
                {shown.map((src, i) => (
                  // same URL as the wash above, so this is served from cache
                  // (/api/event-cover sets public, max-age=3600) — no second fetch
                  <img
                    key={src}
                    src={src}
                    alt=""
                    decoding="async"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className={slide === i ? 'is-on' : undefined}
                  />
                ))}
              </div>
            )}
            <div className="gl-kickoff-mid">
              {!finalHours && (
                <div className="gl-kickoff-days">
                  <b className="gl-num" suppressHydrationWarning>{faDigits(left.d)}</b>
                  <span>روز</span>
                </div>
              )}
              <div
                dir="ltr"
                className={'gl-num ' + (finalHours ? 'gl-kickoff-time is-hero' : 'gl-kickoff-time')}
                suppressHydrationWarning
              >
                {padFa(left.h)}<span className="gl-kickoff-sep">:</span>
                {padFa(left.m)}<span className="gl-kickoff-sep">:</span>
                {padFa(left.s)}
              </div>
            </div>
            <Link href="/competitions" className="gl-kickoff-cta">ثبت‌نام</Link>
          </div>
        )}
        <div className="gl-kickoff-head">
          <Wordmark size={17} />
          {ended && (
            <span className="gl-label" style={{ fontSize: 11, color: C.tbody, display: 'inline-flex', alignItems: 'center', gap: 6, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 999, padding: '6px 11px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.win }} />LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
