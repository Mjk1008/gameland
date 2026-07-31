# Data Platform Spec — storage, consumption, self-serve slicing

Companion to [24-analytics-prd.md](24-analytics-prd.md). That PRD covered the new behavioral
pipeline. This doc covers the older problem it surfaced once real usage began: admin dashboards
were each hand-built with their own fixed breakdown and, in one real case, a silent hard cap —
Arian couldn't see past the top 15 AI users no matter what he needed to check. This is the fix:
an inventory of what's stored, an audit of how each admin screen slices it today, and the shared
pattern going forward so a new "break this down by X" ask is a filter choice, not a new page.

## 1. What's stored (source of truth: `web/lib/db/schema.ts` + `web/lib/db/persistence.ts`)

| Table | Holds | Written by | Read by (today) |
|---|---|---|---|
| `app_users` | player + staff profiles | signup/profile-complete/admin | gamers, analytics, behavior (join), ai monitor (join) |
| `app_registrations` | one row per (user, event), ticket count, status | register/pay/admin approve-reject | requests, analytics, behavior (funnel) |
| `app_events` / `app_competitions` | discipline events / multi-discipline parent | admin CRUD | events, competitions, analytics |
| `app_matches`, `app_placements` | bracket + results | draw/finalize | event detail, leaderboard |
| `app_ai_messages` | assistant chat log, **never hydrated to RAM** | `/api/assistant` | ai monitor only |
| `app_track_events` | pageviews/taps/funnel steps, **never hydrated to RAM** | `/api/track` + server-fired admin events | behavior dashboard only |
| `app_promos`, `app_news` | content slides | admin CRUD | home page + admin content |

Two things worth naming explicitly:

- **The in-memory tables (`app_users`, `app_registrations`, `app_events`...) are fully in RAM** —
  any admin page reading them via `lib/store.ts` already has the *complete* dataset in hand, for
  free, synchronously. There is no technical reason any of these views should ever cap or paginate
  server-side; if they feel limited it's a UI/filtering gap, not a data gap.
- **The Postgres-only tables (`app_ai_messages`, `app_track_events`) are queried live** via
  `persist.ai.*` / `persist.track.*` in `lib/db/persistence.ts`. These *can* legitimately need
  limits (a raw `SELECT *` over all-time chat history doesn't scale), but the limit should be a
  **user-chosen page size / sort**, not a silent constant baked into the query.

## 2. The actual bug: `/admin/ai` hardcoded to 15

`app/admin/ai/page.tsx` (before this fix) computed a 30-day aggregate, sorted by spend, and did
`.slice(0, 15)` — full stop. No way to see user #16, no way to search a specific tag, no way to
sort by question count instead of cost. This wasn't a data limitation (the aggregate query already
scans everyone) — it was a rendering decision that quietly became a data ceiling.

**Fix shipped:** the same aggregate now renders as a client-filterable list — search by tag/name,
sort by spend or question count, no cap. See task in this session; code lives in
`app/admin/ai/page.tsx` + a new `app/admin/ai/list.tsx` client component.

## 3. The other complaint: "scroll an hour to find the city breakdown"

`/admin/analytics` was never capped — `AnalyticsClient` already holds every registration and every
gamer, filtered live via `useMemo`. The actual problem is **layout**: per-competition, per-city,
per-discipline, and the daily trend are four stacked sections, always all rendered, in a fixed
order. Wanting "just city" means scrolling past three sections you didn't ask for.

**Fix shipped:** a "نمایش بر اساس" (view by) segmented control sits above the sections — pick one
dimension (مسابقه / شهر / رشته / روند), see only that, no scrolling past the others. The filter row
above it (time range / discipline / city) is unchanged — it already worked; it just needed a
sibling that controls *which breakdown renders*, not just *which rows count*.

## 4. The pattern going forward

Every admin data view should separate two independent choices:

1. **Filter** — which rows count (time range, city, discipline, status, competition). This narrows
   the dataset.
2. **Dimension** — how the (already-filtered) rows get grouped for display (by city / by
   discipline / by day / raw list). This chooses the *shape* of the output, not its size.

Conflating the two is what produced both bugs above: AI monitor picked one dimension (spend) and
hardcoded it as the *only* one, with a cap standing in for "the rest don't matter." Analytics
supported every dimension but rendered them all simultaneously instead of letting the admin pick.

**Going forward:**
- In-memory-backed views (analytics, behavior, gamers) never need a server-side cap — filter and
  group client-side, since the full dataset is already resident. Add a dimension selector before
  adding a new stacked section.
- Postgres-only views (AI monitor, and any future direct-DB report) may page/limit, but the limit
  must be a control the admin can move (page size, "load more", explicit sort) — never a bare
  constant with no UI affordance to see past it.
- New breakdowns should be a new *option* in an existing filter/dimension row, not a new admin page
  — that's what turned the tools grid into 12 scattered tiles in the first place. This session also
  folds related pages into three hubs (`/admin/content`, `/admin/events` as a tournaments hub,
  `/admin/analytics` as the analytics+behavior+AI hub) so related views live under one URL with
  tabs instead of one tile each.

## 5. Non-goals (v1)

- No generic query builder / arbitrary pivot UI — the dimensions that matter (city, discipline,
  status, time) are known and finite; building for hypothetical future dimensions before one is
  actually asked for would be the same premature-abstraction mistake in a different shape.
- No change to the write path or table schemas — this is purely a read-side/UI fix.
