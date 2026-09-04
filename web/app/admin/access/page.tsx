import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, isSuperAdmin } from '@/lib/store'
import { C } from '@/components/ui'
import AccessClient from './client'

export const dynamic = 'force-dynamic'

// Only the super admin manages access levels — 'organizer' already has full
// staff access and is not a grantor of scoped ones.
export default async function AccessAdmin() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!u || !isSuperAdmin(u)) redirect('/admin')

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.thi, marginBottom: 4 }}>سطوح دسترسی</div>
      <div style={{ fontSize: 11.5, color: C.tmut, marginBottom: 16, lineHeight: 1.7 }}>
        دادن یا گرفتنِ دسترسی‌های محدود به حساب‌های گیمر — بدون تبدیل به کادر.
      </div>
      <AccessClient />
    </div>
  )
}
