import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DISC, avatarBg, statusColor, roadmapStages } from '@/lib/mock-data'
import { getUserById, getRegistration, getEvent } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default async function MyRoadmapPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect(`/login?callbackUrl=/competitions/${params.id}/me`)

  const r = getRegistration(uid, params.id)
  if (!r) redirect(`/competitions/${params.id}/register`)

  const d = DISC[c.disc]
  const sc = statusColor(c.status)
  const roadmap = roadmapStages(c.status)

  // Build per-attempt cards (each attempt is a bracket slot)
  const attemptStatuses: Array<{ idx: number; status: 'pending' | 'in_progress' | 'eliminated' | 'seed' }> = []
  for (let i = 0; i < r.attempts; i++) {
    let status: 'pending' | 'in_progress' | 'eliminated' | 'seed' = 'pending'
    if (i < r.seedsEarned) status = 'seed'
    else if (i < r.prelimsCompleted) status = 'eliminated'
    else if (c.status === 'live' && i === r.prelimsCompleted) status = 'in_progress'
    attemptStatuses.push({ idx: i + 1, status })
  }

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>روندنمای من</span>
      </div>

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 50, height: 50, borderRadius: 13, background: avatarBg(d.color), border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: d.color }}>{d.short}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{c.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: sc, fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }}/>{c.statusLabel}
            </div>
          </div>
        </div>

        {/* Summary tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          <Tile label="شانس‌های من" value={r.attempts} color="#22d3ee"/>
          <Tile label="seed به فاینال" value={r.seedsEarned} color="#f5c84b"/>
          <Tile label="انجام‌شده" value={r.prelimsCompleted} color="#94a3b8"/>
        </div>

        {/* Attempts grid */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>براکت‌های مقدماتی من</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {attemptStatuses.map(a => {
              const meta = STATUS_META[a.status]
              return (
                <div key={a.idx} style={{ padding: 11, background: '#121821', border: `1px solid ${meta.color}55`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span dir="ltr" style={{ fontSize: 11, color: '#64748b' }}>شانس #{a.idx}</span>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stage timeline */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>مراحل مسابقه</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {roadmap.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 13, minHeight: 50 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.dotBg, border: `2px solid ${s.color}`, marginTop: 4, boxShadow: '0 0 0 4px #0b0f14' }}/>
                  {i < roadmap.length - 1 && <div style={{ flex: 1, width: 2, background: '#1e293b' }}/>}
                </div>
                <div style={{ flex: 1, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121821', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 13px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.stage}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link href={`/competitions/${c.id}/bracket`} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#121821', border: '1px solid #22d3ee', borderRadius: 12, padding: '12px 0', color: '#22d3ee', fontWeight: 700, fontSize: 13 }}>
          مشاهدهٔ کامل براکت ›
        </Link>
      </div>
    </div>
  )
}

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  pending:      { label: 'منتظر قرعه',  color: '#64748b', icon: '○' },
  in_progress:  { label: 'در جریان',     color: '#22d3ee', icon: '◐' },
  eliminated:   { label: 'حذف',          color: '#fb7185', icon: '✕' },
  seed:         { label: 'به فاینال',    color: '#f5c84b', icon: '★' },
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '13px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color }}>{value}</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
    </div>
  )
}
