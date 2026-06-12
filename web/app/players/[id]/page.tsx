import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPlayer, PLAYERS, DISC, tierOf, rankColor, trendOf, avatarBg, sparkline, honorsFor, recentMatches } from '@/lib/mock-data'

export function generateStaticParams() {
  return PLAYERS.map((p) => ({ id: p.tag.toLowerCase() }))
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const p = getPlayer(params.id)
  if (!p) return notFound()

  const disc = DISC[p.disc]
  const tier = tierOf(p.rank)
  const tr = trendOf(p.trend)
  const spark = sparkline(p.points)
  const honors = honorsFor(p.rank)
  const matches = recentMatches(p)
  const peakRank = p.rank <= 3 ? 1 : Math.max(1, p.rank - 3)
  const streak = (p.points % 6) + 3

  return (
    <div className="animate-fade-up">
      {/* Back header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/players" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>پروفایل گیمر</span>
      </div>

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Hero */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, paddingTop: 6 }}>
          <div style={{ position: 'absolute', top: -8, width: 190, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${p.color}22 0%, transparent 70%)`, filter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 24, background: avatarBg(p.color), border: `1.5px solid ${p.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px -10px ${p.color}` }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 40, color: p.color }}>{p.tag[0]}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{p.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, color: '#94a3b8' }}>@{p.tag}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#334155' }} />
              <span>{p.city}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: tier.color, background: '#121821', border: '1px solid #1e293b', padding: '6px 13px', borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, transform: 'rotate(45deg)', background: tier.color }} />
              {tier.label}
            </span>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, fontWeight: 700, color: disc.color, background: avatarBg(disc.color), padding: '6px 12px', borderRadius: 999 }}>{disc.name}</span>
          </div>
        </div>

        {/* Rank banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(245,200,75,.08), #121821)', border: '1px solid rgba(245,200,75,.25)', borderRadius: 18, padding: '16px 18px' }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>رتبهٔ ملی</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>از میان ۸٬۴۰۰ گیمر فعال</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 20, color: '#f5c84b' }}>#</span>
            <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 48, lineHeight: 1, color: '#f5c84b', textShadow: '0 0 22px rgba(245,200,75,.35)' }}>{p.rank}</span>
          </div>
        </div>

        {/* 6 stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { val: p.points.toLocaleString('en-US'), label: 'امتیاز',      color: '#22d3ee' },
            { val: `${p.winrate}٪`,                  label: 'نرخ برد',     color: '#e2e8f0' },
            { val: p.matches.toLocaleString('en-US'),label: 'مسابقه',      color: '#e2e8f0' },
            { val: `#${peakRank}`,                   label: 'بهترین رتبه', color: '#f5c84b' },
            { val: String(streak),                   label: 'برد پیاپی',   color: '#34d399' },
            { val: tr.label,                         label: 'تغییر هفته',  color: tr.color  },
          ].map((s, i) => (
            <div key={i} style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: '13px 10px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 10, color: '#64748b' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 16, padding: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>روند امتیاز</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>۸ هفتهٔ اخیر</span>
          </div>
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" style={{ width: '100%', height: 56, overflow: 'visible' }}>
            <polyline points={spark} fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        {/* Honors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>صفحهٔ افتخارات</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {honors.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, border: `1px solid ${h.color}`, background: '#0b0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: h.color }}>{h.place}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{h.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>مقام {h.place} · {h.year}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={h.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9h12v3a6 6 0 0 1-12 0z"/><path d="M9 18h6M10 21h4"/><path d="M6 9H4a2 2 0 0 1 0-4h2M18 9h2a2 2 0 0 0 0-4h-2"/>
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Recent matches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>مسابقات اخیر</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '10px 13px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: m.resColor, background: m.resBg, padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>{m.resLabel}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>مقابل</span>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, fontSize: 13, color: m.oppColor }}>{m.oppAt}</span>
                </div>
                <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, color: '#cbd5e1' }}>{m.score}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
