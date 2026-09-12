import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { persist } from '@/lib/db/persistence'
import { getRegistrationById, teammateRegistration } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Serve a registration's payment receipt to admins only.
export async function GET(_req: Request, { params }: { params: { regId: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return new Response(null, { status: 403 })

  let dataUrl = await persist.receipt.read(params.regId)
  // 2v2: the partner may have uploaded the فیش under the old both-pay flow.
  if (!dataUrl) {
    const r = getRegistrationById(params.regId)
    const other = r ? teammateRegistration(r) : undefined
    if (other) dataUrl = await persist.receipt.read(other.id)
  }
  if (!dataUrl) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl)
  if (!m) return new Response(null, { status: 404 })
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=60' },
  })
}
