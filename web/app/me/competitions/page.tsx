import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, registrationsForUser, getEvent } from '@/lib/store'
import { DISC, avatarBg, statusColor } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default async function MyCompetitionsPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect('/login?callbackUrl=/me/competitions')

  const regs = registrationsForUser(uid)

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>مسابقات من</span>
      </div>

      <div style={{ padding: '14px 16px 28px' }}>
        {regs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: 13 }}>
            <div style={{ marginBottom: 14 }}>هنوز در هیچ مسابقه‌ای ثبت‌نام نکردی</div>
            <Link href="/competitions" style={{ color: '#22d3ee', textDecoration: 'underline' }}>مسابقات فعال</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {regs.map(r => {
              const c = getEvent(r.compId)
              if (!c) return null
              const d = DISC[c.disc], sc = statusColor(c.status)
              return (
                <Link key={r.id} href={`/competitions/${c.id}/me`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#121821', border: '1px solid #1e293b', borderRadius: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: avatarBg(d.color), border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 12, color: d.color }}>{d.short}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{c.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11 }}>
                      <span style={{ color: sc, fontWeight: 700 }}>{c.statusLabel}</span>
                      <span style={{ color: '#475569' }}>·</span>
                      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', color: '#94a3b8' }}>{r.attempts} شانس · {r.seedsEarned} seed</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#22d3ee' }}>›</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
