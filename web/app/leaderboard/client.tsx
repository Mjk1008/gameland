'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DISC, rankColor, trendOf, avatarBg, Player, Disc } from '@/lib/mock-data'

type DiscFilter = 'all' | Disc

const DISCS: { id: DiscFilter; name: string }[] = [
  { id: 'all',       name: 'همه رشته‌ها' },
  { id: 'fc26',      name: 'فیفا ۲۶' },
  { id: 'pes21',     name: 'پ‌اس ۲۱' },
  { id: 'efootball', name: 'ای‌فوتبال' },
  { id: 'ufc6',      name: 'یو‌اف‌سی ۶' },
  { id: 'nba2k26',   name: 'NBA 2K26' },
]

export default function LeaderboardClient({ initial }: { initial: Player[] }) {
  const [q,     setQ]     = useState('')
  const [disc,  setDisc]  = useState<DiscFilter>('all')

  const filtered = useMemo(() => {
    let list = initial
    if (disc !== 'all') list = list.filter(p => p.disc === disc)
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(needle) ||
        p.tag.toLowerCase().includes(needle) ||
        p.city.includes(q.trim()),
      )
    }
    return list
  }, [initial, disc, q])

  return (
    <div className="animate-fade-up">
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(11,15,20,.94)', backdropFilter: 'blur(10px)', padding: '12px 16px 10px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>رنکینگ ملی</span>
          <span dir="ltr" style={{ fontSize: 12, color: '#64748b', fontFamily: 'Rajdhani, sans-serif' }}>{filtered.length}/{initial.length} گیمر</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="جستجو در نام، تگ، یا شهر"
            style={{ width: '100%', boxSizing: 'border-box', background: '#121821', border: '1px solid #1e293b', borderRadius: 11, padding: '10px 38px 10px 13px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>

        <div className="gl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          {DISCS.map(d => {
            const on = disc === d.id
            return (
              <button key={d.id} onClick={() => setDisc(d.id)} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 999, background: on ? '#22d3ee' : '#121821', color: on ? '#0b0f14' : '#94a3b8', border: `1px solid ${on ? '#22d3ee' : '#1e293b'}` }}>
                {d.name}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: 13 }}>هیچ گیمری با این مشخصات پیدا نشد</div>
        ) : filtered.map(p => {
          const tr = trendOf(p.trend)
          const d = DISC[p.disc]
          return (
            <Link key={p.rank} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: '#121821', border: `1px solid ${p.rank <= 3 ? 'rgba(245,200,75,.22)' : '#1e293b'}`, borderRadius: 16 }}>
              <span dir="ltr" style={{ width: 30, textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: rankColor(p.rank) }}>{p.rank}</span>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: avatarBg(p.color), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: p.color }}>{p.tag[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 9, fontWeight: 700, color: d.color, background: avatarBg(d.color), padding: '1px 6px', borderRadius: 5 }} dir="ltr">{d.short}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: '#94a3b8' }}>@{p.tag}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#334155' }} />
                  <span>{p.city}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 19, color: '#e2e8f0' }}>{p.points.toLocaleString('en-US')}</span>
                <span dir="ltr" style={{ fontSize: 11, fontWeight: 700, color: tr.color }}>{tr.label}</span>
              </div>
            </Link>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: '#475569', padding: '0 16px 12px', textAlign: 'center' }}>
        تساوی‌شکن‌ها: تعداد مسابقات بیشتر ← بهترین مقام ← آخرین قهرمانی
      </p>
    </div>
  )
}
