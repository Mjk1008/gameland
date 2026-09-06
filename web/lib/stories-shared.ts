// Constants shared between server (lib/stories.ts) and client components
// (story-viewer.tsx etc). Kept dependency-free — no store.ts/persistence.ts
// import here — so it's safe to pull into a client bundle (mirrors
// lib/payment.ts's own note about staying client-safe).
export const STORY_WINDOW_MS = 24 * 3600_000        // how long a story stays up
export const STORY_IMAGE_DURATION_MS = 8000          // on-screen time per story (docs/37 §10.4)
export const MAX_STORY_IMAGE_CHARS = 3_000_000       // ~2.2MB decoded — same cap as the فیش upload
export const MAX_ACTIVE_STORIES = 15                 // per rolling 24h window (== STORY_WINDOW_MS)
