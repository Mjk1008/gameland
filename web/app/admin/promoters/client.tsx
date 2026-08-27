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
  id: string; code: string; active: boolean; compId?: string; eventTitle?: string
  discountPercent: number; commissionPercent: number; note?: string
  useCount: number; totalUses: number; approved: number; pending: number
  pendingCommission: number; paidCommission: number
}
type PartnerRow = {
  userId: string; name: string; tag: string; phone: string; active: boolean
  discountPercent: number; commissionPercent: number
  primary: CodeRow | null
  campaignCodes: CodeRow[]
  inactiveCampaignCodes: CodeRow[]
  pendingCommission: number; paidCommission: number
}
type RequestRow = {
  id: string; promoterUserId: string; promoterName: string; promoterTag: string; promoterPhone: string
  requestedCode?: string; compId?: string; eventTitle?: string; note?: string; createdAt: number
}
type EarningRow = {
  id: string; promoterUserId: string; codeLabel: string; promoterName: string; promoterTag: string
  paidTickets: number; buyerPaidTotal: number; commissionAmount: number; status: string
}
type EventOpt = { id: string; title: string }

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
  const [events, setEvents] = useState<EventOpt[]>([])
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
      setEvents(j.events ?? [])
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

  const post = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/promoter-codes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const j = await res.json()
    if (!res.ok) throw new Error(j.error || 'نشد')
    return j
  }, [])

  async function activate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!selectedUser) { setErr('اول گیمر را از نتایج جستجو انتخاب کن'); return }
    setErr(null); setBusy(true)
    try {
      const uid = selectedUser.id
      await post({ action: 'activate', userId: uid, discountPercent: discount, commissionPercent: commission })
      setSelectedUser(null)
      setExpanded(uid)
      await load()
      router.refresh()
    } catch (ex: any) { setErr(ex.message || 'فعال‌سازی انجام نشد') } finally { setBusy(false) }
  }

  const pending = earnings.filter(e => e.status === 'pending')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.thi }}>پروموتر</div>
        <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 4, lineHeight: 1.7 }}>
          فعال‌سازی (کد اصلی خودکار) · شرایط و کدهای کمپین · پرداخت کمیسیون
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
            {t === 'partners' ? 'پروموترها' : t === 'requests' ? `درخواست‌ها${requests.length ? ` (${requests.length})` : ''}` : `پرداخت‌ها${pending.length ? ` (${pending.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'partners' && (
        <>
          <form onSubmit={activate} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>فعال‌سازی پروموتر جدید</div>
              <div style={{ fontSize: 11, color: C.tmut, marginTop: 4 }}>کد اصلی از @تگ خودش، خودکار ساخته می‌شود.</div>
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
                      حساب گیمر با این شماره یا تگ نیست. اول باید در گیم‌لند ثبت‌نام کرده باشند.
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
            }}>{busy ? 'در حال فعال‌سازی…' : 'فعال‌سازی و ساخت کد اصلی'}</button>
          </form>

          {partners.length === 0 ? <EmptyState text="هنوز پروموتری فعال نیست." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {partners.map(p => (
                <PartnerCard
                  key={p.userId}
                  partner={p}
                  events={events}
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
        requests.length === 0 ? <EmptyState text="درخواست کد کمپینی نیست." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11.5, color: C.tbody, lineHeight: 1.7, padding: '0 2px' }}>
              درخواست پروموترها برای کد کمپینِ یک رویداد — تأیید یا رد از همینجا.
            </div>
            {requests.map(r => (
              <RequestCard key={r.id} req={r} busy={busy} setBusy={setBusy} onRefresh={load} post={post} />
            ))}
          </div>
        )
      )}

      {tab === 'payouts' && (
        pending.length === 0 ? <EmptyState text="کمیسیون معوقی نیست." /> : (
          <Payouts pending={pending} busy={busy} setBusy={setBusy} onRefresh={load} post={post} />
        )
      )}
    </div>
  )
}

