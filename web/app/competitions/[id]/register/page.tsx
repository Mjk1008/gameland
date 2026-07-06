import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DISC, avatarBg, statusColor } from '@/lib/mock-data'
import { getUserById, getRegistration, getEvent } from '@/lib/store'
import RegisterForm from './form'

export const dynamic = 'force-dynamic'

export default async function RegisterPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect(`/login?callbackUrl=/competitions/${params.id}/register`)

  // If already registered, go straight to roadmap
  if (getRegistration(uid, params.id)) redirect(`/competitions/${params.id}/me`)

  if (c.status === 'done') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>این مسابقه تموم شده — دیگه نمی‌شه ثبت‌نام کرد</div>
      </div>
    )
  }

  return <RegisterForm comp={{ id: c.id, title: c.title, disc: c.disc, status: c.status, statusLabel: c.statusLabel, prize: c.prize, format: c.format, teams: c.teams }}/>
}
