'use client'
import { useState } from 'react'
import { C } from '@/components/ui'
import { rulesForDisc } from '@/lib/discipline-rules'

// Collapsible variant of the bullet list shown (always-expanded) on
// competitions/[id]/page.tsx — collapsed by default here since the sheet is
// space-constrained. Reuses rulesForDisc(); no new rules content.
export default function RulesAccordion({ disc }: { disc: string }) {
  const [open, setOpen] = useState(false)
  const r = rulesForDisc(disc)
  if (!r) return null
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.thi }}>قوانینِ {r.title}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {r.rules.map((line, i) => (
            <span key={i} style={{ fontSize: 12, color: C.tbody, lineHeight: '20px' }}>· {line}</span>
          ))}
        </div>
      )}
    </div>
  )
}
