'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { C, EmptyState } from '@/components/ui'
import { gamenetStatusLabel } from '@/lib/gamenet-status'

const REJECT_REASONS = ['اطلاعات ناقص', 'عکس نامعتبر یا غیرواقعی', 'آدرس یا تماس نامعتبر', 'تکراری یا جعلی']

export type GamenetRow = {
  id: string; name: string; city: string; province?: string; address: string; phone?: string
  status: 'pending' | 'verified' | 'rejected'; rejectReason?: string; stations: number
  ownerName: string; ownerTag: string; photoCount: number; coverPhotoId?: string
}

export default function GamenetReviewList({ rows }: { rows: GamenetRow[] }) {
  const router = useRouter()
  const [sel, setSel] = useState<GamenetRow | null>(null)
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const pending = rows.filter(r => r.status === 'pending')

  function openRow(r: GamenetRow) { setSel(r); setRejecting(false); setReason('') }
  function closeSheet() { setClosing(true); setTimeout(() => { setSel(null); setClosing(false) }, 220) }

  useEffect(() => {
    if (!sel) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [sel])

  async function decide(action: 'approve' | 'reject') {
    if (!sel) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/gamenet-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sel.id, action, reason: action === 'reject' ? (reason.trim() || undefined) : undefined }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'انجام نشد'); return }
      closeSheet()
      router.refresh()
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!sel || !confirm(`«${sel.name}» حذف بشه؟ این کار برگشت‌پذیر نیست.`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/gamenet-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sel.id }) })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'حذف نشد'); return }
      closeSheet()
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: C.thi }}>گیم‌نت‌ها</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{pending.length}</span> در انتظار</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState text="هنوز گیم‌نتی ثبت نشده" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => {
            const st = gamenetStatusLabel(r.status)
            return (
              <button key={r.id} onClick={() => openRow(r)}
                style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: C.sf1, border: `1px solid ${r.status === 'pending' ? C.gold + '66' : C.line}`, borderRadius: 13 }}>
                {r.coverPhotoId ? (
                  <img src={`/api/gamenet-photo/${r.coverPhotoId}`} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.line}` }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: C.sf2, border: `1px solid ${C.line}`, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 3 }}>{r.province ? `${r.province}، ` : ''}{r.city} · {r.stations} دستگاه</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 8px', borderRadius: 7, background: st.bg, color: st.color, flexShrink: 0 }}>{st.text}</span>
                <span style={{ color: C.tmut, fontSize: 15, flexShrink: 0 }}>‹</span>
              </button>
            )
          })}
        </div>
      )}

      {sel && typeof document !== 'undefined' && createPortal(
        <div onClick={closeSheet} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(11,10,8,.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: closing ? 'glFadeOut .22s ease forwards' : 'glFade .2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: '#171410', border: `1px solid ${C.line2}`, borderRadius: '22px 22px 0 0', padding: '18px 18px 26px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.thi, marginBottom: 4 }}>{sel.name}</div>
            <div style={{ fontSize: 12, color: C.tmut, marginBottom: 12 }}>{sel.province ? `${sel.province}، ` : ''}{sel.city} · ثبت‌کننده: {sel.ownerName} (@{sel.ownerTag})</div>

            {sel.coverPhotoId && <img src={`/api/gamenet-photo/${sel.coverPhotoId}`} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 12, border: `1px solid ${C.line}` }} />}

            <div style={{ fontSize: 12.5, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11, padding: '10px 13px', lineHeight: 1.8, marginBottom: 10 }}>
              {sel.address}
              {sel.phone && <div dir="ltr" style={{ marginTop: 6, textAlign: 'right' }}>{sel.phone}</div>}
              <div style={{ marginTop: 6, color: C.tmut }}>{sel.photoCount} عکس · {sel.stations} دستگاه</div>
            </div>

            {sel.status === 'rejected' && sel.rejectReason && (
              <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                دلیل رد قبلی: {sel.rejectReason}
              </div>
            )}

            <Link href={`/gamenets/${sel.id}`} style={{ display: 'block', fontSize: 12.5, color: C.accent, marginBottom: 14 }}>صفحهٔ عمومی ›</Link>

            {!rejecting ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sel.status !== 'verified' && (
                  <button disabled={busy} onClick={() => decide('approve')} style={btn(C.win, C.winSoft)}>تأیید گیم‌نت</button>
                )}
                {sel.status !== 'rejected' && (
                  <button disabled={busy} onClick={() => setRejecting(true)} style={btn(C.live, C.liveSoft)}>رد درخواست</button>
                )}
                <button disabled={busy} onClick={remove} style={btn(C.tmut, C.sf2)}>حذف گیم‌نت</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REJECT_REASONS.map(r => (
                    <button key={r} type="button" onClick={() => setReason(r)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, padding: '7px 10px', borderRadius: 9, border: `1px solid ${reason === r ? C.live : C.line}`, background: reason === r ? C.liveSoft : C.sf2, color: reason === r ? C.live : C.tbody }}>{r}</button>
                  ))}
                </div>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="دلیل رد (الزامی)" rows={2} style={{ width: '100%', boxSizing: 'border-box', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10, color: C.thi, fontFamily: 'inherit', fontSize: 12.5, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busy || !reason.trim()} onClick={() => decide('reject')} style={{ ...btn(C.live, C.liveSoft), flex: 1 }}>ثبت رد</button>
                  <button disabled={busy} onClick={() => setRejecting(false)} style={{ ...btn(C.tbody, C.sf2), flex: 1 }}>برگشت</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function btn(color: string, bg: string): React.CSSProperties {
  return { all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 46, fontSize: 13.5, fontWeight: 800, borderRadius: 12, border: `1px solid ${color}55`, background: bg, color }
}
