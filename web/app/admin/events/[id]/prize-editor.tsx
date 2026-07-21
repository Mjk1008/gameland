'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, inp, Button } from '@/components/ui'

const fmt = (n: number) => n.toLocaleString('fa-IR')

export default function PrizeEditor({ compId, prize, initialSplit }: { compId: string; prize: number; initialSplit: number[] }) {
  const router = useRouter()
  // rows are amounts in تومان; seed from saved split, else a sensible 3-place default from the total
  const seed = initialSplit.length ? initialSplit
    : prize > 0 ? [Math.round(prize * 1_000_000 * 0.5), Math.round(prize * 1_000_000 * 0.3), Math.round(prize * 1_000_000 * 0.2)]
    : [0]
  const [rows, setRows] = useState<number[]>(seed)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const total = rows.reduce((a, c) => a + (c || 0), 0)
  const setRow = (i: number, v: string) => setRows(r => r.map((x, j) => j === i ? Math.max(0, Math.round(Number(v.replace(/\D/g, '')) || 0)) : x))
  const addRow = () => setRows(r => [...r, 0])
  const delRow = (i: number) => setRows(r => r.filter((_, j) => j !== i))

  async function save() {
    setBusy(true); setMsg(null)
    try {
      const prizeSplit = rows.filter(n => n > 0)
      const res = await fetch('/api/admin/prize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, prizeSplit }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ذخیره نشد')
      setMsg('جایزه‌ها ذخیره شد ✓')
      router.refresh()
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>جایزه‌ها</span>
        <span style={{ fontSize: 11.5, color: C.tmut }}>مجموع: <span className="gl-num" style={{ color: C.gold, fontWeight: 700 }}>{fmt(total)}</span> تومان</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((amount, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 30, height: 44, borderRadius: 9, border: `1px solid ${i < 3 ? C.gold : C.line2}`, color: i < 3 ? C.gold : C.tbody, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISP, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{fmt(i + 1)}</span>
            <input inputMode="numeric" dir="ltr" value={amount ? amount.toString() : ''} onChange={e => setRow(i, e.target.value)}
              placeholder="مبلغ به تومان" style={{ ...inp, fontFamily: DISP, textAlign: 'left', flex: 1 }} />
            <button type="button" onClick={() => delRow(i)} disabled={rows.length <= 1}
              style={{ all: 'unset', cursor: rows.length <= 1 ? 'default' : 'pointer', width: 44, height: 44, borderRadius: 9, background: C.sf2, border: `1px solid ${C.line}`, color: C.live, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: rows.length <= 1 ? 0.4 : 1 }} aria-label="حذف مقام">×</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px dashed ${C.accent}66` }}>+ افزودن مقام</button>

      {msg && <div style={{ fontSize: 12, color: C.tbody, textAlign: 'center' }}>{msg}</div>}
      <Button onClick={save} disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ جایزه‌ها'}</Button>
    </div>
  )
}
