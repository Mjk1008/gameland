import { allPromos } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Serve a promo slide's image bytes instead of inlining megabytes of base64
// into the home HTML. Admin can replace a slide's image in place, so cache
// with revalidation rather than immutable.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const p = allPromos().find(x => x.id === params.id)
  if (!p) return new Response(null, { status: 404 })
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(p.imageData)
  if (!m) return new Response(null, { status: 404 })
  const buf = Buffer.from(m[2], 'base64')
  return new Response(buf, {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  })
}
