'use client'
import { useMemo, useState } from 'react'
import { C, DISP, EmptyState } from '@/components/ui'
import { toJalali, faDigits, J_MONTHS } from '@/lib/jalali'

interface Row {
  regId: string; status: 'approved' | 'rejected'; attempts: number
  name: string; tag: string; phone: string; city: string; event: string
  hasReceipt: boolean; at: number
}

const jdate = (ms: number) => {
  const d = new Date(ms)
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${faDigits(j.jd)} ${J_MONTHS[j.jm - 1]} ${faDigits(j.jy)}`
}

export default function HistoryList({ rows }: { rows: Row[] }) {
  const [st, setSt] = useState<'all' | 'approved' | 'rejected'>('all')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    let list = rows
    if (st !== 'all') list = list.filter(r => r.status === st)
    const n = q.trim().toLowerCase()
    if (n) list = list.filter(r => r.name.toLowerCase().includes(n) || r.tag.toLowerCase().includes(n) || r.phone.includes(n) || r.event.toLowerCase().includes(n) || r.city.includes(q.trim()))
    return list
  }, [rows, st, q])

  const nApproved = rows.filter(r => r.status === 'approved').length
  const nRejected = rows.length - nApproved
  const tickets = filtered.reduce((a, r) => a + (r.status === 'approved' ? r.attempts : 0), 0)

  return (
    <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* filters */}
      <div style={{ display: 'flex', gap: 7 }}>
        {([['all', `همه (${faDigits(rows.length)})`], ['approved', `تاییدشده (${faDigits(nApproved)})`], ['rejected', `ردشده (${faDigits(nRejected)})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSt(k)} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 13px', borderRadius: 10, background: st === k ? C.accentSoft : C.sf2, color: st === k ? C.accent : C.tbody, border: `1px solid ${st === k ? C.accent : C.line}` }}>{l}</button>
        ))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام، تگ، شماره، مسابقه یا شهر"
        style={{ width: '100%', boxSizing: 'border-box', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 13px', color: C.thi, fontSize: 13, outline: 'none' }} />

      <div style={{ fontSize: 11.5, color: C.tmut }}>
        <span className="gl-num">{faDigits(filtered.length)}</span> درخواست{tickets > 0 && <> · جمعِ سهمِ تاییدشده: <span className="gl-num" style={{ color: C.win }}>{faDigits(tickets)}</span></>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="سابقه‌ای با این فیلتر نیست." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(r => {
            const ok = r.status === 'approved'
            return (
              <div key={r.regId} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 7, background: ok ? C.winSoft : C.liveSoft, color: ok ? C.win : C.live, border: `1px solid ${(ok ? C.win : C.live)}44`, flexShrink: 0 }}>{ok ? 'تایید' : 'رد'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: C.thi }}>{r.name}</div>
                    <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{r.tag}{r.city ? ` · ${r.city}` : ''}{r.phone ? ` · ${r.phone}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <span className="gl-num" style={{ fontSize: 17, fontWeight: 800, color: ok ? C.win : C.tmut }}>{faDigits(r.attempts)}</span>
                    <div style={{ fontSize: 9, color: C.tmut }}>سهم</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: C.tbody, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.event}</span>
                  <span style={{ fontSize: 10.5, color: C.tmut, flexShrink: 0 }}>{jdate(r.at)}</span>
                </div>
                {r.hasReceipt && (
                  <a href={`/api/admin/receipt/${r.regId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 11.5, fontWeight: 700, color: C.accent, textDecoration: 'none' }}>دیدنِ فیش ›</a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
