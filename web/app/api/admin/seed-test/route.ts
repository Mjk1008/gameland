import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEvent, createPhoneUser, updateUser, createRegistration, setRegistrationStatus } from '@/lib/store'
import { hashPassword } from '@/lib/password'
import { DISC } from '@/lib/mock-data'

// Admin-only: populate a competition with realistic FAKE participants so a solo
// admin can test the draw → bracket → final flow. Test users are clearly tagged
// (email seed+…@gameland.test, name "تستی …").
const CITIES: [string, string][] = [
  ['تهران', 'تهران'], ['اصفهان', 'اصفهان'], ['شیراز', 'فارس'], ['مشهد', 'خراسان رضوی'],
]
// (count, tickets) per city — varied ticket counts exercise the distribution
const PLAN: Record<string, [number, number][]> = {
  'تهران': [[6, 6], [8, 4], [6, 2], [10, 1]],
  'اصفهان': [[5, 6], [5, 5], [4, 3], [8, 1]],
  'شیراز': [[4, 6], [3, 4], [6, 2], [5, 1]],
  'مشهد': [[3, 6], [4, 3], [7, 1]],
}
const DISCS = Object.keys(DISC)

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return NextResponse.json({ error: 'دسترسی نداری' }, { status: 403 })

  const { compId } = await req.json().catch(() => ({}))
  const c = compId && getEvent(compId)
  if (!c) return NextResponse.json({ error: 'مسابقه پیدا نشد' }, { status: 404 })

  const pw = hashPassword('test1234')
  let created = 0
  const stamp = Date.now().toString().slice(-7)
  let n = 0

  for (const [city, province] of CITIES) {
    const plan = PLAN[city] || []
    for (const [count, tickets] of plan) {
      for (let i = 0; i < count; i++) {
        n++
        const phone = '09' + (stamp + String(n).padStart(2, '0')).slice(-9)
        const email = `seed+${compId}_${stamp}_${n}@gameland.test`
        try {
          const u = createPhoneUser({ phone, email, passwordHash: pw })
          const disc = DISCS[n % DISCS.length]
          updateUser(u.id, {
            name: `تستی ${city} ${i + 1}`, firstName: 'تستی', lastName: `${city}${i + 1}`,
            city, province, primaryDisc: disc as any, discs: [disc] as any,
            messenger: 'telegram' as any,
          })
          const r = createRegistration(u.id, compId, tickets)
          setRegistrationStatus(r.id, 'approved')
          created++
        } catch { /* phone/email collision — skip */ }
      }
    }
  }

  return NextResponse.json({ ok: true, created, cities: CITIES.length })
}
