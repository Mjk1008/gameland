import { isStoryServable } from '@/lib/stories'
import { persist } from '@/lib/db/persistence'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isStoryServable(params.id)) return new Response(null, { status: 404 })
  const row = await persist.storyMedia.read(params.id)
  if (!row) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(row.thumbDataUrl)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  return new Response(buf, {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
