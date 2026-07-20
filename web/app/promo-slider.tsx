'use client'
import { useState, useEffect } from 'react'
import { C } from '@/components/ui'

export type Slide = { src: string; href?: string }

// Auto-advancing promo carousel for the top of the home page. Each slide can
// link somewhere (a competition page or a custom URL) — set by admin.
export default function PromoSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setI(v => (v + 1) % slides.length), 4500)
    return () => clearInterval(t)
  }, [slides.length])
  if (!slides.length) return null

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.line}`, background: C.sf1 }}>
      {slides.map((s, idx) => {
        const active = idx === i
        const img = <img src={s.src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: active ? 1 : 0, transition: 'opacity .6s ease', pointerEvents: active ? 'auto' : 'none' }} />
        const isExternal = s.href ? /^https?:\/\//.test(s.href) : false
        return s.href
          ? <a key={idx} href={s.href} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ position: 'absolute', inset: 0, display: 'block', pointerEvents: active ? 'auto' : 'none' }} aria-label={`اسلاید ${idx + 1}`}>{img}</a>
          : <div key={idx} style={{ position: 'absolute', inset: 0 }}>{img}</div>
      })}
      {slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 2 }}>
          {slides.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`اسلاید ${idx + 1}`} style={{ all: 'unset', cursor: 'pointer', width: idx === i ? 18 : 6, height: 6, borderRadius: 999, background: idx === i ? C.accent : 'rgba(255,255,255,.5)', transition: 'width .3s' }} />
          ))}
        </div>
      )}
    </div>
  )
}
