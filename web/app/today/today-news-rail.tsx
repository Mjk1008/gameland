'use client'
import { useState } from 'react'
import { C, DISP } from '@/components/ui'
import { NewsStoryModal } from '../news-story-modal'
import type { NewsSlide } from '../news-slider'

// «اخبارِ مسابقه» — small 300×100 cards from the SAME admin/news system as the
// homepage slider (items placed 'today'/'both'), opening the shared story
// modal. No bespoke upload system, per the brief.
export default function TodayNewsRail({ items }: { items: NewsSlide[] }) {
  const [open, setOpen] = useState<NewsSlide | null>(null)
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.tbody }}>اخبارِ مسابقه</span>
        <span style={{ fontSize: 10, color: C.tmut, fontFamily: DISP, letterSpacing: '.1em', fontWeight: 700 }}>NEWS</span>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, direction: 'ltr' }}>
        {items.map(n => (
          <button key={n.id} onClick={() => setOpen(n)} style={{
            all: 'unset', cursor: 'pointer', direction: 'rtl', flexShrink: 0, width: 300, height: 100,
            borderRadius: 13, overflow: 'hidden', border: `1px solid ${C.line2}`, position: 'relative', background: C.sf1,
          }}>
            <img src={n.cover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(11,10,8,.88), rgba(11,10,8,0) 65%)' }} />
            <span style={{ position: 'absolute', insetInline: 10, bottom: 8, fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.6, textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>{n.title}</span>
          </button>
        ))}
      </div>
      {open && <NewsStoryModal item={open} closing={false} onClose={() => setOpen(null)} />}
    </div>
  )
}
