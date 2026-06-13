import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGamenet } from '@/lib/store'
import { DISC, avatarBg } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default function GamenetPage({ params }: { params: { id: string } }) {
  const g = getGamenet(params.id)
  if (!g) return notFound()

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/gamenets" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>گیم‌نت</span>
      </div>

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 6 }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: 'linear-gradient(135deg, #22d3ee22, #1e293b)', border: '1.5px solid #22d3ee55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="6" width="16" height="11" rx="2"/><path d="M9 17v3M15 17v3M7 20h10"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <span style={{ fontWeight: 800, fontSize: 19, color: '#f1f5f9' }}>{g.name}</span>
              {g.verified && <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: '#34d39922', padding: '2px 6px', borderRadius: 5 }}>✓ تأییدشده</span>}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{g.city}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Tile label="ایستگاه" value={g.stations} color="#22d3ee"/>
          <Tile label="بازی‌ها" value={g.disciplines.length} color="#f5c84b"/>
        </div>

        <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row icon="📍" label="آدرس" value={g.address}/>
          {g.phone && <Row icon="📞" label="تلفن" value={g.phone} dir="ltr"/>}
        </div>

        {g.disciplines.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>بازی‌های پشتیبانی‌شده</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {g.disciplines.map(did => {
                const d = DISC[did as keyof typeof DISC]
                if (!d) return null
                return <span key={did} style={{ fontSize: 11, fontWeight: 700, color: d.color, background: avatarBg(d.color), padding: '5px 11px', borderRadius: 999 }}>{d.name}</span>
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 26, color }}>{value}</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
    </div>
  )
}
function Row({ icon, label, value, dir }: { icon: string; label: string; value: string; dir?: 'ltr' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
        <div dir={dir} style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2, fontFamily: dir === 'ltr' ? 'Rajdhani, sans-serif' : undefined }}>{value}</div>
      </div>
    </div>
  )
}
