import { NextResponse } from 'next/server'
import { getUserById } from '@/lib/store'
import { follow, unfollow } from '@/lib/match-desk'
import { withTodayUser } from '@/lib/today-hub-http'

// Player check-in (here/ready/ref) was removed entirely (docs/37 §10.1) —
// this route now only carries the follow graph.
type Body = {
  action?: 'follow' | 'unfollow'
  targetUid?: string
}

export async function POST(req: Request) {
  return withTodayUser(async uid => {
    const b = (await req.json().catch(() => ({}))) as Body
    const action = b.action

    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ error: 'عملیات نامعتبره' }, { status: 400 })
    }

    const targetUid = (b.targetUid ?? '').toString()
    if (!targetUid || !getUserById(targetUid)) return NextResponse.json({ error: 'بازیکن پیدا نشد' }, { status: 400 })
    if (action === 'follow') follow(uid, targetUid); else unfollow(uid, targetUid)
    return NextResponse.json({ ok: true })
  })
}
