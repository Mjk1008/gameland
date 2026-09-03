import { NextResponse } from 'next/server'

// Extra-ticket auto-seat after draw is not the same as loser re-entry
// (شانس مجدد). That flow is not live; this endpoint stays closed.
export async function POST() {
  return NextResponse.json({ error: 'پیدا نشد' }, { status: 404 })
}
