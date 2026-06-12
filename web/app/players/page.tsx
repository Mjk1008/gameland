import Link from 'next/link'
import { PLAYERS, DISC, rankColor, tierOf, avatarBg } from '@/lib/mock-data'

export default function PlayersPage() {
  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>گیمرها</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>پروفایل‌های برتر</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        {PLAYERS.map((p) => {
          const tier = tierOf(p.rank)
          return (
            <Link key={p.rank} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', position: 'relative', boxSizing: 'border-box', background: '#121821', border: '1px solid #1e293b', borderRadius: 16, padding: '16px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
              <span dir="ltr" style={{ position: 'absolute', top: 10, right: 11, fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: rankColor(p.rank) }}>#{p.rank}</span>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: avatarBg(p.color), border: `1px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 24, color: p.color }}>{p.tag[0]}</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{p.name}</div>
                <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>@{p.tag}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: tier.color, background: '#0b0f14', border: '1px solid #1e293b', padding: '3px 10px', borderRadius: 999 }}>{tier.label}</span>
              <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 11 }}>
                <div style={{ flex: 1, padding: '7px 4px', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, color: '#f5c84b' }}>{p.points.toLocaleString('en-US')}</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>امتیاز</span>
                </div>
                <div style={{ width: 1, background: '#1e293b' }} />
                <div style={{ flex: 1, padding: '7px 4px', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, color: '#22d3ee' }}>{p.winrate}٪</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>برد</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
