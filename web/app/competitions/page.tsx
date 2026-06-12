import Link from 'next/link'
import { COMPS, DISC, statusColor, avatarBg } from '@/lib/mock-data'

export default function CompetitionsPage() {
  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 19, fontWeight: 800, color: '#f1f5f9' }}>مسابقات</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>فصل جاری</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {COMPS.map((c) => {
          const disc = DISC[c.disc]
          const sc = statusColor(c.status)
          return (
            <Link key={c.id} href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', background: '#121821', border: '1px solid #1e293b', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: avatarBg(disc.color), border: `1px solid ${disc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: disc.color }} dir="ltr">{disc.short}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{c.title}</span>
                    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: sc, background: '#0b0f14', border: '1px solid #1e293b', padding: '4px 9px', borderRadius: 999 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }} />
                      {c.statusLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>{c.season} · {disc.name}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 13, overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: '#f5c84b' }}>{c.prize}M</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>تومان جایزه</span>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: '#1e293b' }} />
                <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: '#e2e8f0' }}>{c.teams}</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>تیم</span>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: '#1e293b' }} />
                <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#cbd5e1', textAlign: 'center' }}>{c.format}</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>فرمت</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
