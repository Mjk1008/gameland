'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'

interface Row { userId: string; name: string; tag: string }

export default function FinalizeControls({ compId, participants, done }: { compId: string; participants: Row[]; done: boolean }) {
  const router = useRouter()
  const [ranks, setRanks] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const setRank = (userId: string, v: string) => setRanks(prev => ({ ...prev, [userId]: v.replace(/\D/g, '') }))

  async function submit() {
    setErr(null)
    const placements = Object.entries(ranks).filter(([, v]) => v !== '').map(([userId, v]) => ({ userId, rank: Number(v) }))
    if (placements.length === 0) { setErr('حداقل یک مقام وارد کن'); return }
    const seen = new Set<number>()
    for (const p of placements) { if (seen.has(p.rank)) { setErr(`مقام ${p.rank} تکراری است`); return } seen.add(p.rank) }
    if (!confirm(`ثبت ${placements.length} مقام و پایان‌دادن مسابقه؟ این عمل رنکینگ را به‌روز می‌کند.`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/finalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId, placements }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  if (participants.length === 0) {
    return <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '4px 0' }}>برای ثبت نتایج نهایی، اول باید ثبت‌نام داشته باشیم.</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>نتایج نهایی (رده‌بندی)</span>
        {done && <span style={{ fontSize: 10, fontWeight: 700, color: C.info }}>ثبت‌شده · قابل ویرایش</span>}
      </div>
      <div style={{ fontSize: 10, color: C.tmut, marginBottom: 10 }}>مقام هر بازیکن را وارد کن (۱ = قهرمان). خالی = بدون رتبه. امتیاز رنکینگ خودکار محاسبه می‌شود.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {participants.map(p => (
          <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{p.name}</div>
              <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 1 }}>@{p.tag}</div>
            </div>
            <input inputMode="numeric" placeholder="مقام" value={ranks[p.userId] ?? ''} onChange={e => setRank(p.userId, e.target.value)}
              style={{ width: 64, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 9, padding: '8px 10px', color: C.gold, fontFamily: DISP, fontSize: 15, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
          </div>
        ))}
      </div>

      {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10, marginTop: 10 }}>{err}</div>}

      <button type="button" disabled={busy} onClick={submit}
        style={{ all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box', width: '100%', textAlign: 'center', background: C.gold, color: C.ink, fontWeight: 800, fontSize: 14, padding: '12px 0', borderRadius: 11, marginTop: 12, opacity: busy ? 0.6 : 1 }}>
        {busy ? '...' : done ? 'به‌روزرسانی نتایج' : 'قطعی‌سازی و اعلام نتایج'}
      </button>
    </div>
  )
}
