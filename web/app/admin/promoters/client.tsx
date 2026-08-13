'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, Num, EmptyState } from '@/components/ui'
import { toman } from '@/lib/payment'

type UserOpt = { id: string; name: string; tag: string; phone: string; city: string }
type PartnerRow = {
  userId: string; name: string; tag: string; phone: string
  discountPercent: number; commissionPercent: number; code: string; codeId?: string
  useCount: number; active: boolean; note?: string; pendingCommission: number
}
type EarningRow = {
  id: string; codeLabel: string; promoterName: string; promoterTag: string
  paidTickets: number; buyerPaidTotal: number; commissionAmount: number; status: string
}

export default function PromotersClient() {
  const router = useRouter()
  const [tab, setTab] = useState<'partners' | 'payouts'>('partners')
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [earnings, setEarnings] = useState<EarningRow[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [promoterQuery, setPromoterQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserOpt | null>(null)
  const [searchResults, setSearchResults] = useState<UserOpt[]>([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchReady, setSearchReady] = useState(false)
  const [discount, setDiscount] = useState('20')
  const [commission, setCommission] = useState('10')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/promoter-codes')
    const j = await res.json()
    if (res.ok) { setPartners(j.partners ?? []); setEarnings(j.earnings ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedUser) return
    const q = promoterQuery.trim()
    if (q.length < 2) { setSearchResults([]); setSearchReady(false); return }
    const digits = q.replace(/\D/g, '')
    if (digits.length > 0 && digits.length === q.length && digits.length < 3) {
      setSearchResults([]); setSearchReady(false); return
    }
    const t = setTimeout(async () => {
      setSearchBusy(true)
      try {
        const res = await fetch(`/api/admin/promoter-user-search?q=${encodeURIComponent(q)}`)
        const j = await res.json()
        if (res.ok) { setSearchResults(j.users ?? []); setSearchReady(!!j.ready) }
      } finally { setSearchBusy(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [promoterQuery, selectedUser])

  function pickUser(u: UserOpt) {
    setSelectedUser(u)
    setPromoterQuery('')
    setSearchResults([])
    setSearchReady(false)
  }

  async function activate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/admin/promoter-codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          promoterUserId: selectedUser.id,
          discountPercent: Number(discount),
          commissionPercent: Number(commission),
          note: note || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'نشد')
      setSelectedUser(null); setNote('')
      await load()
      router.refresh()
    } catch (ex: any) { setErr(ex.message) } finally { setBusy(false) }
  }

  async function deactivate(userId: string) {
    if (!confirm('پروموتر غیرفعال بشه؟ کدش دیگه کار نمی‌کنه.')) return
    await fetch('/api/admin/promoter-codes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate', userId }),
    })
    await load()
  }

  async function markPaid(earningId: string) {
    const n = window.prompt('یادداشت پرداخت (اختیاری):') ?? ''
    await fetch('/api/admin/promoter-earnings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ earningId, note: n || undefined }),
    })
    await load()
  }

  const pending = earnings.filter(e => e.status === 'pending')
  const inp: React.CSSProperties = {
    background: '#252017', border: '1px solid #3A332A', borderRadius: 10, padding: '10px 12px',
    color: '#F2EDE4', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.thi }}>پروموتر</div>
        <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 4 }}>فعال‌سازی با شماره · یک کد از @تگ · کمیسیون دستی</div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(['partners', 'payouts'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, borderRadius: 10,
            fontSize: 12.5, fontWeight: 700,
            background: tab === t ? C.accentSoft : C.sf1, color: tab === t ? C.accent : C.tbody,
            border: `1px solid ${tab === t ? C.accent : C.line}`,
          }}>
            {t === 'partners' ? 'شرکا' : `پرداخت‌ها${pending.length ? ` (${pending.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'partners' && (
        <>
          <form onSubmit={activate} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>فعال‌سازی پروموتر</div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.tmut, marginBottom: 6 }}>جستجو با شماره یا @تگ</div>
              {selectedUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: C.sf2, border: `1px solid ${C.accent}44` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>{selectedUser.name}</div>
                    <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>
                      @{selectedUser.tag} · {selectedUser.phone}
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedUser(null)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.tbody }}>تغییر</button>
                </div>
              ) : (
                <>
                  <input value={promoterQuery} onChange={e => setPromoterQuery(e.target.value)} placeholder="0912… یا @tag"
                    style={inp} autoComplete="off" dir="ltr" />
                  {searchBusy && <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5 }}>در حال جستجو…</div>}
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {searchResults.map(u => (
                        <button key={u.id} type="button" onClick={() => pickUser(u)}
                          style={{ all: 'unset', cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: C.sf2, border: `1px solid ${C.line}`, fontSize: 12, color: C.thi, textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{u.name}</div>
                          <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2 }}>@{u.tag} · {u.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchReady && !searchBusy && searchResults.length === 0 && promoterQuery.trim().length >= 2 && (
                    <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5 }}>نتیجه‌ای نیست</div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="تخفیف خریدار ٪">
                <input type="number" min={1} max={90} value={discount} onChange={e => setDiscount(e.target.value)} style={inp} />
              </Field>
              <Field label="کمیسیون پروموتر ٪">
                <input type="number" min={0} max={50} value={commission} onChange={e => setCommission(e.target.value)} style={inp} />
              </Field>
            </div>
            <Field label="یادداشت داخلی">
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="مثلاً اینستاگرام…" style={inp} />
            </Field>
            {selectedUser && (
              <div style={{ fontSize: 11, color: C.tmut }}>کد خودکار: <span dir="ltr" style={{ fontFamily: DISP, color: C.accent }}>@{selectedUser.tag.toUpperCase()}</span></div>
            )}
            {err && <div style={{ fontSize: 12, color: C.live }}>{err}</div>}
            <button type="submit" disabled={busy || !selectedUser} style={{
              all: 'unset', cursor: selectedUser ? 'pointer' : 'default', textAlign: 'center', minHeight: 44, borderRadius: 11,
              background: selectedUser ? C.accent : C.line, color: selectedUser ? C.ink : C.tmut, fontWeight: 800, fontSize: 14, opacity: busy ? 0.6 : 1,
            }}>{busy ? '…' : 'فعال‌سازی'}</button>
          </form>

          {partners.length === 0 ? <EmptyState text="هنوز پروموتری فعال نیست." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {partners.map(p => (
                <div key={p.userId} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{p.name}</div>
                      <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{p.tag} · {p.phone}</div>
                    </div>
                    <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, color: C.accent }}>{p.code}</span>
                    <button type="button" onClick={() => deactivate(p.userId)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.live }}>غیرفعال</button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11.5, color: C.tbody, flexWrap: 'wrap' }}>
                    <span>تخفیف: <b style={{ color: C.thi }}>{p.discountPercent}٪</b></span>
                    <span>کمیسیون: <b style={{ color: C.gold }}>{p.commissionPercent}٪</b></span>
                    <span>استفاده: <span className="gl-num">{p.useCount}</span></span>
                    {p.pendingCommission > 0 && <span style={{ color: C.gold }}>معوق: {toman(p.pendingCommission)}</span>}
                  </div>
                  {p.note && <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 6 }}>{p.note}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'payouts' && (
        pending.length === 0 ? <EmptyState text="کمیسیون معوقی نیست." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(e => (
              <div key={e.id} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>{e.promoterName}</div>
                  <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>کد {e.codeLabel} · {e.paidTickets} سهم · {toman(e.buyerPaidTotal)}</div>
                </div>
                <Num size={16} color={C.gold}>{toman(e.commissionAmount)}</Num>
                <button type="button" onClick={() => markPaid(e.id)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 800, color: C.win, background: C.winSoft, border: `1px solid ${C.win}55`, borderRadius: 8, padding: '8px 12px' }}>پرداخت شد</button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.tmut, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}
