import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, registrationsForUser, getEvent } from '@/lib/store'
import { C, StatusChip, BackHeader, EmptyState, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function MyCompetitionsPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect('/login?callbackUrl=/me/competitions')

  const regs = registrationsForUser(uid)

  return (
    <div className="animate-fade-up">
      <BackHeader title="مسابقات من" href="/me" />
      <div style={{ padding: '16px 16px 28px' }}>
        {regs.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
            <EmptyState text="هنوز توی هیچ مسابقه‌ای ثبت‌نام نکردی." />
            <div style={{ textAlign: 'center', paddingBottom: 18 }}>
              <Link href="/competitions" style={{ color: C.accent, fontSize: 13, textDecoration: 'none' }}>دیدن مسابقه‌ها ›</Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {regs.map(r => {
              const c = getEvent(r.compId)
              if (!c) return null
              return (
                <Link key={r.id} href={`/competitions/${c.id}/me`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{c.title}</div>
                    <div className="gl-num" style={{ fontSize: 11, color: C.tmut, marginTop: 4 }}>{r.attempts} بلیط · {r.seedsEarned} seed</div>
                  </div>
                  <StatusChip status={c.status} />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
