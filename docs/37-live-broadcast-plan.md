# 37 — Live Broadcast (پخش زنده) PRD + Build Plan

**Stage:** build plan · **Status:** 🔶 in progress — target: tomorrow's finals
**Trigger:** فینال فردا — پخاش‌ها با موبایل از میدون مسابقات لایو می‌رن، اپ باید نشونش بده.

> **Golden rules (same as `31-match-day-build-plan.md`)**
> 1. Build the whole thing on the current feature branch. Don't touch `mvp` directly.
> 2. **Deploy to `gameland-rehearsal` first** (`node scripts/rehearsal/deploy.mjs --app gameland-rehearsal`), run the full checklist in §8, only then merge + deploy live (`npm run ship -- "message"`, then confirm `git push origin mvp`).
> 3. In-memory, single-instance store (CLAUDE.md §2) — this feature adds **zero DB tables**. See §3 for why that's the right call here.
> 4. Never inline base64 video/images into a page (CLAUDE.md §2) — not applicable here since we never touch video bytes at all (see §2).

---

## 1. What we're building

**«پخاش»** (broadcaster) goes live on their own **verified Aparat account** from the finals venue. Gameland **never ingests, transcodes, or serves video** — it only:

1. Lets a broadcaster tell the app "this Aparat live stream = این Event" (`/broadcast`).
2. Shows a **«زنده» card rail on Home** for every stream currently marked live.
3. On tap, opens `/live/[id]` — a page that just embeds the Aparat player (`<iframe>`) pointed at that stream.

This is deliberately **not** a native streaming product (no RTMP ingest, no WebRTC, no CDN of our own). Building that from scratch would need new infra Liara's single Next.js app instance isn't sized for, and could not be built/tested safely in one day. Wrapping an existing, Iran-reachable, already-verified live platform is the only version of this that is both correct and shippable by tomorrow.

---

## 2. Locked decisions

| # | Decision | Why |
|---|----------|-----|
| 1 | **Embed Aparat**, not build our own ingest/transcode/CDN | Only realistic option in a 1-day window; Aparat already solves Iran reachability, ingest, HLS, and CDN |
| 2 | Live rail = **card row at the top of Home**, not a new bottom-nav tab | Bottom nav is already full (`میدون` replaced `دعوت` — CLAUDE.md §7); a banner is lower-risk to ship and remove |
| 3 | Broadcaster access = **existing scoped-permission system** (`/admin/access`), not a new env var | The app already has exactly this mechanism (`Permission`, `PERMISSIONS`, `hasPermission`, `isSuperAdmin`, `/admin/access`) for `result_entry` — reusing it means no new access-control code to get wrong under time pressure |
| 4 | **Every `role:'admin'` account is a broadcaster by default** | "فعلا همین ادمین‌هایی که داریم پخاش هم باشن" — today's staff double as پخاش without any setup |
| 5 | Super admin can also grant the scoped **`live_broadcast`** permission to a plain gamer account | For a دوست/همکار who isn't full admin staff but needs to run one camera |
| 6 | **In-memory only, no DB table** | This is throwaway state for one event — started/ended by hand within minutes. A restart just means re-clicking "شروع پخش"; not worth a schema entry the night before a live event |
| 7 | One live stream = one `(Event, embedUrl)` pair, admin pastes the embed by hand | No API integration with Aparat (no OAuth, no webhook) — fastest and most reliable path today |

---

## 3. Data & access model

### `lib/live.ts` (in-memory)
```ts
interface LiveStream {
  id: string
  eventId: string
  eventTitle: string   // denormalized at start-time, so the card never needs a join
  disc: string
  embedUrl: string      // validated aparat.com iframe src only
  startedAt: number
  startedByPhone: string
}
```
- `listLiveStreams()`, `getLiveStream(id)`, `startLiveStream()`, `endLiveStream()` — plain `Map`, no persistence, no hydration loader.
- `isBroadcaster()` — `role === 'admin' || hasPermission(u, 'live_broadcast')`.
- `normalizeAparatEmbed(raw)` — accepts a pasted `<iframe>` snippet, an `aparat.com/v/HASH` share link, or an already-embed URL; **rejects anything whose host isn't `aparat.com` over https**. This is the only input-validation surface exposed to a non-superadmin role, so it's written defensively (regex-extract `src=` from a pasted `<iframe>`, then re-validate the resulting URL — never trust the raw string).

### Permission system (extended, not replaced)
- `lib/store.ts`: `Permission` gains `'live_broadcast'`; `PERMISSIONS` gains its label/desc row.
- `app/admin/access/client.tsx`: same addition to the client-side mirror array (per its own comment: "kept in sync with lib/store.ts PERMISSIONS").
- No changes to `/api/admin/permissions/route.ts` — it already grants/revokes by `Permission` key generically.

---

## 4. Routes & files

