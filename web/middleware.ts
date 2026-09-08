import { NextResponse, type NextRequest } from 'next/server'

// Profile completion is no longer a hard wall. Users sign up with the bare
// minimum, browse freely, and complete their profile from the profile page
// (a completion meter nudges them). A full profile is required only at
// competition registration, which is enforced there. So middleware is mostly
// a passthrough — its one job is stamping the request path onto a header so
// server components (which have no direct pathname API) can read it, e.g.
// app/admin/layout.tsx scoping a `result_entry` grantee to /admin/today.
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers)
  headers.set('x-pathname', req.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.).*)'],
}
