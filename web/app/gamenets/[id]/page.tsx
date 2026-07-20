import { notFound } from 'next/navigation'
import { getGamenet } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, DISP, DiscChip, BackHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function GamenetPage({ params }: { params: { id: string } }) {
  const g = getGamenet(params.id)
  if (!g) return notFound()

  return (
    <div className="animate-fade-up">
      <BackHeader title={g.name} href="/gamenets" />

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 6 }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: C.accentSoft, border: `1.5px solid ${C.line2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="6" width="16" height="11" rx="2"/><path d="M9 17v3M15 17v3M7 20h10"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <span style={{ fontWeight: 800, fontSize: 19, color: C.thi }}>{g.name}</span>
              {g.verified && <span style={{ fontSize: 11, fontWeight: 700, color: C.win, background: C.winSoft, padding: '2px 6px', borderRadius: 5 }}>✓ تأییدشده</span>}
            </div>
            <div style={{ fontSize: 12.5, color: C.tbody, marginTop: 4 }}>{g.city}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Tile label="ایستگاه" value={g.stations} color={C.accent}/>
          <Tile label="بازی‌ها" value={g.disciplines.length} color={C.gold}/>
        </div>

        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>}
            label="آدرس" value={g.address}
          />
          {g.phone && <Row
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.8 9.8a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/></svg>}
            label="تلفن" value={g.phone} dir="ltr"
          />}
        </div>

        {g.disciplines.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 8 }}>بازی‌های پشتیبانی‌شده</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {g.disciplines.map(did => {
                const d = DISC[did as keyof typeof DISC]
                if (!d) return null
                return <DiscChip key={did} disc={did} name={d.name} />
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
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 26, color }}>{value}</span>
      <span style={{ fontSize: 11.5, color: C.tmut }}>{label}</span>
    </div>
  )
}
function Row({ icon, label, value, dir }: { icon: React.ReactNode; label: string; value: string; dir?: 'ltr' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: C.tmut, display: 'inline-flex' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: C.tmut }}>{label}</div>
        <div dir={dir} style={{ fontSize: 12.5, color: C.thi, marginTop: 2, fontFamily: dir === 'ltr' ? DISP : undefined }}>{value}</div>
      </div>
    </div>
  )
}
