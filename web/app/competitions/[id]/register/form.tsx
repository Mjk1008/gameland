'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DISC, Disc } from '@/lib/mock-data'
import { C, DISP, Button, StatusChip, BackHeader, DISC_DOT } from '@/components/ui'
import { TICKET, ticketOffPercent, toman } from '@/lib/payment'

interface Props { comp: { id: string; title: string; disc: Disc; status: 'live' | 'open' | 'soon' | 'done'; statusLabel: string; prize: number; format: string; teams: number }; owned: number; remaining: number }

export default function RegisterForm({ comp, owned, remaining }: Props) {
  const router = useRouter()
  const d = DISC[comp.disc]

  const [attempts, setAttempts] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId: comp.id, attempts }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت‌نام انجام نشد، دوباره امتحان کن')
      router.push(`/competitions/${comp.id}/pay`); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="ثبت‌نام در مسابقه" href={`/competitions/${comp.id}`} />

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: DISC_DOT[comp.disc] ?? C.tmut, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.thi }}>{comp.title}</div>
            <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 2 }}>{d.name}</div>
          </div>
          <StatusChip status={comp.status} />
        </div>

        {/* Explainer */}
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, fontSize: 12.5, color: C.tbody, lineHeight: 1.9 }}>
          <div style={{ fontWeight: 700, color: C.thi, marginBottom: 6 }}>چطوری کار می‌کنه؟</div>
          <div>• می‌تونی <b style={{ color: C.thi }}>۱ تا ۶ بلیط</b> بگیری — هر بلیط یه شانس جداست</div>
          <div>• توی مقدماتی، بلیط‌هات توی براکت‌های جدا پخش می‌شن</div>
          <div>• حداکثر <b style={{ color: C.thi }}>۳ seed</b> به فینال می‌رسه</div>
        </div>

        {/* Price + FOMO */}
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>قیمت هر بلیط</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.accent, background: C.accentSoft, borderRadius: 6, padding: '2px 7px' }}>٪{ticketOffPercent} تخفیف</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}><span className="gl-num" style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>{toman(TICKET.price)}</span><span style={{ fontSize: 11, color: C.tbody }}>تومان</span></span>
              <span dir="ltr" style={{ fontFamily: DISP, fontSize: 13, color: C.tmut, textDecoration: 'line-through' }}>{toman(TICKET.original)}</span>
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>پیشنهاد<br />محدود</div>
        </div>

        {/* quota — how many tickets you already hold + how many more you can buy */}
        {owned > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.accentSoft, border: `1px solid ${C.accent}55`, borderRadius: 12, padding: '11px 14px', fontSize: 12.5, color: C.thi, lineHeight: 1.8 }}>
            <span style={{ fontWeight: 700 }}>الان <span className="gl-num" style={{ color: C.accent }}>{owned}</span> سهم داری.</span>
            <span style={{ color: C.tbody }}>تا سقفِ ۶، می‌تونی <span className="gl-num" style={{ color: C.accent }}>{remaining}</span> سهمِ دیگه بخری.</span>
          </div>
        )}

        {/* Ticket picker (capped at the remaining quota) */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 10 }}>{owned > 0 ? 'چند سهمِ دیگه؟' : 'تعداد سهم'}</div>
          <div style={{ display: 'flex', gap: 7 }}>
            {Array.from({ length: Math.min(6, remaining) }, (_, i) => i + 1).map(n => {
              const on = attempts === n
              return (
                <button key={n} type="button" onClick={() => setAttempts(n)} dir="ltr"
                  style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', height: 46, lineHeight: '46px', borderRadius: 11, fontFamily: DISP, fontWeight: 700, fontSize: 19, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}` }}>
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* Total */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 15px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>مبلغ قابل پرداخت</span>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
            <span className="gl-num" style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{toman(attempts * TICKET.price)}</span>
            <span style={{ fontSize: 11, color: C.tbody }}>تومان</span>
          </span>
        </div>

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        <Button onClick={submit} disabled={busy} style={{ height: 48, lineHeight: '48px', fontSize: 15 }}>
          {busy ? 'یه لحظه…' : owned > 0 ? `خرید ${attempts} سهمِ بیشتر` : `ثبت‌نام و پرداخت (${attempts} سهم)`}
        </Button>
      </div>
    </div>
  )
}
