'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP, Num, EmptyState } from '@/components/ui'
import { toman } from '@/lib/payment'

type UserOpt = {
  id: string; name: string; tag: string; phone: string; city: string
  role?: string; blocked?: string
}
type CodeRow = {
  id: string; code: string; active?: boolean; discountPercent: number; commissionPercent: number; note?: string
  useCount: number; totalUses: number; approved: number; pending: number; conversionPercent: number
  pendingCommission: number
}
type PartnerRow = {
  userId: string; name: string; tag: string; phone: string
  discountPercent: number; commissionPercent: number
  codes: CodeRow[]; inactiveCodes?: CodeRow[]
  active: boolean; pendingCommission: number
}
type RequestRow = {
  id: string; promoterUserId: string; promoterName: string; promoterTag: string; promoterPhone: string
  requestedCode?: string; note?: string; createdAt: number
}
type EarningRow = {
  id: string; codeLabel: string; promoterName: string; promoterTag: string
  paidTickets: number; buyerPaidTotal: number; commissionAmount: number; status: string
}

const inp: React.CSSProperties = {
  background: '#252017', border: '1px solid #3A332A', borderRadius: 10, padding: '10px 12px',
  color: '#F2EDE4', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}

export default function PromotersClient() {
  const router = useRouter()
  const [tab, setTab] = useState<'partners' | 'requests' | 'payouts'>('partners')
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [earnings, setEarnings] = useState<EarningRow[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [promoterQuery, setPromoterQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserOpt | null>(null)
  const [searchResults, setSearchResults] = useState<UserOpt[]>([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchReady, setSearchReady] = useState(false)
  const [discount, setDiscount] = useState('20')
  const [commission, setCommission] = useState('10')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/promoter-codes')
    const j = await res.json()
    if (res.ok) {
      setPartners(j.partners ?? [])
      setRequests(j.requests ?? [])
      setEarnings(j.earnings ?? [])
    }
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

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/promoter-codes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const j = await res.json()
    if (!res.ok) throw new Error(j.error || 'نشد')
    return j
  }

  async function activate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!selectedUser) {
      setErr('اول گیمر را از نتایج جستجو انتخاب کن')
      return
    }
    setErr(null); setBusy(true)
    try {
      const uid = selectedUser.id
      const j = await post({
        action: 'activate',
        promoterUserId: uid,
        discountPercent: discount,
        commissionPercent: commission,
      })
      setSelectedUser(null)
      setExpanded(uid)
      await load()
      router.refresh()
      if (j?.code?.code) setErr(null)
    } catch (ex: any) { setErr(ex.message || 'فعال‌سازی انجام نشد') } finally { setBusy(false) }
  }

  const pending = earnings.filter(e => e.status === 'pending')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.thi }}>پروموتر</div>
        <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 4, lineHeight: 1.7 }}>
          فعال‌سازی (با کد اول) · مدیریت کدها · تأیید درخواست · پرداخت کمیسیون
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(['partners', 'requests', 'payouts'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 40, borderRadius: 10,
            fontSize: 12, fontWeight: 700,
            background: tab === t ? C.accentSoft : C.sf1, color: tab === t ? C.accent : C.tbody,
            border: `1px solid ${tab === t ? C.accent : C.line}`,
          }}>
            {t === 'partners' ? 'شرکا' : t === 'requests' ? `درخواست‌ها${requests.length ? ` (${requests.length})` : ''}` : `پرداخت‌ها${pending.length ? ` (${pending.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'partners' && (
        <>
          <form onSubmit={activate} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>۱. فعال‌سازی پروموتر جدید</div>
              <div style={{ fontSize: 11, color: C.tmut, marginTop: 4 }}>بعد از فعال‌سازی، کد اول از @تگ ساخته می‌شود.</div>
            </div>

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
                        u.blocked ? (
                          <div key={u.id} style={{ padding: '8px 10px', borderRadius: 8, background: C.sf2, border: `1px solid ${C.line}`, fontSize: 12, color: C.tmut, textAlign: 'right', opacity: 0.85 }}>
                            <div style={{ fontWeight: 700, color: C.tbody }}>{u.name}</div>
                            <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, marginTop: 2 }}>@{u.tag} · {u.phone}</div>
                            <div style={{ fontSize: 10.5, color: C.live, marginTop: 4 }}>{u.blocked}</div>
                          </div>
                        ) : (
                          <button key={u.id} type="button" onClick={() => { setSelectedUser(u); setPromoterQuery(''); setSearchResults([]) }}
                            style={{ all: 'unset', cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: C.sf2, border: `1px solid ${C.line}`, fontSize: 12, color: C.thi, textAlign: 'right' }}>
                            <div style={{ fontWeight: 700 }}>{u.name}</div>
                            <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2 }}>@{u.tag} · {u.phone}</div>
                          </button>
                        )
                      ))}
                    </div>
                  )}
                  {searchReady && !searchBusy && searchResults.length === 0 && promoterQuery.trim().length >= 2 && (
                    <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5, lineHeight: 1.7 }}>
                      حساب گیمر با این شماره یا تگ نیست. پروموتر از صفر ساخته نمی‌شود — اول باید در گیم‌لند ثبت‌نام کرده باشند.
                    </div>
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
            {err && <div style={{ fontSize: 13, fontWeight: 700, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 10, padding: '10px 12px', lineHeight: 1.7 }}>{err}</div>}
            <button type="button" disabled={busy || !selectedUser} onClick={() => void activate()} style={{
              all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box',
              cursor: selectedUser ? 'pointer' : 'default', textAlign: 'center', minHeight: 44, borderRadius: 11,
              background: selectedUser ? C.accent : C.line, color: selectedUser ? C.ink : C.tmut, fontWeight: 800, fontSize: 14, opacity: busy ? 0.6 : 1,
            }}>{busy ? 'در حال فعال‌سازی…' : 'فعال‌سازی و ساخت کد اول'}</button>
          </form>

          <div style={{ fontSize: 12, fontWeight: 800, color: C.thi }}>۲. شرکای فعال</div>

          {partners.length === 0 ? <EmptyState text="هنوز پروموتری فعال نیست." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {partners.map(p => (
                <PartnerCard
                  key={p.userId}
                  partner={p}
                  expanded={expanded === p.userId}
                  onToggle={() => setExpanded(expanded === p.userId ? null : p.userId)}
                  busy={busy}
                  setBusy={setBusy}
                  onRefresh={load}
                  post={post}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        requests.length === 0 ? <EmptyState text="درخواست کد جدیدی نیست." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11.5, color: C.tbody, lineHeight: 1.7, padding: '0 2px' }}>
              درخواست‌های پروموتر برای کد اضافه — تأیید یا رد از همینجا.
            </div>
            {requests.map(r => (
              <RequestCard key={r.id} req={r} busy={busy} setBusy={setBusy} onRefresh={load} post={post} />
            ))}
          </div>
        )
      )}

      {tab === 'payouts' && (
        pending.length === 0 ? <EmptyState text="کمیسیون معوقی نیست." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(e => (
              <PayoutRow key={e.id} earning={e} onPaid={async (note) => {
                setBusy(true)
                try {
                  await fetch('/api/admin/promoter-earnings', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ earningId: e.id, note }),
                  })
                  await load()
                } finally { setBusy(false) }
              }} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function PartnerCard({ partner: p, expanded, onToggle, busy, setBusy, onRefresh, post }: {
  partner: PartnerRow; expanded: boolean; onToggle: () => void; busy: boolean
  setBusy: (v: boolean) => void; onRefresh: () => Promise<void>
  post: (body: Record<string, unknown>) => Promise<any>
}) {
  const [editDiscount, setEditDiscount] = useState(String(p.discountPercent))
  const [editCommission, setEditCommission] = useState(String(p.commissionPercent))
  const [newCode, setNewCode] = useState('')
  const [newCodeNote, setNewCodeNote] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  useEffect(() => {
    setEditDiscount(String(p.discountPercent))
    setEditCommission(String(p.commissionPercent))
  }, [p.discountPercent, p.commissionPercent])

  async function saveTerms() {
    setLocalErr(null); setBusy(true)
    try {
      await post({ action: 'update', userId: p.userId, discountPercent: Number(editDiscount), commissionPercent: Number(editCommission) })
      await onRefresh()
    } catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }

  async function createCode() {
    setLocalErr(null); setBusy(true)
    try {
      await post({ action: 'createCode', promoterUserId: p.userId, code: newCode.trim() || undefined, note: newCodeNote.trim() || undefined })
      setNewCode(''); setNewCodeNote('')
      await onRefresh()
    } catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }

  async function toggleCode(codeId: string, active: boolean) {
    setBusy(true)
    try {
      await post({ action: active ? 'reactivateCode' : 'deactivateCode', codeId })
      await onRefresh()
    } catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }

  async function deactivatePartner() {
    setBusy(true)
    try {
      await post({ action: 'deactivate', userId: p.userId })
      setConfirmDeactivate(false)
      await onRefresh()
    } catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }

  const inactive = p.inactiveCodes ?? []
  const totalCodes = p.codes.length + inactive.length

  return (
    <div style={{ background: C.sf1, border: `1px solid ${expanded ? C.accent + '44' : C.line}`, borderRadius: 12, overflow: 'hidden' }}>
      <button type="button" onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', width: '100%', padding: '12px 14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{p.name}</div>
            <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2 }}>@{p.tag} · {p.phone}</div>
          </div>
          <div style={{ textAlign: 'left', fontSize: 11, color: C.tbody }}>
            <div>{totalCodes} کد · {p.codes.length} فعال</div>
            {p.pendingCommission > 0 && <div style={{ color: C.gold, marginTop: 2 }}>{toman(p.pendingCommission)} معوق</div>}
          </div>
          <span style={{ color: C.tmut, fontSize: 14 }}>{expanded ? '▾' : '◂'}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Terms */}
          <div style={{ marginTop: 12 }}>
            <SectionLabel>شرایط تجاری</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <Field label="تخفیف ٪"><input type="number" value={editDiscount} onChange={e => setEditDiscount(e.target.value)} style={inp} /></Field>
              <Field label="کمیسیون ٪"><input type="number" value={editCommission} onChange={e => setEditCommission(e.target.value)} style={inp} /></Field>
            </div>
            <button type="button" disabled={busy} onClick={saveTerms} style={btnSecondary}>ذخیره شرایط</button>
          </div>

          {/* Active codes */}
          <div>
            <SectionLabel>کدهای فعال</SectionLabel>
            {p.codes.length === 0 ? (
              <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 6 }}>کد فعالی نیست — از پایین بساز یا درخواست را تأیید کن.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {p.codes.map(c => <CodeRowView key={c.id} c={c} onToggle={() => toggleCode(c.id, false)} toggleLabel="غیرفعال" toggleColor={C.live} busy={busy} />)}
              </div>
            )}
          </div>

          {/* Inactive codes */}
          {inactive.length > 0 && (
            <div>
              <SectionLabel>کدهای غیرفعال</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {inactive.map(c => <CodeRowView key={c.id} c={c} muted onToggle={() => toggleCode(c.id, true)} toggleLabel="فعال‌سازی مجدد" toggleColor={C.win} busy={busy} />)}
              </div>
            </div>
          )}

          {/* Create code */}
          <div style={{ padding: 12, borderRadius: 10, background: C.sf2, border: `1px solid ${C.accent}33` }}>
            <SectionLabel>ساخت کد جدید</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="کد (خالی = خودکار از @تگ)" style={inp} dir="ltr" />
              <input value={newCodeNote} onChange={e => setNewCodeNote(e.target.value)} placeholder="یادداشت داخلی (اختیاری)" style={inp} />
              <button type="button" disabled={busy} onClick={createCode} style={btnPrimary}>ساخت کد</button>
            </div>
          </div>

          {localErr && <div style={{ fontSize: 12, color: C.live }}>{localErr}</div>}

          {/* Deactivate partner */}
          <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
            {!confirmDeactivate ? (
              <button type="button" onClick={() => setConfirmDeactivate(true)} style={{ ...btnSecondary, color: C.live, borderColor: C.live + '55' }}>
                غیرفعال کردن پروموتر
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: C.live }}>همهٔ کدها غیرفعال می‌شن. کمیسیون‌های معوق حفظ می‌شن.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={busy} onClick={deactivatePartner} style={{ ...btnPrimary, background: C.live, flex: 1 }}>بله، غیرفعال کن</button>
                  <button type="button" onClick={() => setConfirmDeactivate(false)} style={{ ...btnSecondary, flex: 1 }}>انصراف</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CodeRowView({ c, muted, onToggle, toggleLabel, toggleColor, busy }: {
  c: CodeRow; muted?: boolean; onToggle: () => void; toggleLabel: string; toggleColor: string; busy: boolean
}) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 9, background: muted ? C.sf1 : C.sf2, border: `1px solid ${muted ? C.line : C.accent + '33'}`, opacity: muted ? 0.85 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, color: muted ? C.tmut : C.accent }}>{c.code}</span>
        {!muted && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: C.winSoft, color: C.win }}>فعال</span>}
        {muted && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: C.sf2, color: C.tmut }}>غیرفعال</span>}
        <span style={{ flex: 1 }} />
        <button type="button" disabled={busy} onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: toggleColor }}>{toggleLabel}</button>
      </div>
      <div style={{ fontSize: 10.5, color: C.tbody, marginTop: 6 }}>
        {c.totalUses} استفاده · {c.conversionPercent}٪ تبدیل · تأیید {c.approved} · انتظار {c.pending}
        {c.pendingCommission > 0 && <> · معوق {toman(c.pendingCommission)}</>}
      </div>
      {c.note && <div style={{ fontSize: 10, color: C.tmut, marginTop: 4 }}>{c.note}</div>}
    </div>
  )
}

