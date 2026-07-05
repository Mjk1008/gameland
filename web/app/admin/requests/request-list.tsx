'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, Num, EmptyState } from '@/components/ui'

interface Row { regId: string; attempts: number; name: string; tag: string; phone: string; city: string; event: string }

export default function RequestList({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function act(regId: string, action: 'approve' | 'reject') {
    if (action === 'reject' && !confirm('رد این ثبت‌نام؟')) return
    setBusy(regId)
    try {
      const res = await fetch('/api/admin/reg-approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regId, action }) })
      if (!res.ok) { const j = await res.json(); alert(j.error || 'خطا') }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: C.thi }}>درخواست‌های ثبت‌نام</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{rows.length}</span> در انتظار</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="درخواست در انتظاری نیست." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map(r => (
            <div key={r.regId} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{r.name}</div>
                  <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11.5, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{r.tag}{r.city ? ` · ${r.city}` : ''}{r.phone ? ` · ${r.phone}` : ''}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Num size={20} color={C.accent}>{r.attempts}</Num>
                  <div style={{ fontSize: 9, color: C.tmut }}>بلیط</div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 8 }}>{r.event}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <button disabled={busy === r.regId} onClick={() => act(r.regId, 'reject')} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', borderRadius: 10, background: C.liveSoft, color: C.live, border: `1px solid ${C.live}55`, fontWeight: 700, fontSize: 13 }}>رد</button>
                <button disabled={busy === r.regId} onClick={() => act(r.regId, 'approve')} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '10px 0', borderRadius: 10, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 13, opacity: busy === r.regId ? 0.6 : 1 }}>تایید</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
