import { getNews } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Serve a news cover's bytes (same pattern as promo slides — never inline
// base64 into the home HTML). Admin can replace the image in place → cache
// with revalidation.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const n = getNews(params.id)
  if (!n) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(n.imageData)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  return new Response(buf, {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  })
}