function RequestCard({ req: r, busy, setBusy, onRefresh, post }: {
  req: RequestRow; busy: boolean; setBusy: (v: boolean) => void; onRefresh: () => Promise<void>
  post: (body: Record<string, unknown>) => Promise<any>
}) {
  const [codeOverride, setCodeOverride] = useState(r.requestedCode ?? '')
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  async function approve() {
    setLocalErr(null); setBusy(true)
    try {
      await post({ action: 'approveRequest', requestId: r.id, code: codeOverride.trim() || undefined })
      await onRefresh()
    } catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }

  async function reject() {
    setLocalErr(null); setBusy(true)
    try {
      await post({ action: 'rejectRequest', requestId: r.id, reason: rejectReason.trim() || undefined })
      setRejectMode(false); setRejectReason('')
      await onRefresh()
    } catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{r.promoterName}</div>
      <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{r.promoterTag} · {r.promoterPhone}</div>
      {r.note && <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 8, lineHeight: 1.6 }}>یادداشت: {r.note}</div>}

      {!rejectMode ? (
        <>
          <div style={{ marginTop: 12 }}>
            <Field label="کد نهایی (اختیاری — خالی = @تگ)">
              <input value={codeOverride} onChange={e => setCodeOverride(e.target.value)} style={inp} dir="ltr" placeholder={r.requestedCode || 'خودکار'} />
            </Field>
          </div>
          {localErr && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{localErr}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" disabled={busy} onClick={approve} style={{ ...btnPrimary, flex: 1, background: C.winSoft, color: C.win, border: `1px solid ${C.win}55` }}>تأیید و ساخت کد</button>
            <button type="button" disabled={busy} onClick={() => setRejectMode(true)} style={{ ...btnSecondary, flex: 1, color: C.live }}>رد</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginTop: 12 }}>
            <Field label="دلیل رد (اختیاری)">
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={inp} placeholder="مثلاً کد تکراری بود" />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" disabled={busy} onClick={reject} style={{ ...btnPrimary, flex: 1, background: C.liveSoft, color: C.live }}>ثبت رد</button>
            <button type="button" onClick={() => { setRejectMode(false); setRejectReason('') }} style={{ ...btnSecondary, flex: 1 }}>انصراف</button>
          </div>
        </>
      )}
    </div>
  )
}

