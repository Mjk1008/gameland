import { persist } from '@/lib/db/persistence'

export const dynamic = 'force-dynamic'

// Serve a user's profile photo straight from Postgres (never held in RAM).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const dataUrl = await persist.avatar.read(params.id)
  if (!dataUrl) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  return new Response(buf, {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=300' },
  })
}
