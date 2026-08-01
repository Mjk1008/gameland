import { persist } from '@/lib/db/persistence'

export const dynamic = 'force-dynamic'

// Serve a gamenet's venue photo straight from Postgres (never held in RAM).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const dataUrl = await persist.gamenetPhoto.read(params.id)
  if (!dataUrl) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  return new Response(buf, {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  })
}
