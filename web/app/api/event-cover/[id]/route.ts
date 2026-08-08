import { persist } from '@/lib/db/persistence'
import { hasEventCover } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!hasEventCover(params.id)) return new Response(null, { status: 404 })
  const dataUrl = await persist.eventCover.read(params.id)
  if (!dataUrl) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  return new Response(buf, {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  })
}
