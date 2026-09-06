'use client'
import { useEffect, useRef, useState } from 'react'
import { C } from '@/components/ui'
import { NewsStoryModal } from './news-story-modal'

export interface NewsSlide { id: string; cover: string; title: string; body: string; tags: string[]; at: number }

// Small glassy nav arrow shared by the home sliders.
export function GlassArrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  const pos: React.CSSProperties = dir === 'left' ? { left: 8 } : { right: 8 }
  return (
    <button onClick={onClick} aria-label={dir === 'left' ? 'بعدی' : 'قبلی'}
      style={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: '50%', transform: 'translateY(-50%)', ...pos, zIndex: 3, width: 30, height: 30, borderRadius: 999, background: 'rgba(20,17,13,.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <path d="M14 6l-6 6 6 6" /> : <path d="M10 6l6 6-6 6" />}
      </svg>
    </button>
  )
}

// Home news rail + story modal. Snap-scroll cards with glassy side arrows and
// autoplay; autoplay pauses while the modal is open or a finger is on the rail.
// The modal closes smoothly (reverse animation) from ✕ / outside tap.
export default function NewsSlider({ items }: { items: NewsSlide[] }) {
  const [open, setOpen] = useState<NewsSlide | null>(null)
  const [closing, setClosing] = useState(false)
  const [idx, setIdx] = useState(0)
  const rail = useRef<HTMLDivElement>(null)
  const touching = useRef(false)
  const openRef = useRef(false)
  openRef.current = !!open

  function goTo(i: number) {
    const el = rail.current?.children[i] as HTMLElement | undefined
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    if (rail.current) rail.current.dataset.idx = String(i)
    setIdx(i)
  }

  // autoplay — pauses while the modal is open, a finger is down, or the tab is hidden
  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => {
      if (openRef.current || touching.current || document.hidden) return
      const el = rail.current
      if (!el) return
      const next = (Number(el.dataset.idx ?? 0) + 1) % items.length
      const child = el.children[next] as HTMLElement | undefined
      child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      el.dataset.idx = String(next)
      setIdx(next)
    }, 5000)
    return () => clearInterval(t)
  }, [items.length])

  // keep idx in sync with manual swipes (nearest card to the rail center)
  useEffect(() => {
    const el = rail.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const mid = el.getBoundingClientRect().left + el.clientWidth / 2
        let best = 0, bestD = Infinity
        Array.from(el.children).forEach((c, i) => {
          const r = (c as HTMLElement).getBoundingClientRect()
          const d = Math.abs(r.left + r.width / 2 - mid)
          if (d < bestD) { bestD = d; best = i }
        })
        el.dataset.idx = String(best)
        setIdx(best)
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  // lock page scroll while the modal is up
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  function closeModal() {
    setClosing(true)
    setTimeout(() => { setOpen(null); setClosing(false) }, 240)
  }

  if (items.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="gl-label" style={{ fontSize: 11, letterSpacing: '.14em', color: C.gold }}>GAMELAND NEWS</span>
        <span style={{ flex: 1, height: 1, background: C.line }} />
        <span style={{ fontSize: 11, color: C.tmut }}>اخبار</span>
      </div>

      {/* rail + glassy side arrows */}
      <div style={{ position: 'relative' }}>
        <div ref={rail} className="gl-scroll" data-idx="0"
          onTouchStart={() => { touching.current = true }} onTouchEnd={() => { touching.current = false }}
          style={{ display: 'flex', gap: 11, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px', scrollSnapType: 'x mandatory' }}>
          {items.map((n, i) => (
            <button key={n.id} onClick={() => setOpen(n)}
              style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: items.length === 1 ? '100%' : '84%', maxWidth: 430, scrollSnapAlign: 'center', position: 'relative', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.line}`, background: C.sf1, aspectRatio: '2.1/1' }}>
              <img src={n.cover} alt="" loading={i > 0 ? 'lazy' : undefined} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,10,8,0) 26%, rgba(11,10,8,.55) 58%, rgba(11,10,8,.92) 100%)' }} />
              <span style={{ position: 'absolute', insetInline: 14, bottom: 10 }}>
                {n.tags[0] && <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 800, color: C.gold, background: 'rgba(11,10,8,.66)', border: `1px solid ${C.gold}55`, borderRadius: 6, padding: '2px 8px', marginBottom: 5 }}>{n.tags[0]}</span>}
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: '#fff', lineHeight: 1.65, textShadow: '0 2px 10px rgba(0,0,0,.6)' }}>{n.title}</span>
              </span>
            </button>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <GlassArrow dir="right" onClick={() => goTo(Math.max(0, idx - 1))} />
            <GlassArrow dir="left" onClick={() => goTo(Math.min(items.length - 1, idx + 1))} />
          </>
        )}
      </div>

      {/* dots — live index */}
      {items.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 9 }}>
          {items.map((n, i) => (
            <button key={n.id} onClick={() => goTo(i)} aria-label={`خبر ${i + 1}`}
              style={{ all: 'unset', cursor: 'pointer', width: i === idx ? 14 : 5, height: 5, borderRadius: 3, background: i === idx ? C.gold : C.line2, transition: 'width .3s' }} />
          ))}
        </div>
      )}

      {/* story modal — portaled to <body>, shared with the /today news rail */}
      {open && typeof document !== 'undefined' && <NewsStoryModal item={open} closing={closing} onClose={closeModal} />}
    </div>
  )
}
