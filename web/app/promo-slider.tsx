'use client'
import { useState, useEffect } from 'react'
import { C } from '@/components/ui'

// Auto-advancing promo carousel for the top of the home page.
export default function PromoSlider({ images }: { images: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(() => setI(v => (v + 1) % images.length), 4500)
    return () => clearInterval(t)
  }, [images.length])
  if (!images.length) return null
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.line}`, background: C.sf1 }}>
      {images.map((src, idx) => (
        <img key={src} src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: idx === i ? 1 : 0, transition: 'opacity .6s ease' }} />
      ))}
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
          {images.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} aria-label={`اسلاید ${idx + 1}`} style={{ all: 'unset', cursor: 'pointer', width: idx === i ? 18 : 6, height: 6, borderRadius: 999, background: idx === i ? C.accent : 'rgba(255,255,255,.5)', transition: 'width .3s' }} />
          ))}
        </div>
      )}
    </div>
  )
}
