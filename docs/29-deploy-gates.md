# 29 — Deploy Gates

**Updated:** 2026-08-13 · Run before every production deploy.

---

## Universal (every deploy)

```bash
git fetch origin && git status    # clean, not behind origin/mvp
cd web && npm run build           # zero errors
git push origin mvp
cd web && liara deploy --no-app-logs
```

**Smoke after deploy:**
- Home loads (~45 KB, fonts OK)
- Live 1v1 event page + bracket unchanged
- Admin login works

---

## Promoter / affiliate (Sprint 2.5)

1. Admin → `/admin/promoters` → create code (e.g. 20% off, 10% commission)
2. Register with `?code=XXX` → pay page shows **same** discounted total
3. Admin requests → expected amount **matches** pay page
4. Approve → earning row `pending` with correct commission
5. Mark paid in admin
6. `/me` shows code + stats for promoter user
7. Top-up (existing reg) → **no** promo discount
8. Self-use code → blocked
9. Referral `@tag` + promo code → both work independently

---

## 2v2 pilot (Sprint 1)

**Do not** enable on flagship رویداد until all pass:

1. Gate tests per [`27-team-format-plan.md`](27-team-format-plan.md) §10
2. Create **separate** رویداد with `teamSize=2`
3. Admin seed test teams → draw → match → finalize dry run
4. Solo 1v1 رویداد regression spot-check

---

## Arena go-live

1. Set **both** `ARENA_ENABLED=true` and `NEXT_PUBLIC_ARENA_ENABLED=true` on Liara
2. Bottom nav shows «میدون»
3. Assistant rank includes arena points when flag on
4. `/arena` APIs return 200 (not 404)

---

## Gamenet Phase 3+

1. New tables only via `persistence.ts` self-heal
2. **Zero** changes to `bracket.ts` until Phase 5 explicitly approved
3. Observe real gamenet event behavior before quota/points
