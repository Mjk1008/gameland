# CLAUDE.md — Gameland

> **This app is LIVE with real users and real money.** Read this fully before changing anything.
> Persian-first (RTL), mobile-first esports tournament + national-ranking platform for Iran.

---

## 1. Where to work, and how to ship

| | |
|---|---|
| **Working copy** | `~/gameland` — branch `mvp` · `git@github.com:Mjk1008/gameland.git` |
| **Also exists** | `~/gameland-work` — older cloud clone; prefer `~/gameland` now |
| **NEVER use `/tmp`** | macOS purges it. On 2026-07-26 it emptied `public/fonts`, `public/cards`, `public/games` and corrupted `.git` mid-session; two deploys failed with "Upload failed" because files vanished during archiving. |
| **Deploy** | `npm run ship -- "message"` from repo root, or `cd web && liara deploy --no-app-logs` |
| **Never** | plain `liara deploy` — it hangs forever tailing app logs after a successful deploy |
| **Always** | `git push origin mvp` with every deploy |
| **Live URLs** | `gamelandteam.ir` (+ `www`), also `gameland.liara.run` |

### The rule that matters most
`liara deploy` **uploads the working directory, not git.** A stale checkout silently rolls production
backwards with no error. This happened twice in one day: once from a branch 36 commits behind
`origin/mvp`, once from 22 commits that lived only on local disk. **Before branching or deploying:
`git fetch` and confirm you are not behind `origin/mvp`.** After deploying: push.

If two working copies exist, diff the trees before touching production — do not assume which is ahead.

---

## 2. Architecture

**In-memory store with write-through to Postgres.** `lib/store.ts` holds everything in Maps/arrays;
every mutation also fires a write to Liara Managed Postgres via `lib/db/persistence.ts` (Drizzle).
On boot, `startHydration()` pulls rows back into memory. All public store APIs are **synchronous**.

- **SINGLE INSTANCE ONLY** (`scale: 1`). Two instances would diverge — the memory is the source of
  truth for reads. Never scale horizontally without replacing the store first.
- **Durable writes** on the critical path use the awaitable variants (`persist.user.insertAsync`,
  `persist.reg.insertAsync`) so signup/register only return 200 once the row is committed.
- **`whenReady()`** gates auth/signup/register so requests never race the initial hydration
  (which would create duplicate accounts).
- **Self-healing schema**: `persistence.ts` runs idempotent `CREATE TABLE IF NOT EXISTS` /
  `ALTER TABLE ADD COLUMN IF NOT EXISTS` on boot. **New tables and columns ship via deploy — no
  manual migration.** Add yours to that list.

### Blob pattern (important for memory)
Base64 images live in their **own tables** and are **never hydrated into RAM**. Memory holds only a
`Set` of ids; bytes are served on demand through an API route with cache headers.

| Blob | Table | Served by |
|---|---|---|
| Profile photos | `app_avatars` | `/api/avatar/[id]` |
| Payment receipts (فیش) | `app_receipts` | `/api/admin/receipt/[regId]` (admin only) |
| News covers | `app_news` | `/api/news-image/[id]` |
| Promo slides | `app_promos` | `/api/promo/[id]` |
| Gamenet photos | `app_gamenet_photos` | `/api/gamenet-photo/[id]` |

**Never inline base64 into a page.** Doing so once made the home page 7.4 MB / 12 s on mobile.
Home is ~45 KB now. If you add an image type, follow this pattern.

---

## 3. Domain model

- **Competition** (`رویداد`) groups several **Events** (`رشته` — one per game). Registration and
  brackets live on the Event. **`Competition.location` is the venue the app and the AI assistant
  report** — editable at `/admin/competitions/[id]`.
- **Registration**: one row per (user, event). `attempts` = سهم bought (**cap 6 per discipline**).
  `paidAttempts` = already settled on approval, so a top-up bills only the difference.
  `freeAttempts` = referral-reward tickets. `rejectReason` = admin's reason, surfaced to the user
  and to the assistant.
