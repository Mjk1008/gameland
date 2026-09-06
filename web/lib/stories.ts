// Today Stories («امروز» — استوریِ سبکِ اینستاگرام) + تابلوِ اعلانِ تاریخچه‌ای.
// In-memory state + business rules, persisted via persist.story* / persist.
// todayAnnouncement (see lib/db/persistence.ts). Mirrors lib/match-desk.ts's
// shape: store.ts delegates hydration here via a lazy require() to avoid a
// load cycle. See docs/37-today-stories-plan.md for the full spec.
import { persist } from './db/persistence'
export { STORY_WINDOW_MS, STORY_IMAGE_DURATION_MS, MAX_STORY_IMAGE_CHARS, MAX_ACTIVE_STORIES } from './stories-shared'
import { STORY_WINDOW_MS } from './stories-shared'

export interface Story {
  id: string
  createdAt: number
  expiresAt: number
  createdBy: string
  removedAt?: number
}

export interface TodayAnnouncement {
  id: string
  text: string
  createdAt: number
  createdBy: string
  removedAt?: number
}

const stories = new Map<string, Story>()
const storyViews = new Map<string, Set<string>>()   // storyId -> Set<userId> who've seen it
const announcements = new Map<string, TodayAnnouncement>()

function ms(v: unknown): number | undefined {
  if (v == null) return undefined
  return v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(String(v))
}

// ─── hydration (called from store.ts's ensureHydrated via lazy require) ────
export function hydrateStory(row: { id: string; createdAt: unknown; expiresAt: unknown; createdBy: string; removedAt?: unknown }) {
  stories.set(row.id, {
    id: row.id, createdAt: ms(row.createdAt) ?? Date.now(), expiresAt: ms(row.expiresAt) ?? Date.now(),
    createdBy: row.createdBy, removedAt: ms(row.removedAt),
  })
}
export function hydrateStoryView(row: { storyId: string; userId: string }) {
  const set = storyViews.get(row.storyId) ?? new Set<string>()
  set.add(row.userId)
  storyViews.set(row.storyId, set)
}
export function hydrateAnnouncement(row: { id: string; text: string; createdAt: unknown; createdBy: string; removedAt?: unknown }) {
  announcements.set(row.id, {
    id: row.id, text: row.text, createdAt: ms(row.createdAt) ?? Date.now(),
    createdBy: row.createdBy, removedAt: ms(row.removedAt),
  })
}

// One-time repair after hydration: views for stories that expired long ago
// just accumulate forever with nothing ever pruning them (they're loaded
// fully into RAM on every boot). Keep a week's worth for late admin
// look-back, drop the rest. Call once from store.ts, after startHydration().
export function pruneOldStoryViews(): void {
  const cutoff = Date.now() - 7 * 24 * 3600_000
  for (const [storyId] of storyViews) {
    const s = stories.get(storyId)
    if (s && s.expiresAt < cutoff) {
      storyViews.delete(storyId)
      persist.storyView.deleteForStory(storyId)
    }
  }
}

// ─── stories ────────────────────────────────────────────────────────────
// Newest-first (docs/37 §4.2 — matches the app's own "lists are newest-first
// everywhere" convention; ring color, not position, carries seen/unseen).
export function activeStories(): Story[] {
  const now = Date.now()
  return [...stories.values()]
    .filter(s => !s.removedAt && s.expiresAt > now)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getStory(id: string): Story | undefined { return stories.get(id) }

// Serving guard for /api/story-media/[id]: check RAM (cheap) before ever
// touching Postgres, so a deleted/expired story's bytes are never fetchable
// by a direct URL that got cached client-side.
export function isStoryServable(id: string): boolean {
  const s = stories.get(id)
  return !!s && !s.removedAt && s.expiresAt > Date.now()
}

export function createStory(createdBy: string): Story {
  const now = Date.now()
  const s: Story = { id: 'story_' + Math.random().toString(36).slice(2, 10), createdAt: now, expiresAt: now + STORY_WINDOW_MS, createdBy }
  stories.set(s.id, s)
  persist.story.insert(s)
  return s
}

// Admin early-delete: soft-delete the metadata (keeps the view-count audit
// trail), hard-delete the media bytes immediately — an admin pulling a
// story usually means it's wrong; its bytes shouldn't stay fetchable.
export function removeStory(id: string): void {
  const s = stories.get(id)
  if (!s || s.removedAt) return
  s.removedAt = Date.now()
  persist.story.remove(id, s.removedAt)
  persist.storyMedia.delete(id)
}

export function hasSeenStory(storyId: string, userId: string): boolean {
  return storyViews.get(storyId)?.has(userId) ?? false
}

// Batched (docs/37 §4.4/D6) — the client collects ids and calls this once on
// viewer close + once on visibilitychange→hidden, not per-segment.
export function markStoriesSeen(storyIds: string[], userId: string): void {
  for (const id of storyIds) {
    if (!stories.has(id)) continue
    const set = storyViews.get(id) ?? new Set<string>()
    if (set.has(userId)) continue
    set.add(userId)
    storyViews.set(id, set)
    persist.storyView.insert(id, userId)
  }
}

export function storyViewCount(storyId: string): number {
  return storyViews.get(storyId)?.size ?? 0
}

// ─── announcements (shared historical board, not per-user notifs) ─────────
export function activeAnnouncements(): TodayAnnouncement[] {
  return [...announcements.values()].filter(a => !a.removedAt).sort((a, b) => b.createdAt - a.createdAt)
}

export function createAnnouncement(text: string, createdBy: string): TodayAnnouncement {
  const a: TodayAnnouncement = { id: 'ann_' + Math.random().toString(36).slice(2, 10), text, createdAt: Date.now(), createdBy }
  announcements.set(a.id, a)
  persist.todayAnnouncement.insert(a)
  return a
}

export function removeAnnouncement(id: string): void {
  const a = announcements.get(id)
  if (!a || a.removedAt) return
  a.removedAt = Date.now()
  persist.todayAnnouncement.remove(id, a.removedAt)
}
