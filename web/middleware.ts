import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Force signed-in users whose gamer profile is incomplete to /welcome.
// Runs only on app pages (matcher below excludes api/static). The JWT carries
// `needsProfile`, refreshed on every request in the auth jwt callback.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Never intercept the completion page itself or auth/logout flows.
  if (pathname.startsWith('/welcome') || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-prod' })
  if (token && (token as any).needsProfile) {
    const url = req.nextUrl.clone()
    url.pathname = '/welcome'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Skip API, Next internals, and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.).*)'],
}
