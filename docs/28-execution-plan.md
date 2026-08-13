# 28 — Execution Plan: Gamenet + 2v2 (mvp branch)

**Updated:** 2026-08-13 · **Branch:** `mvp` · **Live:** gamelandteam.ir  
**Refs:** [`26-gamenet-platform-plan.md`](26-gamenet-platform-plan.md) · [`27-team-format-plan.md`](27-team-format-plan.md) · [`29-deploy-gates.md`](29-deploy-gates.md) · [`CLAUDE.md`](../CLAUDE.md)

> Ordered sprints. Each sprint ships independently. **Never skip sync/gates before deploy.**

---

## Current baseline (after sync 2026-08-13)

| Area | Production | Notes |
|------|------------|-------|
| Live 1v1 tournament | ✅ | Core path stable |
| Gamenet Phase 0–2 + 0.5 + 1.5 | ✅ | Directory, lifecycle, prelim venues, profile v2 |
| Analytics / behavior studio | ✅ | Recent commits |
| 2v2 teams + bracket-team | ✅ code deployed | **No pilot رویداد yet** · gate tests ⬜ |
| Play Arena (میدون) | ✅ code, flag off | `ARENA_ENABLED` off prod |
| Promoter / affiliate | 🔄 **live** | Platform shipped — PRD [`31-promoter-platform-prd.md`](31-promoter-platform-prd.md) |
| Gamenet Phase 3–6 | ❌ | Doc-only |

---

## Sprint 0 — Foundation ✅ (do first, every session)

| # | Task | Done when |
|---|------|-----------|
| 0.1 | `git fetch && git pull origin mvp` | Not behind remote |
| 0.2 | Port any work from `~/gameland-work` if uncommitted there | Trees aligned — **prefer `~/gameland` only** |
| 0.3 | `npm run build` in `web/` | Zero errors |
| 0.4 | `git push origin mvp` after every deploy | Remote matches deploy |

**Deploy rule:** `liara deploy --no-app-logs` · never deploy stale checkout.

---

## Sprint 1 — 2v2 complete (docs/27)

**Goal:** Pilot-ready 2v2 on a **separate رویداد**, zero regression on live 1v1.

| # | Phase | Task | Risk | Status |
|---|-------|------|------|--------|
| 1.1 | Port | Copy 2v2 work from `gameland-work` → `~/gameland` | Low | ✅ |
| 1.2 | 1 | `ticketPriceFor()` + per-event price | Low | ✅ |
| 1.3 | 2–4 | teamSize, teams, bracket-team, draw/match dispatch | Med | ✅ |
| 1.4 | 5 | Team-aware finalize API | High | ✅ |
| 1.5 | 5 | Finalize UI: admin ranks **teams** | Med | ✅ |
| 1.6 | — | Founder defaults (captain city, full points) | Med | ✅ |
| 1.7 | 10 | Gate tests: bracket.ts export-only, restart test | Med | ⬜ |
| 1.8 | — | **Deploy + pilot** on new رویداد only | Med | ⬜ |

---

## Sprint 2 — Gamenet Phase 0.5 + 1 ✅ (shipped)

Prelim venues + gamenet lifecycle + admin CRUD + venue↔gamenet link. See [`26-gamenet-platform-plan.md`](26-gamenet-platform-plan.md).

| # | Task | Status |
|---|------|--------|
| 2.1–2.4 | Prelim venue labels (admin + public + bracket) | ✅ |
| 2.5–2.7 | Gamenet status lifecycle + admin review | ✅ |
| 2.8 | Link prelim venue → gamenetId | ✅ |

---

## Sprint 3 — Gamenet Phase 2 polish (partial)

| # | Task | Status |
|---|------|--------|
| 3.1 | Multi-photo (up to 6) | ✅ |
| 3.2 | map_url, open_hours, features | ✅ |
| 3.3 | capacity, cover derivative, junction table | ⬜ |

---

## Sprint 4–6 — Gamenet Phase 3+ (not started)

See original plan in git history. Phase 3 competitions blocks quota + points.

---

## Sprint 7 — Promoter platform (2026-08-13)

**PRD:** [`31-promoter-platform-prd.md`](31-promoter-platform-prd.md)  
**Goal:** Admin **activates** partners by phone → promoter **self-serve dashboard** (code + stats + commission).

| # | Task | Status |
|---|------|--------|
| 7.0 | PRD — [`31-promoter-platform-prd.md`](31-promoter-platform-prd.md) | ✅ |
| 7.1 | Checkout plumbing + admin ticket breakdown | ✅ |
| 7.2 | Admin activate-by-phone + one code | ✅ |
| 7.3 | `/me/promoter` dashboard | ✅ |
| 7.4 | Deploy gates — [`29-deploy-gates.md`](29-deploy-gates.md) § Promoter | ⬜ smoke on prod |

---

## Active sprint pointer

**Next → Sprint 7 PRD sign-off (§10 open questions) → Slice 1**  
**Do not deploy** current admin-code-factory to prod without dashboard reshape.

---

## Deploy checklist (every sprint end)

```bash
git fetch origin
git status                    # clean, not behind
cd web && npm run build
git push origin mvp
cd web && liara deploy --no-app-logs
# smoke: live 1v1 event page + bracket unchanged
```
