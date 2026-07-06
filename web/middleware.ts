import { NextResponse } from 'next/server'

// Profile completion is no longer a hard wall. Users sign up with the bare
// minimum, browse freely, and complete their profile from the profile page
// (a completion meter nudges them). A full profile is required only at
// competition registration, which is enforced there. So middleware is a
// passthrough now — kept as a hook point for future needs.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.).*)'],
}
