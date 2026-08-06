import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { replaceTeamPartner, getUserById, getTeam, whenReady } from '@/lib/store'

export async function POST(req: Request) {
  await whenReady()
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!uid || !u) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const teamId = (body.teamId ?? '').toString()
  const partnerTag = (body.partnerTag ?? '').toString().trim()
  if (!getTeam(teamId)) return NextResponse.json({ error: 'تیم پیدا نشد' }, { status: 404 })
  if (!partnerTag) return NextResponse.json({ error: 'تگِ هم‌تیمیِ جدید رو وارد کن' }, { status: 400 })

  try {
    const mem = replaceTeamPartner(uid, teamId, partnerTag)
    return NextResponse.json({ ok: true, member: mem })
  } catch (e: any) {
    const map: Record<string, string> = {
      TEAM_NOT_FOUND: 'تیم پیدا نشد',
      NOT_CAPTAIN: 'فقط کاپیتانِ تیم می‌تونه هم‌تیمی رو عوض کنه',
      REG_LOCKED: 'ثبت‌نام بسته شده — قرعه‌کشی انجام شده',
      INVALID_PARTNER: 'تگِ هم‌تیمی درست نیست — یا پیدا نشد، خودتی، یا قبلاً برای این تیم دعوت شده بود',
      PARTNER_ALREADY_REGISTERED: 'هم‌تیمی‌ای که انتخاب کردی قبلاً تو این مسابقه ثبت‌نام کرده',
    }
    return NextResponse.json({ error: map[e.message] || e.message }, { status: 400 })
  }
}