| File | Purpose |
|---|---|
| `lib/live.ts` | Store + access + Aparat URL validation |
| `app/api/broadcast/start/route.ts` | `POST {eventId, embedUrl}` — gated by `isBroadcaster()` |
| `app/api/broadcast/end/route.ts` | `POST {id}` — gated by `isBroadcaster()` |
| `app/broadcast/page.tsx` + `client.tsx` | پخاش panel: pick open/live Event, paste Aparat link, start/end. 404 for non-broadcasters (same pattern as `/arcade`) |
| `components/LiveBanner.tsx` | Home rail of live cards; renders `null` when nothing is live |
| `app/live/[id]/page.tsx` | Watch page — `<iframe src={embedUrl}>`, 16:9, `notFound()` if the stream already ended |
| `lib/store.ts`, `app/admin/access/client.tsx` | `live_broadcast` permission added |

**Not yet wired:** `<LiveBanner />` needs one import + one line in `app/page.tsx` (same spot as `<HonorPoster />`) — last step before rehearsal deploy, see §7.

---

## 5. Security notes

- Every mutating route (`/api/broadcast/start`, `/api/broadcast/end`) re-checks `isBroadcaster()` server-side — the `/broadcast` page's `notFound()` gate is UX only, not the real boundary.
- `normalizeAparatEmbed` hard-fails anything not on `aparat.com` (https only) — a broadcaster account pasting a bad link (or a compromised one) can't get an arbitrary third-party iframe into the app.
- No new admin-role or auth changes — broadcaster is additive on top of the existing `Permission` system, so it can't accidentally widen anyone's access to bracket/results/finance screens.

---

## 6. Explicit non-goals for tomorrow

- No DB persistence of stream history (in-memory only — see decision #6).
- No auto-detection of stream end (Aparat side) — پخاش must tap «پایان پخش» by hand. If they forget, the card just sits there; low-severity, fix by hand from `/broadcast` or `/admin`.
- No live-viewer count, chat, or reactions.
- No multi-camera switcher inside our app — each پخاش = one Aparat stream = one card.
- No automatic polling/refresh on Home or the watch page — Home is `force-dynamic` already so a normal page load picks up state changes; acceptable for a same-day event.

---

## 7. Remaining work (in order)

1. ~~Data model, API routes, pages, permission wiring~~ — **done** (this branch).
2. Mount `<LiveBanner />` on `app/page.tsx` (one import + one line, same spot as `<HonorPoster />`).
3. `npm run build` locally — confirm no TS/ESLint break.
4. **Blocking unknown — do this in parallel, today:** confirm Aparat serves a working `<iframe>` embed for an **in-progress** live stream (not just VOD). 10-minute test: go live briefly on the verified account → open that video's page while live → get the embed code → drop it into a bare HTML file → confirm it plays and note the latency.
   - **If it works:** ship as planned.
   - **If Aparat locks live embeds:** fall back to a "تماشا در آپارات" link-out button instead of an `<iframe>` on `/live/[id]` — same data model, ~10 line change, no architecture impact. Flag immediately if this branch is needed so it can be built before rehearsal.
5. Grant access: super admin adds `live_broadcast` to any non-admin پخاش via `/admin/access` (admins already qualify automatically — decision #4).
6. Deploy to `gameland-rehearsal`, run §8 checklist.
7. Fix anything §8 finds, redeploy to rehearsal, re-check.
8. Merge to `mvp`, `npm run ship -- "live broadcast: پخش زنده تب فینال"`, confirm `git push origin mvp` happened.

---

## 8. Rehearsal checklist (must pass before going live)

- [ ] `liara env ls --app gameland-rehearsal` — confirm target is rehearsal, not `gameland` (per CLAUDE.md §1 rule: never deploy a stale/wrong checkout to prod).
- [ ] Log in as an `admin` account → `/broadcast` loads (no 404).
- [ ] Log in as a plain gamer **without** the permission → `/broadcast` → 404.
- [ ] Super admin grants `live_broadcast` to a test gamer account from `/admin/access` → that account can now open `/broadcast`.
- [ ] Start a stream: pick an Event, paste a **real** Aparat live link/iframe → card appears in the پخاش panel's "در حال پخش" list.
- [ ] Home page (signed out **and** signed in) shows the live card rail at the top.
- [ ] Tap card → `/live/[id]` loads → video actually plays, audio works, latency is acceptable for watching a match.
- [ ] Paste a non-aparat.com URL into the start form → rejected with a clear error, no crash.
- [ ] پخاش taps «پایان پخش» → card disappears from the panel **and** from Home on next load.
- [ ] Visiting a `/live/[id]` for a stream that already ended → clean 404, not a crash.
- [ ] Two streams live at once (two test accounts/tables) → both cards show, both play correctly, independently ended.
- [ ] Mobile width (~390px, the real audience) — banner cards don't overflow, iframe stays responsive, no horizontal page scroll.

---

## 9. Open questions for tomorrow morning

1. **Aparat live-embed test (§7.4)** — result determines iframe vs. link-out. Owner: you, today.
2. How many پخاش accounts / simultaneous tables tomorrow? Determines how many accounts need the Aparat verified-live entitlement, and whether Aparat's per-account concurrent-stream limit is a problem (check this alongside #1).
3. Who are the non-admin پخاش (if any) who need `live_broadcast` granted ahead of time, so it's not being done live at the venue?
