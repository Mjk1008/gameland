import { isStoryServable } from '@/lib/stories'
import { persist } from '@/lib/db/persistence'

export const dynamic = 'force-dynamic'

// Serve a story's full image. Checks the in-RAM story metadata FIRST — an
// expired or admin-removed story must never be fetchable by a cached direct
// URL (docs/37 §3), and it's a free check before ever touching Postgres.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isStoryServable(params.id)) return new Response(null, { status: 404 })
  const row = await persist.storyMedia.read(params.id)
  if (!row) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(row.dataUrl)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  // Bytes never change under the same id — long-lived immutable cache
  // (unlike avatars, which get replaced in place under the same id).
  return new Response(buf, {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
