import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, profileCompletion } from '@/lib/store'
import WelcomeForm, { type ProfileInit } from './form'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!u) redirect('/login?callbackUrl=/welcome')

  const init: ProfileInit = {
    firstName: u.firstName ?? '',
    lastName:  u.lastName ?? '',
    province:  u.province ?? '',
    city:      u.city ?? '',
    phone:     u.phone ?? '',
    messenger: (u.messenger as any) ?? 'whatsapp',
    tag:       u.tag ?? '',
    discs:     (u.discs as any) ?? [],
    exp:       u.experienceYears != null ? String(u.experienceYears) : '',
    team:      u.teamName ?? '',
    hasPhone:  !!u.phone,
    isComplete: profileCompletion(u).complete,
  }
  return <WelcomeForm init={init} />
}
