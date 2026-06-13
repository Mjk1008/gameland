import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PLAYERS, COMPS, DISC, tierOf, rankColor, trendOf, avatarBg, statusColor } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const signedIn = !!(session as any)?.uid
  const champ = PLAYERS[0]
  const champDisc = DISC[champ.disc]
  const champTrend = trendOf(champ.trend)
  const topPlayers = PLAYERS.slice(0, 6)
  const activeComps = COMPS.filter((c) => c.status === 'live' || c.status === 'open')

  return (
    <div className="animate-fade-up" style={{ padding: '12px 16px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: '.04em', color: '#e2e8f0' }}>GAMELAND</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>رنکینگ ملی ای‌اسپورت</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#121821', border: '1px solid #1e293b', borderRadius: 999, padding: '6px 12px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
          <span style={{ fontSize: 10, color: '#94a3b8' }}>آنلاین</span>
        </div>
      </div>

      {/* Guest CTA banner */}
      {!signedIn && (
        <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0d1b2a 0%, #0b0f14 100%)', border: '1px solid #22d3ee33', borderRadius: 18, padding: '18px 16px' }}>
          <div style={{ position: 'absolute', top: -20, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, #22d3ee22 0%, transparent 70%)' }}/>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>خانهٔ گیمرهای ایران</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, lineHeight: 1.7 }}>
                Gamer Bank · رنکینگ ملی · مسابقات حرفه‌ای · صفحهٔ افتخارات
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link href="/login" style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 800, fontSize: 13, padding: '11px 0', borderRadius: 11 }}>ورود</Link>
              <Link href="/login" style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#121821', color: '#22d3ee', fontWeight: 700, fontSize: 13, padding: '11px 0', borderRadius: 11, border: '1px solid #22d3ee44' }}>ثبت‌نام رایگان</Link>
            </div>
          </div>
        </div>
      )}

      {/* Champion hero */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, border: '1px solid rgba(245,200,75,.28)', background: '#121821', padding: 16 }}>
        <div style={{ position: 'absolute', top: -40, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,200,75,.14) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(245,200,75,.12)', border: '1px solid rgba(245,200,75,.3)', color: '#f5c84b', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
            <span dir="ltr">#1</span> رنکینگ ملی
          </span>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700, color: champDisc.color, background: avatarBg(champDisc.color), padding: '3px 9px', borderRadius: 7 }} dir="ltr">{champDisc.short}</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: avatarBg(champ.color), border: `1px solid ${champ.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 26, color: champ.color }}>{champ.tag[0]}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 19, color: '#f1f5f9' }}>{champ.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#64748b', marginTop: 4 }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: '#94a3b8' }}>@{champ.tag}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#334155' }} />
              <span>{champ.city}</span>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' }}>
          {[
            { val: champ.points.toLocaleString('en-US'), label: 'امتیاز', color: '#f5c84b' },
            { val: `${champ.winrate}٪`, label: 'نرخ برد', color: '#22d3ee' },
            { val: champ.matches.toLocaleString('en-US'), label: 'مسابقه', color: '#e2e8f0' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '11px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRight: i < 2 ? '1px solid #1e293b' : 'none' }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 10, color: '#64748b' }}>{s.label}</span>
            </div>
          ))}
        </div>
        <Link href={`/players/${champ.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', boxSizing: 'border-box', padding: 11, borderRadius: 12, background: 'rgba(245,200,75,.1)', border: '1px solid rgba(245,200,75,.25)', color: '#f5c84b', fontSize: 13, fontWeight: 700 }}>
          مشاهدهٔ پروفایل
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
        </Link>
      </div>

      {/* Top players */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>برترین‌های هفته</span>
          <Link href="/leaderboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#22d3ee', textDecoration: 'none' }}>
            مشاهدهٔ کامل
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {topPlayers.map((p) => {
            const tr = trendOf(p.trend)
            const disc = DISC[p.disc]
            return (
              <Link key={p.rank} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', background: '#121821', border: `1px solid ${p.rank <= 3 ? 'rgba(245,200,75,.22)' : '#1e293b'}`, borderRadius: 14 }}>
                <span dir="ltr" style={{ width: 22, textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: rankColor(p.rank) }}>{p.rank}</span>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: avatarBg(p.color), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: p.color }}>{p.tag[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{disc.name}</div>
                </div>
                <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: '#cbd5e1' }}>{p.points.toLocaleString('en-US')}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Active competitions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>مسابقات فعال</span>
          <Link href="/competitions" style={{ fontSize: 12, color: '#22d3ee', textDecoration: 'none' }}>همه</Link>
        </div>
        <div className="gl-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -16px', padding: '2px 16px' }}>
          {activeComps.map((c) => {
            const disc = DISC[c.disc]
            const sc = statusColor(c.status)
            return (
              <Link key={c.id} href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: 232, background: '#121821', border: '1px solid #1e293b', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700, color: disc.color, background: avatarBg(disc.color), padding: '3px 9px', borderRadius: 7 }} dir="ltr">{disc.short}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: sc }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }} />
                    {c.statusLabel}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{c.season}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: 11 }}>
                  <div>
                    <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: '#f5c84b' }}>{c.prize}M</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>تومان جایزه</div>
                  </div>
                  <span dir="ltr" style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{c.teams} تیم</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 8, padding: '12px 0 0', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'center', gap: 14, fontSize: 11, color: '#475569' }}>
        <Link href="/about"    style={{ color: '#64748b', textDecoration: 'none' }}>درباره</Link>
        <span>·</span>
        <Link href="/rules"    style={{ color: '#64748b', textDecoration: 'none' }}>قوانین</Link>
        <span>·</span>
        <Link href="/sponsors" style={{ color: '#64748b', textDecoration: 'none' }}>حامیان</Link>
        <span>·</span>
        <Link href="/gamenets" style={{ color: '#64748b', textDecoration: 'none' }}>گیم‌نت</Link>
      </div>

    </div>
  )
}
