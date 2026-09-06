import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { activeStories, storyViewCount, createStory, MAX_STORY_IMAGE_CHARS, MAX_ACTIVE_STORIES } from '@/lib/stories'
import { persist } from '@/lib/db/persistence'

// Only role==='admin' — deliberately narrower than the admin||organizer
// pattern app/api/admin/news/route.ts uses (docs/37 §10.5, explicit user call).
function guard(session: any) {
  return session?.role === 'admin'
}

function validImage(v: unknown): v is string {
  return typeof v === 'string' && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(v) && v.length <= MAX_STORY_IMAGE_CHARS
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const rows = activeStories().map(s => ({ id: s.id, createdAt: s.createdAt, expiresAt: s.expiresAt, viewCount: storyViewCount(s.id) }))
  return NextResponse.json({ stories: rows })
}

// One request creates the story row AND both image bytes together — never a
// half-created story (same principle as this session's register+فیش fix).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!guard(session as any)) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })
  const uid = (session as any)?.uid as string | undefined
  if (!uid) return NextResponse.json({ error: 'فقط ادمین' }, { status: 403 })

  // Active window IS 24h (STORY_WINDOW_MS), so "currently active" already
  // means "created in the last 24h" — one count covers both.
  if (activeStories().length >= MAX_ACTIVE_STORIES) {
    return NextResponse.json({ error: `توی ۲۴ ساعت حداکثر ${MAX_ACTIVE_STORIES} استوری می‌شه گذاشت` }, { status: 400 })
  }

  const b = await req.json().catch(() => ({}))
  const imageData = b.imageData
  const thumbData = b.thumbData
  if (!validImage(imageData) || !validImage(thumbData)) {
    return NextResponse.json({ error: 'عکس معتبر نیست یا حجمش زیاده' }, { status: 400 })
  }

  const s = createStory(uid)
  try {
    await persist.storyMedia.insertAsync(s.id, imageData, thumbData)
  } catch (e) {
    return NextResponse.json({ error: 'ذخیره‌ی عکس ناموفق بود' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: s.id })
}
