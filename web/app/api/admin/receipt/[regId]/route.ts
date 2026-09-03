import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { persist } from '@/lib/db/persistence'

export const dynamic = 'force-dynamic'

function imageResponse(dataUrl: string) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl)
  if (!m) return new Response(null, { status: 404 })
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=60' },
  })
}

// Serve a registration's payment receipt to admins only.
// `?rev=` picks a previous فیش; omit it for the latest snapshot.
export async function GET(req: Request, { params }: { params: { regId: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session as any)?.role
  if (role !== 'admin' && role !== 'organizer') return new Response(null, { status: 403 })

  const rev = new URL(req.url).searchParams.get('rev') ?? ''
  if (rev) {
    const row = await persist.receipt.readRevision(rev)
    if (!row || row.regId !== params.regId) return new Response(null, { status: 404 })
    return imageResponse(row.dataUrl)
  }

  const dataUrl = await persist.receipt.read(params.regId)
  if (!dataUrl) return new Response(null, { status: 404 })
  return imageResponse(dataUrl)
}
