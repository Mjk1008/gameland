import Link from 'next/link'
import { allUsers } from '@/lib/store'
import { DISC, rankColor, avatarBg } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const DISC_COLOR: Record<string, string> = {
  fc26: '#38bdf8', pes21: '#34d399', efootball: '#22d3ee', ufc6: '#fb7185', tekken: '#a78bfa',
}

export default function PlayersPage() {
  const players = allUsers()
    .filter(u => u.role === 'gamer')
    .map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      tag: u.tag,
      city: u.city,
      disc: u.primaryDisc,
      color: DISC_COLOR[u.primaryDisc ?? ''] ?? '#94a3b8',
    }))

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>گیمرها</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>{players.length} گیمر</span>
      </div>

      {players.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b', fontSize: 13 }}>
          هنوز گیمری ثبت‌نام نکرده
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {players.map((p) => {
            const disc = p.disc ? DISC[p.disc as keyof typeof DISC] : null
            const discColor = disc?.color ?? p.color
            return (
              <Link key={p.id} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', position: 'relative', boxSizing: 'border-box', background: '#121821', border: '1px solid #1e293b', borderRadius: 16, padding: '16px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                <span dir="ltr" style={{ position: 'absolute', top: 10, right: 11, fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: rankColor(p.rank) }}>#{p.rank}</span>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: avatarBg(p.color), border: `1px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 24, color: p.color }}>{p.tag[0]}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{p.name}</div>
                  <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>@{p.tag}</div>
                </div>
                {disc && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: discColor, background: '#0b0f14', border: '1px solid #1e293b', padding: '3px 10px', borderRadius: 999 }} dir="ltr">{disc.short}</span>
                )}
                <div style={{ fontSize: 11, color: '#64748b' }}>{p.city}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
