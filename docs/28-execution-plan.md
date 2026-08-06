# 28 — Execution Plan: Gamenet + 2v2 (mvp branch)

**Created:** 2026-08-06 · **Branch:** `mvp` · **Live:** gamelandteam.ir  
**Refs:** [`26-gamenet-platform-plan.md`](26-gamenet-platform-plan.md) · [`27-team-format-plan.md`](27-team-format-plan.md) · [`CLAUDE.md`](../CLAUDE.md)

> Ordered sprints. Each sprint ships independently. **Never skip sync/gates before deploy.**

---

## Current baseline (after sync 2026-08-06)

| Area | On production (`208f5a3`) | In local working tree |
|------|---------------------------|------------------------|
| Live 1v1 tournament | ✅ | ✅ |
| Gamenet Phase 0 + partial 1/2 | ✅ | ✅ |
| 2v2 teams + bracket-team | ❌ | 🔄 ported from `gameland-work`, not deployed |
| Gamenet Phase 0.5+ | ❌ | ❌ |

---

## Sprint 0 — Foundation ✅ (do first, every session)

| # | Task | Done when |
|---|------|-----------|
| 0.1 | `git fetch && git pull origin mvp` | Not behind remote |
| 0.2 | Port any work from `~/gameland-work` if uncommitted there | Trees aligned |
| 0.3 | `npm run build` in `web/` | Zero errors |
| 0.4 | `git push origin mvp` after every deploy | Remote matches deploy |

**Deploy rule:** `liara deploy --no-app-logs` · never deploy stale checkout.

---

## Sprint 1 — 2v2 complete (docs/27)

**Goal:** Pilot-ready 2v2 on a **separate رویداد**, zero regression on live 1v1.

| # | Phase | Task | Risk | Status |
|---|-------|------|------|--------|
| 1.1 | Port | Copy 2v2 work from `gameland-work` → `~/gameland` | Low | 🔄 |
| 1.2 | 1 | `ticketPriceFor()` + per-event price (already ported) | Low | ✅ |
| 1.3 | 2–4 | teamSize, teams tables, bracket-team, draw/match dispatch | Med | ✅ ported |
| 1.4 | **5** | **Team-aware finalize** — validate per team, fan out placements | **High** | ⬜ |
| 1.5 | 5 | Finalize UI: admin ranks **teams**, not individuals | Med | ⬜ |
| 1.6 | — | Founder defaults: captain city, full points both members | Med | ⬜ defaults |
| 1.7 | 10 | Gate tests: `bracket.ts` diff export-only, restart test | Med | ⬜ |
| 1.8 | — | **Deploy + pilot** on new رویداد only (not Gameland The Best) | Med | ⬜ |

**Founder decisions (can use defaults for pilot):**

- Q1 City → captain's city (default)
- Q2 Points → full to both members (default; revisit after pilot)
- Q8 Pilot → separate رویداد (required)

---

## Sprint 2 — Gamenet Phase 0.5 + 1 (docs/26)

**Goal:** Prelim venue labels for live tournament + gamenet lifecycle.

| # | Phase | Task | Depends | Risk |
|---|-------|------|---------|------|
| 2.1 | 0.5 | `EventConfig.prelimVenues` — name/address/dates per city/province | — | **Low** |
| 2.2 | 0.5 | Admin UI in `tournament-panel.tsx` (above draw) | 2.1 | Low |
| 2.3 | 0.5 | Public: show viewer's venue on `/competitions/[id]` pre-draw | 2.1 | Low |
| 2.4 | 0.5 | BracketView: venue under scope headers post-draw | 2.1 | Low |
| 2.5 | 1 | `status: pending\|verified\|rejected` + `rejectReason` on gamenets | — | Med |
| 2.6 | 1 | Admin hub: edit/delete gamenet, review sheet for submissions | 2.5 | Med |
| 2.7 | 1 | Owner can edit profile (photos/hours re-enter review if needed) | 2.5 | Med |
| 2.8 | 1.5 | Link prelim venue → `gamenetId` picker (`gamenetsByCity`) | 2.1, 2.5 | Low |

**Ship 2.1–2.4 first** — unblocks «Gameland The Best» venue announcement without touching bracket engine.

---

## Sprint 3 — Gamenet Phase 2 polish

| # | Task | Notes |
|---|------|-------|
| 3.1 | Multi-photo (up to 6) + cover derivative | ids-only hydration |
| 3.2 | map_url, open_hours, capacity, setup JSON | profile v2 |
| 3.3 | Remove flat `disciplines` CSV reads | use `app_gamenet_games` |

---

## Sprint 4 — Gamenet Phase 3 (competitions)

| # | Task | Notes |
|---|------|-------|
| 4.1 | Tables: `app_gamenet_events`, `_entries`, `_results` | self-heal in persistence |
| 4.2 | Owner: create event, roster (name+phone), report top-N + proof | no bracket |
| 4.3 | Admin: verify/reject gamenet events | review sheet pattern |
| 4.4 | **Observe real behavior** before quota/points | founder calibration |

---

## Sprint 5 — Gamenet Phase 3.5 + 4 (ranking + quota)

| # | Phase | Task | Blocker |
|---|-------|------|---------|
| 5.1 | 3.5 | `gamenetPointsOf()` + consolidate `nationalPointsOf()` | Founder curve numbers |
| 5.2 | 4 | `EventConfig.gamenetQuota` + `app_gamenet_seeds` | Phase 4.1 |
| 5.3 | 4 | Grant path → free approved registration | Phase 5.2 |
| 5.4 | 4.5 | Purchased seat top-ups | Founder pricing |
| 5.5 | 5 | Final-stage gamenet grants (`computeQualifiers` tail) | Phase 4 pilot done |

---

## Sprint 6 — Later (demand-driven)

- `bracket-core.ts` extraction (after 2v2 pilot)
- Gamenet in-app brackets (Phase 6)
- Data ingest ~2k gamers
- Online payment gateway

---

## Deploy checklist (every sprint end)

```bash
git fetch origin
git status                    # clean, not behind
cd web && npm run build
git push origin mvp
cd web && liara deploy --no-app-logs
# verify live 1v1 bracket unchanged
```

---

## Active sprint pointer

**Sprint 1** — 2v2 ported + team finalize fixed + build ✅  
**Next → Sprint 2.1** (prelim venue labels) · then deploy 2v2 pilot on separate رویداد

| Sprint 1 item | Status |
|---------------|--------|
| 1.1 Port 2v2 from gameland-work | ✅ |
| 1.2 ticketPriceFor | ✅ |
| 1.3 bracket-team + teams | ✅ |
| 1.4 Team finalize API | ✅ |
| 1.5 Finalize UI (per-team) | ✅ |
| 1.7 Gate tests | ⬜ before deploy |
| 1.8 Deploy + pilot | ⬜ |
