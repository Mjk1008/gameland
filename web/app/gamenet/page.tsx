import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getUserById, gamenetsForOwner, gamenetPhotoIdsFor } from '@/lib/store'
import { gamenetStatusLabel } from '@/lib/gamenet-status'
import { C, BackHeader, Button } from '@/components/ui'
import GamenetPhotoManager from './photo-manager'

export const dynamic = 'force-dynamic'

export default async function GamenetHomePage() {
  const session = await getServerSession(authOptions)
  if (!session || !(session as any).uid) redirect('/login?callbackUrl=/gamenet')
  const uid = (session as any).uid as string
  const u = getUserById(uid)
  if (!u) redirect('/login')

  const mine = gamenetsForOwner(uid)
  if (mine.length === 0) redirect('/gamenets/new')

  const g = mine[0]
  const photoIds = gamenetPhotoIdsFor(g.id)
  const st = gamenetStatusLabel(g.status)

  return (
    <div className="animate-fade-up">
      <BackHeader title="گیم‌نتِ من" href="/me" />
      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: st.bg, border: `1px solid ${st.color}55`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: st.color }}>{st.text}</div>
          {g.status === 'rejected' && g.rejectReason && (
            <div style={{ fontSize: 12, color: C.tbody, marginTop: 8, lineHeight: 1.8 }}>دلیل: {g.rejectReason}</div>
          )}
          {g.status === 'pending' && (
            <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 8, lineHeight: 1.8 }}>ظرف ۲۴ تا ۴۸ ساعت بررسی و نتیجه اعلام می‌شه.</div>
          )}
          {g.status === 'rejected' && (
            <Link href="/gamenet/edit" style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, fontWeight: 700, color: C.accent }}>اصلاح و ارسال مجدد ›</Link>
          )}
        </div>

        <GamenetPhotoManager gamenetId={g.id} initialPhotoIds={photoIds} />

        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.thi }}>{g.name}</div>
          <div style={{ fontSize: 12.5, color: C.tbody, marginTop: 4 }}>{g.city} · {g.address}</div>
          {g.openHours && <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 6 }}>ساعات: {g.openHours}</div>}
        </div>

        <Button href="/gamenet/edit" kind="secondary">ویرایش پروفایل ›</Button>
        <Button href={`/gamenets/${g.id}`} kind="secondary">صفحهٔ عمومیِ گیم‌نتم ›</Button>
      </div>
    </div>
  )
}
