'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DISC, Player, Disc } from '@/lib/mock-data'
import { C, DISP, Num, DISC_DOT } from '@/components/ui'

type DiscFilter = 'all' | Disc

const DISCS: { id: DiscFilter; name: string }[] = [
  { id: 'all', name: 'همه' },
  { id: 'fc26', name: 'فیفا ۲۶' },
  { id: 'pes21', name: 'پ‌اس ۲۱' },
  { id: 'efootball', name: 'ای‌فوتبال' },
  { id: 'ufc6', name: 'یو‌اف‌سی ۶' },
  { id: 'nba2k26', name: 'NBA 2K26' },
]

export default function LeaderboardClient({ initial }: { initial: Player[] }) {
  const [q, setQ] = useState('')
  const [disc, setDisc] = useState<DiscFilter>('all')

  const filtered = useMemo(() => {
    let list = initial
    if (disc !== 'all') list = list.filter(p => p.disc === disc)
    if (q.trim()) {
      const n = q.trim().toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(n) || p.tag.toLowerCase().includes(n) || p.city.includes(q.trim()))
    }
    return list
  }, [initial, disc, q])

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(20,17,13,.94)', backdropFilter: 'blur(10px)', padding: '14px 16px 10px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>رنکینگ ملی</span>
          <span className="gl-num" style={{ fontSize: 12, color: C.tmut }}>{filtered.length}/{initial.length}</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام، تگ یا شهر"
            style={{ width: '100%', boxSizing: 'border-box', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 38px 11px 13px', color: C.thi, fontSize: 13, outline: 'none' }} />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.tmut} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        <div className="gl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          {DISCS.map(d => {
            const on = disc === d.id
            return (
              <button key={d.id} onClick={() => setDisc(d.id)} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 999, background: on ? C.accent : C.sf1, color: on ? C.ink : C.tbody, border: `1px solid ${on ? C.accent : C.line}` }}>
                {d.name}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: C.tmut, fontSize: 13 }}>گیمری با این مشخصات پیدا نشد — فیلتر یا جستجو رو عوض کن.</div>
        ) : filtered.map(p => {
          const d = DISC[p.disc]
          return (
            <Link key={p.rank} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, boxSizing: 'border-box', padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
              <span className="gl-num" style={{ width: 34, textAlign: 'center', fontWeight: 800, fontSize: 30, color: p.rank === 1 ? C.accent : p.rank <= 3 ? C.gold : C.tbody }}>{p.rank}</span>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: C.thi }}>{p.tag[0]?.toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{p.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: DISC_DOT[p.disc] ?? C.tmut }} />
                  <span style={{ fontSize: 11, color: C.tmut }}>{d?.name} · {p.city}</span>
                </div>
              </div>
              <Num size={22}>{p.points.toLocaleString('en-US')}</Num>
            </Link>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: C.tmut, padding: '0 16px 12px', textAlign: 'center' }}>
        در تساوی امتیاز: مسابقهٔ بیشتر ← بهترین مقام ← تازه‌ترین مسابقه
      </p>
    </div>
  )
}