function PartnerCard({ partner: p, events, expanded, onToggle, busy, setBusy, onRefresh, post }: {
  partner: PartnerRow; events: EventOpt[]; expanded: boolean; onToggle: () => void; busy: boolean
  setBusy: (v: boolean) => void; onRefresh: () => Promise<void>
  post: (body: Record<string, unknown>) => Promise<any>
}) {
  const [editDiscount, setEditDiscount] = useState(String(p.discountPercent))
  const [editCommission, setEditCommission] = useState(String(p.commissionPercent))
  const [renameVal, setRenameVal] = useState('')
  const [renameOpen, setRenameOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newCompId, setNewCompId] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)
  const [confirmPause, setConfirmPause] = useState(false)

  useEffect(() => {
    setEditDiscount(String(p.discountPercent))
    setEditCommission(String(p.commissionPercent))
  }, [p.discountPercent, p.commissionPercent])

  const run = async (body: Record<string, unknown>, after?: () => void) => {
    setLocalErr(null); setBusy(true)
    try { await post(body); after?.(); await onRefresh() }
    catch (ex: any) { setLocalErr(ex.message) }
    finally { setBusy(false) }
  }

  const campaignActive = p.campaignCodes.length
  const campaignInactive = p.inactiveCampaignCodes.length

  return (
    <div style={{ background: C.sf1, border: `1px solid ${expanded ? C.accent + '44' : C.line}`, borderRadius: 12, overflow: 'hidden' }}>
      <button type="button" onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', width: '100%', padding: '12px 14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>
              {p.name}{!p.active && <span style={{ fontSize: 10, color: C.live, marginRight: 6 }}>· متوقف</span>}
            </div>
            <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2 }}>
              @{p.tag} · {p.phone}{p.primary && <> · <span style={{ color: C.accent }}>{p.primary.code}</span></>}
            </div>
          </div>
          <div style={{ textAlign: 'left', fontSize: 11, color: C.tbody }}>
            <div>{p.primary?.totalUses ?? 0} استفاده · {p.primary?.approved ?? 0} تأیید</div>
            {p.pendingCommission > 0 && <div style={{ color: C.gold, marginTop: 2 }}>{toman(p.pendingCommission)} معوق</div>}
          </div>
          <span style={{ color: C.tmut, fontSize: 14 }}>{expanded ? '▾' : '◂'}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Primary code */}
          <div style={{ marginTop: 12 }}>
            <SectionLabel>کد اصلی</SectionLabel>
            {p.primary ? (
              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 9, background: C.sf2, border: `1px solid ${C.accent}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 16, color: C.accent }}>{p.primary.code}</span>
                  <span style={{ flex: 1 }} />
                  <button type="button" onClick={() => { setRenameOpen(!renameOpen); setRenameVal(p.primary!.code) }} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.tbody }}>تغییر کد</button>
                </div>
                <div style={{ fontSize: 10.5, color: C.tbody, marginTop: 6 }}>
                  {p.primary.totalUses} استفاده · تأیید {p.primary.approved} · انتظار {p.primary.pending}
                  {p.primary.pendingCommission > 0 && <> · معوق {toman(p.primary.pendingCommission)}</>}
                </div>
                {renameOpen && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input value={renameVal} onChange={e => setRenameVal(e.target.value)} style={{ ...inp, flex: 1 }} dir="ltr" />
                    <button type="button" disabled={busy} onClick={() => run({ action: 'renameCode', userId: p.userId, code: renameVal.trim() }, () => setRenameOpen(false))} style={{ ...btnPrimaryInline }}>ذخیره</button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 6 }}>کد اصلی ندارد — «فعال‌سازی مجدد» بزن.</div>
            )}
          </div>

          {/* Campaign codes */}
          <div>
            <SectionLabel>کدهای کمپین {campaignActive + campaignInactive > 0 && `(${campaignActive} فعال)`}</SectionLabel>
            {campaignActive + campaignInactive === 0 ? (
              <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 6 }}>کد کمپینی ندارد.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {p.campaignCodes.map(c => (
                  <CampaignRow key={c.id} c={c} busy={busy}
                    onToggle={() => run({ action: 'deactivateCode', codeId: c.id })} toggleLabel="غیرفعال" toggleColor={C.live} confirmToggle />
                ))}
                {p.inactiveCampaignCodes.map(c => (
                  <CampaignRow key={c.id} c={c} busy={busy} muted
                    onToggle={() => run({ action: 'reactivateCode', codeId: c.id })} toggleLabel="فعال‌سازی مجدد" toggleColor={C.win} />
                ))}
              </div>
            )}
            {!addOpen ? (
              <button type="button" onClick={() => setAddOpen(true)} style={{ ...btnSecondary, marginTop: 8 }}>+ کد کمپین جدید</button>
            ) : (
              <div style={{ padding: 12, borderRadius: 10, background: C.sf2, border: `1px solid ${C.accent}33`, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={newCompId} onChange={e => setNewCompId(e.target.value)} style={inp}>
                  <option value="">— رویداد کمپین —</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="کد (خالی = خودکار از @تگ)" style={inp} dir="ltr" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={busy || !newCompId} onClick={() => run(
                    { action: 'createCampaignCode', userId: p.userId, compId: newCompId, code: newCode.trim() || undefined },
                    () => { setNewCode(''); setNewCompId(''); setAddOpen(false) },
                  )} style={{ ...btnPrimaryInline, flex: 1 }}>ساخت</button>
                  <button type="button" onClick={() => setAddOpen(false)} style={{ ...btnSecondary, flex: 1, marginTop: 0 }}>انصراف</button>
                </div>
              </div>
            )}
          </div>

          {/* Terms */}
          <div>
            <SectionLabel>شرایط تجاری</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <Field label="تخفیف ٪"><input type="number" value={editDiscount} onChange={e => setEditDiscount(e.target.value)} style={inp} /></Field>
              <Field label="کمیسیون ٪"><input type="number" value={editCommission} onChange={e => setEditCommission(e.target.value)} style={inp} /></Field>
            </div>
            <button type="button" disabled={busy} onClick={() => run({ action: 'updateTerms', userId: p.userId, discountPercent: Number(editDiscount), commissionPercent: Number(editCommission) })} style={btnSecondary}>ذخیره شرایط</button>
            <div style={{ fontSize: 10, color: C.tmut, marginTop: 6 }}>کد اصلی این نرخ را می‌گیرد؛ کدهای کمپین نرخ خودشان را نگه می‌دارند.</div>
          </div>

          {localErr && <div style={{ fontSize: 12, color: C.live }}>{localErr}</div>}

          {/* Pause / resume */}
          <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
            {p.active ? (
              !confirmPause ? (
                <button type="button" onClick={() => setConfirmPause(true)} style={{ ...btnSecondary, color: C.live, borderColor: C.live + '55', marginTop: 0 }}>
                  توقف پروموتر
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: C.live }}>همهٔ کدها غیرفعال می‌شن. کمیسیون‌های معوق حفظ می‌شن.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busy} onClick={() => run({ action: 'deactivate', userId: p.userId }, () => setConfirmPause(false))} style={{ ...btnPrimaryInline, background: C.live, flex: 1 }}>بله، متوقف کن</button>
                    <button type="button" onClick={() => setConfirmPause(false)} style={{ ...btnSecondary, flex: 1, marginTop: 0 }}>انصراف</button>
                  </div>
                </div>
              )
            ) : (
              <button type="button" disabled={busy} onClick={() => run({ action: 'reactivate', userId: p.userId })} style={{ ...btnPrimaryInline, background: C.winSoft, color: C.win, border: `1px solid ${C.win}55` }}>
                فعال‌سازی مجدد پروموتر
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CampaignRow({ c, muted, onToggle, toggleLabel, toggleColor, busy, confirmToggle }: {
  c: CodeRow; muted?: boolean; onToggle: () => void; toggleLabel: string; toggleColor: string; busy: boolean
  confirmToggle?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div style={{ padding: '10px 12px', borderRadius: 9, background: muted ? C.sf1 : C.sf2, border: `1px solid ${muted ? C.line : C.accent + '33'}`, opacity: muted ? 0.8 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 14, color: muted ? C.tmut : C.accent }}>{c.code}</span>
        <span style={{ fontSize: 10, color: C.tmut }}>{c.eventTitle}</span>
        <span style={{ flex: 1 }} />
        {!confirming ? (
          <button type="button" disabled={busy} onClick={() => confirmToggle ? setConfirming(true) : onToggle()} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: toggleColor }}>{toggleLabel}</button>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10.5, color: C.tmut }}>مطمئنی؟</span>
            <button type="button" onClick={() => setConfirming(false)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: C.tbody }}>نه</button>
            <button type="button" disabled={busy} onClick={() => { onToggle(); setConfirming(false) }} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: toggleColor }}>آره</button>
          </span>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: C.tbody, marginTop: 6 }}>
        {c.totalUses} استفاده · تأیید {c.approved} · انتظار {c.pending} · ٪{c.discountPercent}/٪{c.commissionPercent}
        {c.pendingCommission > 0 && <> · معوق {toman(c.pendingCommission)}</>}
      </div>
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
    try { await post({ action: 'approveRequest', requestId: r.id, code: codeOverride.trim() || undefined }); await onRefresh() }
    catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }
  async function reject() {
    setLocalErr(null); setBusy(true)
    try { await post({ action: 'rejectRequest', requestId: r.id, reason: rejectReason.trim() || undefined }); setRejectMode(false); setRejectReason(''); await onRefresh() }
    catch (ex: any) { setLocalErr(ex.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.gold}55`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{r.promoterName}</div>
      <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{r.promoterTag} · {r.promoterPhone}</div>
      <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 8 }}>رویداد: <span style={{ color: C.thi, fontWeight: 700 }}>{r.eventTitle ?? '—'}</span></div>
      {r.note && <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 4, lineHeight: 1.6 }}>یادداشت: {r.note}</div>}

      {!rejectMode ? (
        <>
          <div style={{ marginTop: 12 }}>
            <Field label="کد نهایی (اختیاری — خالی = @تگ)">
              <input value={codeOverride} onChange={e => setCodeOverride(e.target.value)} style={inp} dir="ltr" placeholder={r.requestedCode || 'خودکار'} />
            </Field>
          </div>
          {localErr && <div style={{ fontSize: 12, color: C.live, marginTop: 8 }}>{localErr}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" disabled={busy} onClick={approve} style={{ ...btnPrimaryInline, flex: 1, background: C.winSoft, color: C.win, border: `1px solid ${C.win}55` }}>تأیید و ساخت کد</button>
            <button type="button" disabled={busy} onClick={() => setRejectMode(true)} style={{ ...btnSecondary, flex: 1, marginTop: 0, color: C.live }}>رد</button>
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
            <button type="button" disabled={busy} onClick={reject} style={{ ...btnPrimaryInline, flex: 1, background: C.liveSoft, color: C.live }}>ثبت رد</button>
            <button type="button" onClick={() => { setRejectMode(false); setRejectReason('') }} style={{ ...btnSecondary, flex: 1, marginTop: 0 }}>انصراف</button>
          </div>
        </>
      )}
    </div>
  )
}