- **Status flow**: `pending → approved | rejected`. Rejected users can re-request. Admin can reverse
  either way from `/admin/requests/history`. **Everything locks once the bracket is drawn**
  (`matchesForComp(compId).length > 0`).
- **Points** = admin `bonusPoints` + live `activityPointsOf()` (profile 25, photo 10, approved سهم 15
  each, pending 5, arrived via referral 50) + placement points (`lib/ranking.ts`, tier-multiplied).
  Activity points are **derived, never stored**. Home, leaderboard, profile and the assistant must
  all use the same formula — they do; keep it that way.
- **Draw**: `lib/bracket.ts` → `distributeSeats()` gives each player *distinct* bracket indices, so
  one person's سهم can never meet each other. City-grouped prelims, max 3 seeds to the final.

---

## 4. The AI assistant («دستیار گیم‌لند»)

- **Route**: `app/api/assistant/route.ts` — SSE stream through **Metis** (Iran-accessible OpenAI
  proxy; OpenAI itself is sanction-blocked from Liara). Key in `METIS_API_KEY`.
- **Model**: `lib/ai-config.ts` → `AI_MODEL`. Currently `gpt-5.4-mini`. Chosen by replaying the real
  prompt against candidates, not by preference.
- **Grounding**: every request injects a live snapshot (profile, registrations + reject reasons,
  open events with venue/date/deadline, notifications, referral state). The snapshot is placed
  **after** chat history so fresh state always outranks anything said earlier.
- **Knowledge base**: `app_settings` key `ai_knowledge`, edited at `/admin/ai`. This is where facts
  the data model can't hold live (venue, in-person vs online, receipt SLA, schedules). **It is read
  into memory at hydration — writing it straight to Postgres requires an app restart to take
  effect.** Editing through the admin UI updates memory immediately.
- **Widgets**: the model emits markers (`[[event:ID]]`, `[[news]]`, `[[status]]`,
  `[[go:/path|label]]`) which the client renders from server-supplied entities, so a widget can
  never display something invented. The route appends a fallback marker if the model forgets one.
- **Limits**: 20 messages/user/day counted **from Postgres** (an in-memory counter reset on every
  deploy and silently handed everyone a fresh quota), plus a 2000/day app-wide brake in memory,
  500-char input, 320-token output, 12-turn / 4500-char history budget.
  `ASSISTANT_ENABLED=false` kills the feature instantly.
- **Cost**: ~96% of spend is *input* tokens (~1,590 in vs ~69 out per answer). To cut cost, trim the
  context — do not downgrade the model.
- **Monitoring**: `/admin/ai` shows usage, estimated cost, top spenders with anomaly flags, and
  full per-user transcripts (`app_ai_messages`, never hydrated to RAM).

### Analysing conversations
`liara env ls --app gameland` prints env **values**, so `DATABASE_URL` is retrievable. A `pg` client
lives in `~/.glq`. Connect with `ssl: false` (the server rejects SSL). Read-only analysis of
`app_ai_messages` is how the last round of assistant bugs was found — prefer evidence over guessing.

---

## 5. Iran constraints (non-negotiable)

- **Self-host every font.** Google Fonts is blocked. `public/fonts/*.woff2` (Vazirmatn) must exist in
  the deployed tree or all Persian text falls back to system fonts.
- **No CDNs** (jsdelivr etc. blocked). Everything bundled or self-hosted.
- **Google OAuth cannot work** from Liara (sanctions). Auth is phone + password, OTP via
  **Kavenegar** (`app/api/otp/send` → `lib/sms.ts`, template `KAVENEGAR_OTP_TEMPLATE`).
  `lib/store.ts` still exports a dead `issueOtp()` — it is never called; the live path is `lib/otp.ts`.
