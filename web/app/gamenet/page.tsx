import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getUserById, gamenetsForOwner, hasGamenetPhoto } from '@/lib/store'
import { C, BackHeader, Button } from '@/components/ui'

export const dynamic = 'force-dynamic'

// Owner-console entry point — today it only shows signup status; later
// phases (profile editing, own competitions, quota) land as sections on this
// same route once ownership exists. See docs/26-gamenet-platform-plan.md §5.
export default async function GamenetHomePage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).uid) redirect('/login?callbackUrl=/gamenet')
  const uid = (session as any).uid as string
  const u = getUserById(uid)
  if (!u) redirect('/login')

  const mine = gamenetsForOwner(uid)
  if (mine.length === 0) redirect('/gamenets/new')

  const g = mine[0]
  const photo = hasGamenetPhoto(g.id)

  return (
    <div className="animate-fade-up">
      <BackHeader title="گیم‌نتِ من" href="/me" />
      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {photo && <img src={`/api/gamenet-photo/${g.id}`} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 16, border: `1px solid ${C.line}` }} />}

        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.verified ? C.win : C.gold, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 800, color: g.verified ? C.win : C.gold }}>
              {g.verified ? 'تأیید شده' : 'در انتظار بررسی'}
            </span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.thi }}>{g.name}</div>
          <div style={{ fontSize: 12.5, color: C.tbody, marginTop: 4 }}>{g.city} · {g.address}</div>
          {!g.verified && (
            <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 10, lineHeight: 1.8 }}>
              درخواستت ثبت شد — ظرف ۲۴ تا ۴۸ ساعت بررسی و نتیجه اعلام می‌شه.
            </div>
          )}
        </div>

        <Button href={`/gamenets/${g.id}`} kind="secondary">صفحهٔ عمومیِ گیم‌نتم ›</Button>
      </div>
    </div>
  )
}
