'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DISC, Disc } from '@/lib/mock-data'
import { C, DISP, Button, StatusChip, BackHeader, DISC_DOT } from '@/components/ui'
import { toman } from '@/lib/payment'
import { track } from '@/lib/track'

interface Props { comp: { id: string; title: string; disc: Disc; status: 'live' | 'open' | 'soon' | 'done'; statusLabel: string; prize: number; format: string; teams: number }; owned: number; remaining: number; canSetRef?: boolean; freeTickets?: number; price: { price: number; original: number; offPercent: number }; isTeamEvent?: boolean }

export default function RegisterForm({ comp, owned, remaining, canSetRef, freeTickets = 0, price, isTeamEvent }: Props) {
  const router = useRouter()
  const d = DISC[comp.disc]

  const [attempts, setAttempts] = useState(1)
  const [ref, setRef] = useState('')
  const [teamName, setTeamName] = useState('')
  const [partnerTag, setPartnerTag] = useState('')
  // prefill from the invite link (?ref=) caught anywhere in the app
  useEffect(() => {
    if (!canSetRef) return
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref')
      const v = (fromUrl || localStorage.getItem('gl_ref') || '').trim()
      if (v) setRef(v.replace(/^@/, ''))
    } catch {}
  }, [canSetRef])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (isTeamEvent && !partnerTag.trim()) { setErr('تگِ هم‌تیمی رو وارد کن'); return }
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compId: comp.id, attempts, ref: ref.trim() || undefined,
          ...(isTeamEvent ? { teamName: teamName.trim(), partnerTag: partnerTag.trim() } : {}),
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت‌نام انجام نشد، دوباره امتحان کن')
      track('ticket_select', { compId: comp.id, disc: comp.disc, tickets: attempts })
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
          {isTeamEvent ? (
            <>
              <div>• این یه مسابقهٔ <b style={{ color: C.thi }}>دو به دو</b>ست — تیمت رو با یه هم‌تیمی می‌سازی</div>
              <div>• تو کاپیتانی: سهمِ خودت رو الان می‌خری، هم‌تیمیت دعوت می‌شه تا سهمِ خودش رو جدا بخره</div>
              <div>• هر دو نفر باید تاییدِ ادمین بگیرن تا تیمتون وارد قرعه‌کشی بشه</div>
            </>
          ) : (
            <>
              <div>• می‌تونی <b style={{ color: C.thi }}>۱ تا ۶ بلیط</b> بگیری — هر بلیط یه شانس جداست</div>
              <div>• توی مقدماتی، بلیط‌هات توی براکت‌های جدا پخش می‌شن</div>
              <div>• حداکثر <b style={{ color: C.thi }}>۳ seed</b> به فینال می‌رسه</div>
            </>
          )}
        </div>

        {/* Team fields — captain names the team + names a partner by tag */}
        {isTeamEvent && (
          <>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, marginBottom: 7 }}>نامِ تیم (اختیاری)</div>
              <input value={teamName} onChange={e => setTeamName(e.target.value.slice(0, 40))} placeholder="مثلاً تیمِ آتیش"
                style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, marginBottom: 7 }}>تگِ هم‌تیمی</div>
              <input dir="ltr" value={partnerTag} onChange={e => setPartnerTag(e.target.value.replace(/^@/, ''))} placeholder="gamertag"
                style={{ background: C.sf2, border: `1px solid ${partnerTag ? C.accent : C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: DISP, textAlign: 'left' }} />
              {partnerTag && <div style={{ fontSize: 10.5, color: C.accent, marginTop: 5 }}>✓ دعوت برای @{partnerTag} فرستاده می‌شه</div>}
            </div>
          </>
        )}

        {/* Price + FOMO */}
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>قیمت هر بلیط</span>
              {price.offPercent > 0 && <span style={{ fontSize: 10, fontWeight: 800, color: C.accent, background: C.accentSoft, borderRadius: 6, padding: '2px 7px' }}>٪{price.offPercent} تخفیف</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}><span className="gl-num" style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>{toman(price.price)}</span><span style={{ fontSize: 11, color: C.tbody }}>تومان</span></span>
              {price.offPercent > 0 && <span dir="ltr" style={{ fontFamily: DISP, fontSize: 13, color: C.tmut, textDecoration: 'line-through' }}>{toman(price.original)}</span>}
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

        {/* free referral tickets get applied automatically */}
        {freeTickets > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.goldSoft, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '11px 14px', fontSize: 12.5, fontWeight: 700, color: C.gold }}>
            🎟 <span className="gl-num">{Math.min(freeTickets, attempts)}</span> سهم از این ثبت‌نام با جایزهٔ دعوتت رایگان حساب می‌شه.
          </div>
        )}

        {/* referral code — attribution happens here, at purchase */}
        {canSetRef && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, marginBottom: 7 }}>کدِ دعوت (اختیاری) — اگه رفیقی معرفیت کرده، تگش رو بزن</div>
            <input dir="ltr" value={ref} onChange={e => setRef(e.target.value.replace(/^@/, ''))} placeholder="gamertag"
              style={{ background: C.sf2, border: `1px solid ${ref ? C.accent : C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: DISP, textAlign: 'left' }} />
            {ref && <div style={{ fontSize: 10.5, color: C.accent, marginTop: 5 }}>✓ این خرید به‌نامِ @{ref} ثبت می‌شه</div>}
          </div>
        )}

        {/* Total */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 15px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>مبلغ قابل پرداخت</span>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
            <span className="gl-num" style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{toman(Math.max(0, attempts - Math.min(freeTickets, attempts)) * price.price)}</span>
            <span style={{ fontSize: 11, color: C.tbody }}>تومان</span>
          </span>
        </div>

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        <Button onClick={submit} disabled={busy} style={{ height: 48, lineHeight: '48px', fontSize: 15 }}>
          {busy ? 'یه لحظه…' : isTeamEvent ? `ساختِ تیم و پرداختِ سهمِ خودت (${attempts} سهم)` : owned > 0 ? `خرید ${attempts} سهمِ بیشتر` : `ثبت‌نام و پرداخت (${attempts} سهم)`}
        </Button>
      </div>
    </div>
  )
}