function PayoutRow({ earning: e, onPaid }: { earning: EarningRow; onPaid: (note?: string) => Promise<void> }) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>{e.promoterName}</div>
          <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>کد {e.codeLabel} · {e.paidTickets} سهم · {toman(e.buyerPaidTotal)}</div>
        </div>
        <Num size={16} color={C.gold}>{toman(e.commissionAmount)}</Num>
        <button type="button" onClick={() => setOpen(!open)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11.5, fontWeight: 800, color: C.win, background: C.winSoft, border: `1px solid ${C.win}55`, borderRadius: 8, padding: '8px 12px' }}>پرداخت شد</button>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input value={note} onChange={ev => setNote(ev.target.value)} placeholder="یادداشت (اختیاری)" style={{ ...inp, flex: 1 }} />
          <button type="button" disabled={busy} onClick={async () => {
            setBusy(true)
            try { await onPaid(note.trim() || undefined); setOpen(false); setNote('') } finally { setBusy(false) }
          }} style={btnPrimary}>تأیید</button>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: C.tmut, letterSpacing: '.02em' }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.tmut, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', minHeight: 40, borderRadius: 10,
  background: C.accent, color: C.ink, fontWeight: 800, fontSize: 12, marginTop: 4,
}

const btnSecondary: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', minHeight: 38, borderRadius: 10,
  background: C.sf2, color: C.tbody, fontWeight: 700, fontSize: 12, border: `1px solid ${C.line}`, marginTop: 8,
}
