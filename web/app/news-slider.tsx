'use client'
import { useEffect, useState } from 'react'
import { C, DISP } from '@/components/ui'

export interface NewsSlide { id: string; cover: string; title: string; body: string; tags: string[] }

// Home news rail + detail modal. Cards snap-scroll like the promo slider;
// tapping opens a full "broadcast" modal: cover hero → title over scrim →
// tag chips → body. Pure CSS animation, no libraries.
export default function NewsSlider({ items }: { items: NewsSlide[] }) {
  const [open, setOpen] = useState<NewsSlide | null>(null)

  // lock page scroll while the modal is up
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (items.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="gl-label" style={{ fontSize: 11, letterSpacing: '.14em', color: C.gold }}>GAMELAND NEWS</span>
        <span style={{ flex: 1, height: 1, background: C.line }} />
        <span style={{ fontSize: 11, color: C.tmut }}>اخبار</span>
      </div>

      {/* rail */}
      <div className="gl-scroll" style={{ display: 'flex', gap: 11, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px', scrollSnapType: 'x mandatory' }}>
        {items.map((n, i) => (
          <button key={n.id} onClick={() => setOpen(n)}
            style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: items.length === 1 ? '100%' : '82%', maxWidth: 420, scrollSnapAlign: 'start', position: 'relative', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.line}`, background: C.sf1, aspectRatio: '16/9' }}>
            <img src={n.cover} alt="" loading={i > 0 ? 'lazy' : undefined} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* scrim + title */}
            <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,10,8,0) 30%, rgba(11,10,8,.55) 62%, rgba(11,10,8,.92) 100%)' }} />
            <span style={{ position: 'absolute', insetInline: 14, bottom: 12 }}>
              {n.tags[0] && <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 800, color: C.gold, background: 'rgba(11,10,8,.66)', border: `1px solid ${C.gold}55`, borderRadius: 6, padding: '3px 8px', marginBottom: 7 }}>{n.tags[0]}</span>}
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: '#fff', lineHeight: 1.7, textShadow: '0 2px 10px rgba(0,0,0,.6)' }}>{n.title}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 10.5, fontWeight: 700, color: C.gold }}>خواندنِ خبر <span style={{ fontSize: 12 }}>‹</span></span>
            </span>
          </button>
        ))}
      </div>

      {/* dots */}
      {items.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 9 }}>
          {items.map((n, i) => <span key={n.id} style={{ width: i === 0 ? 14 : 5, height: 5, borderRadius: 3, background: i === 0 ? C.gold : C.line2 }} />)}
        </div>
      )}

      {/* ── detail modal ── */}
      {open && (
        <div onClick={() => setOpen(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(11,10,8,.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'glFade .22s ease' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, maxHeight: '92dvh', overflowY: 'auto', background: '#171410', border: `1px solid ${C.line2}`, borderBottom: 'none', borderRadius: '22px 22px 0 0', animation: 'glSlideUp .3s cubic-bezier(.2,.9,.3,1)' }}>
            {/* cover hero */}
            <div style={{ position: 'relative', aspectRatio: '16/9' }}>
              <img src={open.cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(23,20,16,0) 45%, rgba(23,20,16,1) 100%)' }} />
              <button onClick={() => setOpen(null)} aria-label="بستن"
                style={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: 12, insetInlineStart: 12, width: 34, height: 34, borderRadius: 999, background: 'rgba(11,10,8,.66)', border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15 }}>✕</button>
              <span style={{ position: 'absolute', top: 14, insetInlineEnd: 14, fontFamily: DISP, fontSize: 10, fontWeight: 800, letterSpacing: '.16em', color: C.gold, background: 'rgba(11,10,8,.66)', border: `1px solid ${C.gold}44`, borderRadius: 7, padding: '4px 9px' }}>NEWS</span>
            </div>

            <div style={{ padding: '2px 20px 30px' }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.thi, lineHeight: 1.75 }}>{open.title}</h2>

              {open.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {open.tags.map(t => (
                    <span key={t} style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}33`, borderRadius: 999, padding: '5px 12px' }}>#{t}</span>
                  ))}
                </div>
              )}

              <div style={{ height: 1, background: `linear-gradient(90deg, ${C.gold}55, transparent)`, margin: '16px 0' }} />

              <div style={{ fontSize: 13.5, color: C.tbody, lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>{open.body || '—'}</div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes glFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes glSlideUp { from { transform: translateY(48px); opacity: .4 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
