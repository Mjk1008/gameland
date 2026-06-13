import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getComp, PLAYERS, DISC, statusColor, avatarBg, rankColor, prizeBreakdown, roadmapStages } from '@/lib/mock-data'
import { getRegistration } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default async function CompetitionPage({ params }: { params: { id: string } }) {
  const c = getComp(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid as string | undefined
  const reg = uid ? getRegistration(uid, params.id) : undefined

  const disc = DISC[c.disc]
  const sc = statusColor(c.status)
  const breakdown = prizeBreakdown(c.prize)
  const roadmap = roadmapStages(c.status)
  const topPlayers = PLAYERS.filter((p) => p.disc === c.disc).slice(0, 4)

  return (
    <div className="animate-fade-up">
      {/* Back header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/competitions" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>جزئیات مسابقه</span>
      </div>

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Comp hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: avatarBg(disc.color), border: `1px solid ${disc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, color: disc.color }} dir="ltr">{disc.short}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>{c.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: sc }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }} />
                  {c.statusLabel}
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{c.season}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '12px 15px' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{c.date}</span>
          </div>

          {/* Registration CTA */}
          {c.status !== 'done' && (
            reg ? (
              <Link href={`/competitions/${c.id}/me`} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#121821', border: '1px solid #f5c84b', borderRadius: 13, padding: '13px 0', color: '#f5c84b', fontWeight: 700, fontSize: 14 }}>
                روندنمای من ({reg.attempts} شانس) ›
              </Link>
            ) : (
              <Link href={uid ? `/competitions/${c.id}/register` : `/login?callbackUrl=/competitions/${c.id}/register`} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 800, fontSize: 15, padding: '14px 0', borderRadius: 13 }}>
                {uid ? 'ثبت‌نام در این مسابقه' : 'ورود برای ثبت‌نام'}
              </Link>
            )
          )}
        </div>

        {/* Prize pool */}
        <div style={{ background: 'linear-gradient(90deg, rgba(245,200,75,.07), #121821)', border: '1px solid rgba(245,200,75,.22)', borderRadius: 18, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>جایزهٔ کل</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 30, color: '#f5c84b' }}>{c.prize}M</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>تومان</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {breakdown.map((b) => (
              <div key={b.place} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span dir="ltr" style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${b.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: b.color, flexShrink: 0 }}>{b.place}</span>
                <span style={{ flex: 1, fontSize: 12, color: '#94a3b8' }}>مقام {b.place}</span>
                <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{b.amount}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#0b0f14', borderRadius: 11, fontSize: 11, color: '#475569' }}>
            تأمین جایزه توسط حامیان · ورودی = هزینهٔ سرویس مهارتی، نه شرط‌بندی
          </div>
        </div>

        {/* Format / teams */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>فرمت</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>{c.format}</div>
          </div>
          <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: 14 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>شرکت‌کنندگان</span>
            <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginTop: 4 }}>{c.teams} تیم</div>
          </div>
        </div>

        {/* Player roadmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>روندنمای بازیکن</span>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', paddingRight: 6 }}>
            {roadmap.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 14, minHeight: 52 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.dotBg, border: `2px solid ${r.color}`, marginTop: 4, boxShadow: '0 0 0 4px #0b0f14' }} />
                  {i < roadmap.length - 1 && <div style={{ flex: 1, width: 2, background: '#1e293b' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '11px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{r.stage}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top players */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>گیمرهای شاخص</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {topPlayers.map((p) => (
              <Link key={p.rank} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '10px 13px' }}>
                <span dir="ltr" style={{ width: 22, textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: rankColor(p.rank) }}>{p.rank}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: avatarBg(p.color), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, color: p.color }}>{p.tag[0]}</span>
                </div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{p.name}</span>
                <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, color: '#cbd5e1' }}>{p.points.toLocaleString('en-US')}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
