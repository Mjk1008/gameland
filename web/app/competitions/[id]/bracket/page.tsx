import { notFound } from 'next/navigation'
import Link from 'next/link'
import { COMPS, PLAYERS, DISC, avatarBg } from '@/lib/mock-data'

export function generateStaticParams() {
  return COMPS.map(c => ({ id: c.id }))
}

export default function BracketPage({ params }: { params: { id: string } }) {
  const c = COMPS.find(x => x.id === params.id)
  if (!c) return notFound()
  const d = DISC[c.disc]

  // Build 6 preliminary brackets — fill from PLAYERS for visual demo
  const pool = PLAYERS.filter(p => p.disc === c.disc)
  // pad to 24 via repetition for demo (4 players × 6 brackets)
  const slots = Array.from({ length: 24 }, (_, i) => pool[i % pool.length])
  const brackets = Array.from({ length: 6 }, (_, b) => slots.slice(b * 4, b * 4 + 4))

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>براکت — {c.title}</span>
      </div>

      <div style={{ padding: '14px 16px 28px' }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, padding: '10px 12px', background: '#121821', border: '1px solid #1e293b', borderRadius: 11 }}>
          ۶ براکت مقدماتی · قهرمان هر کدوم → فاینال ۱۲۸ نفره
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {brackets.map((bracket, bi) => (
            <div key={bi}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>براکت {bi + 1}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>۴ نفر · حذفی تک</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Slot p={bracket[0]} d={d}/>
                  <Slot p={bracket[1]} d={d}/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#475569' }}>
                  <Line/><Line/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Slot p={bracket[2]} d={d}/>
                  <Slot p={bracket[3]} d={d}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, padding: '14px 14px', background: 'linear-gradient(90deg, rgba(245,200,75,.07), #121821)', border: '1px solid rgba(245,200,75,.22)', borderRadius: 13 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f5c84b' }}>فاینال ۱۲۸ نفره</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>قهرمانان مقدماتی + seedهای رنکینگ ملی</div>
        </div>
      </div>
    </div>
  )
}

function Slot({ p, d }: { p: any; d: any }) {
  if (!p) return <div style={{ padding: '8px 10px', background: '#0b0f14', border: '1px dashed #1e293b', borderRadius: 9, fontSize: 11, color: '#475569', textAlign: 'center' }}>—</div>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 9 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: avatarBg(p.color), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 11, color: p.color }}>{p.tag[0]}</span>
      </div>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.tag}</span>
    </div>
  )
}
function Line() { return <div style={{ width: 14, height: 1.5, background: '#334155' }}/> }
