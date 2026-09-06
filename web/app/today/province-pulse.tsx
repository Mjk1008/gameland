'use client'
import { C, DISP } from '@/components/ui'
import type { ProvincePulse } from '@/lib/today-snapshot'

// Horizontal strip — direction:'ltr' on both the scroll container and its
// content per CLAUDE.md §6: an RTL page opens a horizontal scroller pinned
// to the wrong side otherwise (the bracket tree view learned this already).
// Now tappable (docs/37 §9.4) — selecting a province filters the live feed
// below it instead of just sitting there as a static display.
export default function ProvincePulseStrip({ items, selected, onSelect }: {
  items: ProvincePulse[]
  selected?: string
  onSelect: (province: string | undefined) => void
}) {
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, direction: 'ltr' }}>
      {items.map(p => {
        const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
        const full = p.done >= p.total && p.total > 0
        const on = selected === p.province
        return (
          <button key={p.province} type="button" onClick={() => onSelect(on ? undefined : p.province)}
            style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: 128, background: C.sf1, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 6, direction: 'rtl' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>{p.province}</span>
              <span dir="ltr" style={{ fontSize: 10, color: C.tmut }}>{p.done}/{p.total}</span>
            </div>
            <span style={{ display: 'block', height: 4, borderRadius: 999, background: C.line, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: full ? C.gold : C.accent }} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
