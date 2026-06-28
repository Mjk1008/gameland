import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUserByTag, allEvents, placementsForUser, allUsers, allPlacements } from '@/lib/store'
import { pointsForPlacement } from '@/lib/ranking'
import type { EventTier } from '@/lib/schema'
import { DISC, avatarBg, sparkline } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const DISC_COLOR: Record<string, string> = {
  valorant: '#fb7185', cs2: '#fbbf24', pubgm: '#34d399', fc: '#38bdf8',
}
const TIER_LABEL: Record<string, string> = { S: 'ماژور', A: 'گیم‌لند', B: 'آل‌استار', C: 'محلی' }

function tierBadge(rank: number): { label: string; color: string } {
  if (rank <= 3)  return { label: 'افسانه', color: '#f5c84b' }
  if (rank <= 10) return { label: 'الماس',  color: '#22d3ee' }
  return                 { label: 'استاد',  color: '#94a3b8' }
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const u = getUserByTag(params.id)
  if (!u || u.role === 'admin') return notFound()

  const disc = u.primaryDisc ? DISC[u.primaryDisc as keyof typeof DISC] : null
  const color = DISC_COLOR[u.primaryDisc ?? ''] ?? '#94a3b8'

  // Compute ranking
  const allUsers_ = allUsers().filter(x => x.role === 'gamer')
  const events = allEvents()
  const allPl = allPlacements()
  const eventMap = new Map(events.map(e => [e.id, e]))

  const pointsAcc = new Map<string, number>()
  for (const pl of allPl) {
    const event = eventMap.get(pl.compId)
    if (!event) continue
    const pts = pointsForPlacement(pl.rank, (event.tier ?? 'A') as EventTier)
    pointsAcc.set(pl.userId, (pointsAcc.get(pl.userId) ?? 0) + pts)
  }
  const sorted = [...allUsers_].sort((a, b) => (pointsAcc.get(b.id) ?? 0) - (pointsAcc.get(a.id) ?? 0))
  const rank = sorted.findIndex(x => x.id === u.id) + 1

  // User's placements = honors
  const myPlacements = placementsForUser(u.id)
  const points = pointsAcc.get(u.id) ?? 0
  const tier = tierBadge(rank || 999)
  const spark = sparkline(points)

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/players" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>پروفایل گیمر</span>
      </div>

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Hero */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, paddingTop: 6 }}>
          <div style={{ position: 'absolute', top: -8, width: 190, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, filter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 24, background: avatarBg(color), border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px -10px ${color}` }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 40, color }}>{u.tag[0]}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{u.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: '#94a3b8' }}>@{u.tag}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#334155' }} />
              <span>{u.city}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: tier.color, background: '#121821', border: '1px solid #1e293b', padding: '6px 13px', borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, transform: 'rotate(45deg)', background: tier.color }} />
              {tier.label}
            </span>
            {disc && (
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 700, color: disc.color, background: avatarBg(disc.color), padding: '6px 12px', borderRadius: 999 }}>{disc.name}</span>
            )}
          </div>
        </div>

        {/* Rank banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(245,200,75,.08), #121821)', border: '1px solid rgba(245,200,75,.25)', borderRadius: 18, padding: '16px 18px' }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>رتبهٔ ملی</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>از میان {allUsers_.length} گیمر</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 20, color: '#f5c84b' }}>#</span>
            <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 48, lineHeight: 1, color: '#f5c84b', textShadow: '0 0 22px rgba(245,200,75,.35)' }}>{rank || '—'}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { val: points.toLocaleString('en-US'), label: 'امتیاز',    color: '#22d3ee' },
            { val: myPlacements.length.toString(),  label: 'ایونت',     color: '#e2e8f0' },
            { val: myPlacements.filter(p => p.rank === 1).length.toString(), label: 'قهرمانی', color: '#f5c84b' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: '13px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 10, color: '#64748b' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        {points > 0 && (
          <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 16, padding: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>روند امتیاز</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>تاریخچه</span>
            </div>
            <svg viewBox="0 0 100 32" preserveAspectRatio="none" style={{ width: '100%', height: 56, overflow: 'visible' }}>
              <polyline points={spark} fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        )}

        {/* Honors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>صفحهٔ افتخارات</span>
          {myPlacements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#475569', fontSize: 12, background: '#121821', border: '1px solid #1e293b', borderRadius: 14 }}>
              هنوز در مسابقه‌ای شرکت نکرده
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {myPlacements
                .sort((a, b) => a.rank - b.rank)
                .map((pl, i) => {
                  const ev = eventMap.get(pl.compId)
                  const plColor = pl.rank === 1 ? '#f5c84b' : pl.rank === 2 ? '#cbd5e1' : pl.rank === 3 ? '#d6a77a' : '#475569'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: '12px 14px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${plColor}`, background: '#0b0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: plColor }}>{pl.rank}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{ev?.title ?? pl.compId}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          مقام {pl.rank} · {ev ? TIER_LABEL[ev.tier] ?? ev.tier : ''} · {ev?.season ?? ''}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9h12v3a6 6 0 0 1-12 0z"/><path d="M9 18h6M10 21h4"/><path d="M6 9H4a2 2 0 0 1 0-4h2M18 9h2a2 2 0 0 0 0-4h-2"/>
                      </svg>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
