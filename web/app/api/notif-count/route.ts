import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unreadCount } from '@/lib/store'

export async function GET() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid) return NextResponse.json({ count: 0 })
  return NextResponse.json({ count: unreadCount(uid) })
}