- **`.npmrc` has `audit=false`** — the npm audit phase used to hang Liara builds.

---

## 6. UI gotchas learned the hard way

- **`position: fixed` inside a transformed ancestor anchors to that ancestor, not the viewport.**
  The page-entry `animate-fade-up` keeps a transform forever (`fill-mode: both`), which made the news
  modal open mid-page and the assistant FAB stick to the bottom of the content. **Portal every modal
  and floating element to `document.body`** (`createPortal`).
- **Installed PWA renders edge-to-edge** (`viewportFit: cover`), so content sits under the iOS status
  bar. Sticky headers use `top: env(safe-area-inset-top)`, `globals.css` paints an opaque strip
  behind the status bar in `display-mode: standalone`, and the bottom nav's height includes
  `env(safe-area-inset-bottom)`.
- **Use `vh` with a `dvh` intent carefully** — `dvh` is invalid on older iOS; modals use `vh`.
- Lists are **newest-first** everywhere (admin queue, history, notifications). Keep that.
- Approve/reject lives **only inside the review sheet** at `/admin/requests` — list cards carry no
  action buttons, so a stray double-tap can't approve the wrong person. Don't "helpfully" add them back.

---

## 7. Gated features

- **Play Arena («میدون»)** — `/arena` replaces the bottom-nav «دعوت» tab. Nationwide 1v1 play
  requests (discipline, best-of, book at verified gamenet, dual confirm → capped ranking points).
  PRD: [`docs/27-challenge-ladder-prd.md`](docs/27-challenge-ladder-prd.md). Referral campaign
  demoted to `/me` → `/invite`; backend (`?ref=`, rewards) unchanged.
- **Honorary arcade** — `/arcade` + `components/HonorPoster.tsx` + `lib/honor.ts`. Server-gated on
  `HONOR_USER_PHONE` (comma-separated). Non-honorary sessions get a plain 404 and the home poster
  renders `null`, so nothing leaks. Fully isolated: it must not touch anything else in the app.
- **Referral campaign** — code = the user's own `@tag`, entered **at ticket purchase** (not signup),
  prefilled from `?ref=` caught anywhere in the app. Rewards count **approved** tickets only
  (3 → 1 free سهم, 6 → 3 total). `setReferrerByTag` is immutable and blocks self-referral.
  Marketing brief: [`docs/gameland-referral-brief.md`](docs/gameland-referral-brief.md).

---

## 8. Working style

- The user is the PM. **Propose product/UX solutions, don't add a button per request** — this app is
  meant to be professional and sustainable, not a feature factory. Dev/test tooling never ships.
- Act autonomously; don't ask for step-by-step confirmation. **Ask before deploying** when the user
  has said to hold.
- Before claiming something works, verify it live (HTTP codes, served asset sizes, HTML markers).
- When the user reports a quality problem, **find evidence in the data first** (logs, DB, real
  transcripts) and fix the root cause — several "the AI is dumb" reports turned out to be an empty
  knowledge base, a `#0` rank bug, and rules missing from the prompt.

---

## 9. Active work (as of 2026-08-06)

| Track | Doc | Status |
|---|---|---|
| **Gamenet platform** | [`docs/26-gamenet-platform-plan.md`](docs/26-gamenet-platform-plan.md) | Phase 1–2 + 0.5 shipped; Phase 3+ pending |
| **Team 2v2** | [`docs/27-team-format-plan.md`](docs/27-team-format-plan.md) | Code shipped; pilot on separate رویداد |
| **Execution plan** | [`docs/28-execution-plan.md`](docs/28-execution-plan.md) | Sprint order |

Strategy docs live in `docs/`. Env vars on Liara: `DATABASE_URL`, `NEXTAUTH_SECRET`,
`KAVENEGAR_API_KEY`, `KAVENEGAR_OTP_TEMPLATE`, `METIS_API_KEY`, `HONOR_USER_PHONE`.
