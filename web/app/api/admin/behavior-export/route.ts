import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { parseBehaviorRange } from '@/lib/behavior-range'

function csvCell(v: string) {
  return `"${v.replace(/"/g, '""')}"`
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const role = (session as any)?.role
  if (!uid || !getUserById(uid)) return NextResponse.json({ error: 'لاگین کنید' }, { status: 401 })
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const url = new URL(req.url)
  const range = parseBehaviorRange({
    bdays: url.searchParams.get('bdays') ?? undefined,
    bfrom: url.searchParams.get('bfrom') ?? undefined,
    bto: url.searchParams.get('bto') ?? undefined,
  })
  const city = url.searchParams.get('bcity') ?? 'all'
  const disc = url.searchParams.get('bdisc') ?? 'all'
  const filters = { city, disc }

  const rows = await persist.track.listEvents(range.sinceMs, 8000, filters, range.untilMs)
  const header = 'time,name,user_id,session_id,path,props'
  const lines = rows.map(r =>
    [r.created_at, r.name, r.user_id ?? '', r.session_id, r.path, r.props].map(x => csvCell(String(x ?? ''))).join(',')
  )
  const body = '\uFEFF' + header + '\n' + lines.join('\n')
  const tag = range.untilMs ? 'custom' : (range.days || 'all')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gameland-events-${tag}.csv"`,
    },
  })
}
