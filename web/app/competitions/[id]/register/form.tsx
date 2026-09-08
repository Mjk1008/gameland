'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DISC, Disc } from '@/lib/mock-data'
import { C, DISP, Button, StatusChip, BackHeader, DISC_DOT } from '@/components/ui'
import { PAYMENT, toman } from '@/lib/payment'
import { fileToDataUrl } from '@/lib/receipt-image'
import Link from 'next/link'

interface Props { comp: { id: string; title: string; disc: Disc; status: 'live' | 'open' | 'soon' | 'done'; statusLabel: string; prize: number; format: string; teams: number }; owned: number; remaining: number; canSetRef?: boolean; canUsePromo?: boolean; freeTickets?: number; price: { price: number; original: number; offPercent: number }; isTeamEvent?: boolean; reuseTeam?: { name: string; partnerTag?: string }; leftoverNote?: boolean; leftoverOpen?: boolean; leftoverMode?: boolean }

export default function RegisterForm({ comp, owned, remaining, canSetRef, canUsePromo = true, freeTickets = 0, price, isTeamEvent, reuseTeam, leftoverNote, leftoverOpen, leftoverMode }: Props) {
  const router = useRouter()
  const d = DISC[comp.disc]

  const [attempts, setAttempts] = useState(1)
  const [ref, setRef] = useState('')
  const [teamName, setTeamName] = useState('')
  const [partnerTag, setPartnerTag] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoUnitPrice, setPromoUnitPrice] = useState(price.price)
  const [promoLabel, setPromoLabel] = useState('')
  const [promoErr, setPromoErr] = useState<string | null>(null)
  const [promoOk, setPromoOk] = useState(false)
  const [promoBusy, setPromoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Receipt (فیش) — required in the same request whenever something's owed,
  // so a paid request never exists on the server without its فیش attached.
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const [imgErr, setImgErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function copyCard() {
    navigator.clipboard?.writeText(PAYMENT.card).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  async function onPickReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setImgErr(null); setImgBusy(true)
    try { setImageData(await fileToDataUrl(f)) }
    catch (e: any) { setImgErr(e.message) }
    finally { setImgBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  useEffect(() => {
    if (!canSetRef) return
    try {
      const v = (new URLSearchParams(window.location.search).get('ref') || localStorage.getItem('gl_ref') || '').trim()
      if (v) setRef(v.replace(/^@/, ''))
    } catch {}
  }, [canSetRef])

  useEffect(() => {
    if (!canUsePromo) return
    try {
      const v = (new URLSearchParams(window.location.search).get('code') || localStorage.getItem('gl_code') || '').trim()
      if (v) setPromoCode(v.toUpperCase())
    } catch {}
  }, [canUsePromo])

  async function validatePromo(): Promise<string | null> {
    const raw = promoCode.trim()
    if (!raw) {
      setPromoDiscount(0); setPromoUnitPrice(price.price); setPromoLabel(''); setPromoOk(false); setPromoErr(null)
      return null
    }
    setPromoBusy(true); setPromoErr(null)
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: raw, compId: comp.id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'کد تخفیف معتبر نیست')
      setPromoDiscount(j.discountPercent)
      setPromoUnitPrice(j.unitPrice)
      setPromoLabel(j.code)
      setPromoOk(true)
      return j.code as string
    } catch (e: any) {
      setPromoDiscount(0); setPromoUnitPrice(price.price); setPromoLabel(''); setPromoOk(false)
      setPromoErr(e.message)
      return null
    } finally { setPromoBusy(false) }
  }

  useEffect(() => {
    if (!canUsePromo || !promoCode.trim()) return
    const t = setTimeout(() => { validatePromo() }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoCode, canUsePromo, comp.id])

  async function submit() {
    if (isTeamEvent && !reuseTeam && owned === 0 && !partnerTag.trim()) { setErr('تگِ هم‌تیمی رو وارد کن'); return }
    if (needsReceipt && !imageData) { setErr('برای ثبت‌نامِ پرداختی باید رسیدِ پرداخت رو ضمیمه کنی'); return }
    let codeForSubmit = promoOk ? promoLabel : ''
    if (canUsePromo && promoCode.trim()) {
      if (!promoOk) {
        const validated = await validatePromo()
        if (!validated) { setErr(promoErr || 'کد تخفیف معتبر نیست'); return }
        codeForSubmit = validated
      } else {
        codeForSubmit = promoLabel
      }
    }
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compId: comp.id, attempts, ref: ref.trim() || undefined,
          promoCode: canUsePromo && codeForSubmit ? codeForSubmit : undefined,
          ...(leftoverMode ? { leftover: true } : {}),
          ...(isTeamEvent ? { teamName: teamName.trim(), partnerTag: (reuseTeam?.partnerTag || partnerTag).trim() } : {}),
          ...(imageData ? { imageData } : {}),
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت‌نام انجام نشد، دوباره امتحان کن')
      router.push(`/competitions/${comp.id}/me`); router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const paidTickets = Math.max(0, attempts - Math.min(freeTickets, attempts))
  const payableTotal = paidTickets * promoUnitPrice
  const needsReceipt = payableTotal > 0
  const promoPending = canUsePromo && !!promoCode.trim() && !promoOk && !promoErr

  return (
    <div className="animate-fade-up">
      <BackHeader title={leftoverMode ? 'ثبت‌نام در جدول بازماندگان' : 'ثبت‌نام در مسابقه'} href={`/competitions/${comp.id}`} />

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {leftoverOpen && !leftoverMode && (
          <Link href={`/competitions/${comp.id}/register?leftover=1`} style={{ all: 'unset', cursor: 'pointer', display: 'block', textAlign: 'center', background: C.accentSoft, border: `1px solid ${C.accent}55`, borderRadius: 14, padding: '16px 0', color: C.accent, fontWeight: 800, fontSize: 15 }}>
            جدول بازماندگان
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: DISC_DOT[comp.disc] ?? C.tmut, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.thi }}>{comp.title}</div>
            <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 2 }}>{d.name}</div>
          </div>
          <StatusChip status={comp.status} />
        </div>

        {leftoverNote && (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 14px', fontSize: 13, fontWeight: 700, color: C.thi }}>
            می‌ری تو براکت بازمانده‌ها
          </div>
        )}

        {isTeamEvent && reuseTeam && (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 14px', fontSize: 12.5, color: C.tbody, lineHeight: 1.8 }}>
            تیمت: <b style={{ color: C.thi }}>{reuseTeam.name}</b>
            {reuseTeam.partnerTag ? <> · هم‌تیمی @{reuseTeam.partnerTag}</> : null}
          </div>
        )}

        {isTeamEvent && !reuseTeam && (
          <>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, marginBottom: 7 }}>نامِ تیم (اختیاری)</div>
              <input value={teamName} onChange={e => setTeamName(e.target.value.slice(0, 40))}
                style={{ background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, marginBottom: 7 }}>تگِ هم‌تیمی</div>
              <input dir="ltr" value={partnerTag} onChange={e => setPartnerTag(e.target.value.replace(/^@/, ''))} placeholder="gamertag"
                style={{ background: C.sf2, border: `1px solid ${partnerTag ? C.accent : C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: DISP, textAlign: 'left' }} />
            </div>
          </>
        )}

        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.tmut }}>قیمت هر بلیط</span>
              {(price.offPercent > 0 || promoOk) && (
                <span style={{ fontSize: 10, fontWeight: 800, color: C.accent, background: C.accentSoft, borderRadius: 6, padding: '2px 7px' }}>
                  ٪{promoOk ? promoDiscount : price.offPercent} تخفیف
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}><span className="gl-num" style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>{toman(promoUnitPrice)}</span><span style={{ fontSize: 11, color: C.tbody }}>تومان</span></span>
              {(price.offPercent > 0 || promoOk) && price.original > promoUnitPrice && <span dir="ltr" style={{ fontFamily: DISP, fontSize: 13, color: C.tmut, textDecoration: 'line-through' }}>{toman(price.original)}</span>}
            </div>
          </div>
        </div>

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

        {canUsePromo && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, marginBottom: 7 }}>کد تخفیف (اختیاری)</div>
            <input dir="ltr" value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoOk(false); setPromoErr(null) }}
              onBlur={validatePromo} placeholder="PROMO20"
              style={{ background: C.sf2, border: `1px solid ${promoOk ? C.win : promoErr ? C.live : C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: DISP, textAlign: 'left' }} />
            {promoBusy && <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5 }}>در حال بررسی…</div>}
            {promoOk && <div style={{ fontSize: 10.5, color: C.win, marginTop: 5 }}>✓ کد {promoLabel} — ٪{promoDiscount} تخفیف</div>}
            {promoErr && <div style={{ fontSize: 10.5, color: C.live, marginTop: 5 }}>{promoErr}</div>}
          </div>
        )}

        {canSetRef && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.thi, marginBottom: 7 }}>کدِ معرّف (اختیاری)</div>
            <input dir="ltr" value={ref} onChange={e => setRef(e.target.value.replace(/^@/, ''))} placeholder="gamertag"
              style={{ background: C.sf2, border: `1px solid ${ref ? C.accent : C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: DISP, textAlign: 'left' }} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 15px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>مبلغ قابل پرداخت</span>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
            <span className="gl-num" style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{toman(payableTotal)}</span>
            <span style={{ fontSize: 11, color: C.tbody }}>تومان</span>
          </span>
        </div>

        {needsReceipt && (
          <>
            <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.tmut, marginBottom: 8 }}>شماره کارت</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span dir="ltr" style={{ flex: 1, minWidth: 0, fontFamily: DISP, fontWeight: 700, fontSize: 18, letterSpacing: '.04em', color: C.thi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{PAYMENT.card.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
                <button type="button" onClick={copyCard} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', fontSize: 12.5, fontWeight: 700, color: copied ? C.win : C.accent, background: copied ? C.winSoft : C.accentSoft, border: `1px solid ${copied ? C.win : C.accent}55`, borderRadius: 9, padding: '0 14px' }}>
                  {copied ? 'کپی شد ✓' : 'کپی'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 12, color: C.tbody }}>
                <span>{PAYMENT.cardName}</span><span style={{ color: C.line2 }}>·</span><span>{PAYMENT.bank}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 10 }}>بارگذاری فیش پرداخت</div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickReceipt} style={{ display: 'none' }} />
              {imageData ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.winSoft, border: `1px solid ${C.win}66`, borderRadius: 12, padding: '13px 14px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.win} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.win }}>فیش انتخاب شد</span>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={imgBusy} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.tbody }}>تعویض</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={imgBusy} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 96, background: C.sf2, border: `1.5px dashed ${C.accent}88`, borderRadius: 14, color: C.accent }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
                  <span style={{ fontSize: 13.5, fontWeight: 800 }}>{imgBusy ? 'در حال پردازش…' : 'انتخاب عکسِ فیش'}</span>
                  <span style={{ fontSize: 11, color: C.tmut }}>عکسِ رسیدِ کارت‌به‌کارت رو بذار</span>
                </button>
              )}
              {imgErr && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{imgErr}</div>}
            </div>
          </>
        )}

        {err && <div style={{ fontSize: 12, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}

        <Button onClick={submit} disabled={busy || promoBusy || promoPending || imgBusy || (needsReceipt && !imageData)} style={{ height: 48, lineHeight: '48px', fontSize: 15 }}>
          {busy ? 'یه لحظه…' : promoBusy || promoPending ? 'در حال بررسی کد…' : isTeamEvent ? (owned > 0 ? `افزودنِ ${attempts} سهمِ تیم` : `ساختِ تیم و پرداخت (${attempts} سهم)`) : owned > 0 ? `خرید ${attempts} سهمِ بیشتر` : `ثبت‌نام و پرداخت (${attempts} سهم)`}
        </Button>
      </div>
    </div>
  )
}
