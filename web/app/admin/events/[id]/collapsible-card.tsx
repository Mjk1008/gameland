'use client'
import { useState } from 'react'
import { C } from '@/components/ui'

export default function CollapsibleCard({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 15px',
        }}
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.thi, textAlign: 'right' }}>{title}</span>
        {badge && <span style={{ fontSize: 11, color: C.tmut }}>{badge}</span>}
        <span style={{ color: C.tmut, fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '0 15px 15px', borderTop: `1px solid ${C.line}` }}>{children}</div>}
    </div>
  )
}
