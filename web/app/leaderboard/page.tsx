import Link from 'next/link'
import { PLAYERS, DISC, rankColor, trendOf, avatarBg, tierOf } from '@/lib/mock-data'

export default function LeaderboardPage() {
  const discs = [
    { id: 'all', name: 'همه رشته‌ها' },
    { id: 'valorant', name: 'ولورنت' },
    { id: 'cs2', name: 'CS2' },
    { id: 'pubgm', name: 'پابجی' },
    { id: 'fc', name: 'EA FC' },
  ]

  return (
    <div className="animate-fade-up">
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(11,15,20,.94)', backdropFilter: 'blur(10px)', padding: '12px 16px 10px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>رنکینگ ملی</span>
          <span dir="ltr" style={{ fontSize: 12, color: '#64748b', fontFamily: 'Rajdhani, sans-serif' }}>{PLAYERS.length} گیمر</span>
        </div>
        <div className="gl-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          {discs.map((d, i) => (
            <span key={d.id} style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 999, background: i === 0 ? '#22d3ee' : '#121821', color: i === 0 ? '#0b0f14' : '#94a3b8', border: `1px solid ${i === 0 ? '#22d3ee' : '#1e293b'}`, cursor: 'pointer' }}>
              {d.name}
            </span>
          ))}
        </div>
      </div>

      {/* Player cards */}
      <div style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {PLAYERS.map((p) => {
          const tr = trendOf(p.trend)
          const disc = DISC[p.disc]
          return (
            <Link key={p.rank} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: '#121821', border: `1px solid ${p.rank <= 3 ? 'rgba(245,200,75,.22)' : '#1e293b'}`, borderRadius: 16 }}>
              <span dir="ltr" style={{ width: 30, textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: rankColor(p.rank) }}>{p.rank}</span>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: avatarBg(p.color), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: p.color }}>{p.tag[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 9, fontWeight: 700, color: disc.color, background: avatarBg(disc.color), padding: '1px 6px', borderRadius: 5 }} dir="ltr">{disc.short}</span>
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
