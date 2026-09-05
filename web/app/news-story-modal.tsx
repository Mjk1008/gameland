'use client'
import { createPortal } from 'react-dom'
import { C, DISP } from '@/components/ui'
import { toJalali, faDigits, J_MONTHS } from '@/lib/jalali'
import type { NewsSlide } from './news-slider'

const jdate = (ms: number) => {
  const d = new Date(ms)
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${faDigits(j.jd)} ${J_MONTHS[j.jm - 1]} ${faDigits(j.jy)}`
}

// Full-story bottom sheet, shared by the home NewsSlider and the /today news
// rail (today-news-rail.tsx) so both open the identical portal-based modal
// instead of duplicating ~80 lines of markup/animation. Portaled to
// document.body per CLAUDE.md §6 — a page-entry fade-up transform would
// otherwise re-anchor position:fixed.
export function NewsStoryModal({ item, closing, onClose }: { item: NewsSlide; closing: boolean; onClose: () => void }) {
  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(11,10,8,.78)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: closing ? 'glFadeOut .24s ease forwards' : 'glFade .22s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', background: '#171410', border: `1px solid ${C.line2}`, borderBottom: 'none', borderRadius: '22px 22px 0 0', animation: closing ? 'glSlideDown .24s ease forwards' : 'glSlideUp .3s cubic-bezier(.2,.9,.3,1)' }}>
        <div style={{ position: 'relative', aspectRatio: '1.85/1' }}>
          <img src={item.cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(23,20,16,0) 45%, rgba(23,20,16,1) 100%)' }} />
          <button onClick={onClose} aria-label="بستن"
            style={{ all: 'unset', cursor: 'pointer', position: 'absolute', top: 12, insetInlineStart: 12, width: 34, height: 34, borderRadius: 999, background: 'rgba(11,10,8,.66)', backdropFilter: 'blur(6px)', border: `1px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15 }}>✕</button>
          <span style={{ position: 'absolute', top: 14, insetInlineEnd: 14, fontFamily: DISP, fontSize: 10, fontWeight: 800, letterSpacing: '.16em', color: C.gold, background: 'rgba(11,10,8,.66)', border: `1px solid ${C.gold}44`, borderRadius: 7, padding: '4px 9px' }}>NEWS</span>
        </div>

        <div style={{ padding: '2px 20px 30px' }}>
          <div style={{ fontSize: 10.5, color: C.tmut, marginBottom: 8 }}>{jdate(item.at)} · گیم‌لند</div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.thi, lineHeight: 1.75 }}>{item.title}</h2>

          {item.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {item.tags.map(t => (
                <span key={t} style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}33`, borderRadius: 999, padding: '5px 12px' }}>#{t}</span>
              ))}
            </div>
          )}

          <div style={{ height: 1, background: `linear-gradient(90deg, ${C.gold}55, transparent)`, margin: '16px 0' }} />

          <div style={{ fontSize: 13.5, color: C.tbody, lineHeight: 2.2, whiteSpace: 'pre-wrap' }}>{item.body || '—'}</div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes glFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes glFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes glSlideUp { from { transform: translateY(48px); opacity: .4 } to { transform: translateY(0); opacity: 1 } }
        @keyframes glSlideDown { from { transform: translateY(0); opacity: 1 } to { transform: translateY(56px); opacity: .3 } }
      `}</style>
    </div>,
    document.body,
  )
}
