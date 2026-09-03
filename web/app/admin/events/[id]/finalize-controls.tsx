'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'

interface SoloRow { id: string; name: string; tag: string }
interface TeamRow { id: string; name: string; subtitle: string }

export default function FinalizeControls({
  compId, mode, participants, done,
}: {
  compId: string
  mode: 'solo' | 'team'
  participants: SoloRow[] | TeamRow[]
  done: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [ranks, setRanks] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const setRank = (id: string, v: string) => setRanks(prev => ({ ...prev, [id]: v.replace(/\D/g, '') }))

  async function submit() {
    setErr(null)
    const entries = Object.entries(ranks).filter(([, v]) => v !== '')
    if (entries.length === 0) { setErr(mode === 'team' ? 'حداقل مقام یک تیم رو وارد کن' : 'حداقل مقام یک نفر رو وارد کن'); return }
    const seen = new Set<number>()
    const placements = entries.map(([id, v]) => {
      const rank = Number(v)
      if (seen.has(rank)) throw new Error(`مقام ${rank} تکراریه، هر مقام باید یکتا باشه`)
      seen.add(rank)
      return mode === 'team' ? { teamId: id, rank } : { userId: id, rank }
    })
    if (!confirm(`${placements.length} مقام ثبت بشه و مسابقه تموم بشه؟ این کار رنکینگ رو به‌روز می‌کنه.`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/finalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compId, placements }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت نشد، دوباره امتحان کن')
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  if (participants.length === 0) {
    return (
      <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '4px 0' }}>
        {mode === 'team' ? 'برای ثبت نتایج، اول باید تیم‌های کامل و تأییدشده داشته باشیم.' : 'برای ثبت نتایج نهایی، اول باید بازیکن ثبت‌نام‌شده داشته باشیم.'}
      </div>
    )
  }

  const unit = mode === 'team' ? 'تیم' : 'بازیکن'
  const filled = Object.values(ranks).filter(Boolean).length

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 15px',
          background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14,
        }}
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.thi }}>ثبت مقام</span>
        <span style={{ fontSize: 11, color: C.tmut }}>
          {participants.length} {unit}
          {filled > 0 && ` · ${filled} واردشده`}
          {done && ' · ثبت‌شده'}
        </span>
        <span style={{ color: C.tmut }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 8, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 15 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 360, overflow: 'auto' }}>
            {participants.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{p.name}</div>
                  {'tag' in p ? (
                    <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 1 }}>@{p.tag}</div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.tmut, marginTop: 1 }}>{(p as TeamRow).subtitle}</div>
                  )}
                </div>
                <input inputMode="numeric" placeholder="مقام" value={ranks[p.id] ?? ''} onChange={e => setRank(p.id, e.target.value)}
                  style={{ width: 64, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 9, padding: '8px 10px', color: C.gold, fontFamily: DISP, fontSize: 15, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
              </div>
            ))}
          </div>

          {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10, marginTop: 10 }}>{err}</div>}

          <button type="button" disabled={busy} onClick={submit}
            style={{ all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box', width: '100%', textAlign: 'center', background: C.gold, color: C.ink, fontWeight: 800, fontSize: 14, padding: '12px 0', borderRadius: 11, marginTop: 12, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'در حال ثبت…' : done ? 'به‌روزرسانی نتایج' : 'ثبت و اعلام نتایج'}
          </button>
        </div>
      )}
    </div>
  )
}
