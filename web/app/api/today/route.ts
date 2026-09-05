import { NextResponse } from 'next/server'
import { buildTodaySnapshot } from '@/lib/today-snapshot'
import { withTodayUser } from '@/lib/today-hub-http'

export async function GET() {
  return withTodayUser(async uid => NextResponse.json(buildTodaySnapshot(uid)))
}