function Payouts({ pending, busy, setBusy, onRefresh, post }: {
  pending: EarningRow[]; busy: boolean; setBusy: (v: boolean) => void; onRefresh: () => Promise<void>
  post: (body: Record<string, unknown>) => Promise<any>
}) {
  const [err, setErr] = useState<string | null>(null)
  const groups = new Map<string, { name: string; tag: string; rows: EarningRow[]; total: number }>()
  for (const e of pending) {
    const g = groups.get(e.promoterUserId) ?? { name: e.promoterName, tag: e.promoterTag, rows: [], total: 0 }
    g.rows.push(e); g.total += e.commissionAmount
    groups.set(e.promoterUserId, g)
  }

  const run = async (body: Record<string, unknown>) => {
    setErr(null); setBusy(true)
    try { await post(body); await onRefresh() }
    catch (ex: any) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {err && <div style={{ fontSize: 12, color: C.live }}>{err}</div>}
      {[...groups.entries()].map(([uid, g]) => (
        <div key={uid} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>{g.name}</div>
              <div dir="ltr" style={{ fontFamily: DISP, fontSize: 10.5, color: C.tmut, textAlign: 'right' }}>@{g.tag} · {g.rows.length} مورد</div>
            </div>
            <Num size={16} color={C.gold}>{toman(g.total)}</Num>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.rows.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.tbody, background: C.sf2, borderRadius: 8, padding: '8px 10px' }}>
                <span style={{ flex: 1, minWidth: 0 }}>کد {e.codeLabel} · {e.paidTickets} سهم · {toman(e.buyerPaidTotal)}</span>
                <span style={{ color: C.gold, fontWeight: 700 }}>{toman(e.commissionAmount)}</span>
                <button type="button" disabled={busy} onClick={() => run({ action: 'markPaid', earningId: e.id })} style={{ all: 'unset', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, color: C.win }}>پرداخت شد</button>
              </div>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => run({ action: 'markPaidAll', userId: uid })} style={{ ...btnSecondary }}>
            همه پرداخت شد ({toman(g.total)})
          </button>
        </div>
      ))}
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

const btnPrimaryInline: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'block', textAlign: 'center', minHeight: 40, borderRadius: 10,
  background: C.accent, color: C.ink, fontWeight: 800, fontSize: 12, padding: '0 14px',
}

const btnSecondary: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', minHeight: 38, borderRadius: 10,
  background: C.sf2, color: C.tbody, fontWeight: 700, fontSize: 12, border: `1px solid ${C.line}`, marginTop: 8, boxSizing: 'border-box',
}
