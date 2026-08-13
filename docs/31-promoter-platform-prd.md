# 31 — Promoter Platform PRD

**Status:** Draft · **Date:** 2026-08-13  
**Replaces / supersedes:** Sprint 7 vibe-build (admin-only code factory)  
**Module:** `web/lib/promoter.ts` · **Refs:** [`29-deploy-gates.md`](29-deploy-gates.md) · referral `@tag` (separate)

---

## 1. Executive Summary

We're building a **promoter platform** for Gameland: admins **activate** trusted partners (streamers, gamers, gamenet owners) by phone; activated promoters get a **dedicated dashboard** to share discount codes, see who came through them, and track commission — without admin creating every code by hand. This replaces the current admin-centric affiliate stub with a sustainable self-serve loop, while keeping pricing authority and payouts under admin control.

**Impact:** faster partner onboarding, visible ROI for promoters, fewer admin ops per campaign, clean separation from the consumer `@tag` referral program.

---

## 2. Problem Statement

### Who has this problem?

| Actor | Pain |
|---|---|
| **Founder / admin** | Every influencer deal = manual code creation, manual % negotiation per code, no single view of partner performance |
| **Promoter (partner)** | No visibility: "چند نفر اومدن؟ چقدر سهم منه؟" — must ask admin on Telegram |
| **Buyer** | (Secondary) Needs trustworthy discount at checkout — already solved in v0 |

### What is the problem?

Today affiliate is **admin-operated**: admin picks user → sets discount + commission → creates code. Promoter only sees a small card on `/me` **if** admin already made a code. There is no promoter **status**, no dashboard, no self-serve code generation, no funnel stats (conversion %).

### Why is it painful?

- **Doesn't scale:** 10 partners × 3 events = 30 admin actions per campaign wave
- **Promoter distrust:** partners can't monitor performance → churn from program
- **Wrong mental model:** we built "admin coupon manager" not "partner platform"
- **Deploy risk:** v0 is wired but not production-ready; better to reshape before ship

### Evidence (internal)

- PM workflow: promoters found via **user list / phone**, not city search
- Requested UX: summary card — **چند نفر · درصد · کمیسیون**
- Explicit: **simple** — no city-based promoter discovery
- Live app already has referral `@tag` — must not conflate

---

## 3. Target Users & Personas

### Primary: Partner Promoter «علی — استریمر»

- **Job:** bring audience to Gameland registrations, earn commission
- **Needs:** one place to copy link/code, see count + %, trust the numbers match admin payout
- **Behavior:** shares Instagram/Telegram link; checks stats 2–3×/week
- **Not:** power affiliate marketer; wants 3 taps max

### Secondary: Admin «مدیر گیم‌لند»

- **Job:** enable/disable partners, set commercial terms, approve regs, pay out
- **Needs:** find user by **phone** fast, toggle promoter on/off, audit totals, mark paid
- **Not:** create every code manually

### Out of persona scope (v1)

- City-based partner programs
- Gamenet owners as a separate role (treat as `gamer` + promoter flag)
- Automated payout (bank/API)

---

## 4. Strategic Context

### Business goals

- Increase paid registrations via trusted channels (lower CAC than ads)
- Reduce admin time per partner campaign
- Build reusable partner loop before scaling streamer deals

### Why now?

- Sprint 7 code exists (checkout, pricing fn, earnings) — **reuse plumbing**
- Not yet deployed to prod — cheapest moment to fix product shape
- Referral `@tag` program stays; this is **B2B-style affiliate**, not consumer referral

### Relationship to referral `@tag`

| | Referral `@tag` | Promoter platform |
|---|---|---|
| Who owns code | Every user's tag | Admin-activated partners only |
| Where entered | Ticket purchase | Register (first time) |
| Reward | Free tickets (3→1, 6→3) | % commission on paid tickets |
| Self-serve | Yes (everyone) | Yes (promoters only, after activation) |
| Dashboard | `/invite` | **`/me/promoter`** (new) |

**Rule:** never merge inputs, never merge ledgers.

---

## 5. Solution Overview

### Core concept: «فعال‌سازی» not «ساخت کد توسط ادمین»

```
Admin                          Promoter                    Buyer
  │                               │                          │
  │  phone search → Activate      │                          │
  │  set discount% + commission%  │                          │
  ├──────────────────────────────►│                          │
  │                               │  /me/promoter opens      │
  │                               │  generate/share code       │
  │                               ├─────────────────────────►│
  │                               │                          │ register + pay
  │  approve reg ─────────────────┼── earning created        │
  │  mark paid ──────────────────►│  dashboard updates       │
```

### Two panels

#### A) Admin — `/admin/promoters` (reframe)

**Tab 1: Partners (فعال‌سازی)**  
- Search by **phone** (primary), `@tag`, user id — min 3 digits / 2 chars  
- List active promoters: name, phone, discount%, commission%, status toggle  
- Action: **Activate promoter** → set default discount% + commission% for this user  
- Action: **Deactivate** → existing codes stop validating; dashboard hidden  

**Tab 2: Payouts (unchanged concept)**  
- Pending earnings across all promoters  
- Mark paid + note  

**Removed from admin v1:** creating individual codes for promoters (promoter self-serve)

#### B) Promoter — `/me/promoter` (new dedicated dashboard)

Gated: `user.promoterActive === true` (404 or redirect if not)

**Summary card (top)**  
| Metric | Definition |
|---|---|
| **کل استفاده** | Registrations that attached this promoter's code (any status) |
| **تأییدشده** | Registrations **approved** with this promoter's code |
| **نرخ تبدیل** | `تأییدشده ÷ کل استفاده` (%) — simple, no click tracking |
| **کمیسیون معوق** | Sum pending earnings (تومان) |
| **کمیسیون پرداخت‌شده** | Sum paid earnings (lifetime) |

**Code section**  
- Primary CTA: **ساخت / کپی کد**  
- Promoter picks: code string (or auto from tag), optional event scope  
- Discount% / commission% **read-only** (set by admin at activation)  
- Copy link: `?code=` on register URL  

**Activity list (simple)**  
- Rows: buyer **@tag** · event title · status chip (pending / approved / rejected) · date  
- **No phone** in promoter view (privacy)  
- Newest first, cap 50 visible + "همه در ماه جاری"

**Navigation**  
- Entry: tile on `/me` — «پنل پروموتر» — only if active  
- Optional: bottom-nav badge later (out of v1)

---

## 6. Success Metrics

### Primary

**Approved registrations via promoter codes / month**  
- Baseline: 0 (not live)  
- Target (90 days post-launch): ≥15% of new paid regs from activated promoters (adjust after first 2 partners)

### Secondary

| Metric | Target |
|---|---|
| Admin time to onboard partner | < 2 min (activate + set %) |
| Promoter dashboard WAU | ≥1 visit/week per active partner |
| Code validation → approve conversion | Track per partner; no global target v1 |
| Payout dispute rate | 0 (amounts must match admin queue) |

### Guardrails

- `regPayableAmount(reg)` remains **single pricing source**
- No regression on referral `@tag` flow
- Self-use blocked
- Top-up excluded from promo discount

---

## 7. User Stories & Requirements

### Epic hypothesis

> We believe giving **activated promoters** a self-serve dashboard (code + stats) will increase partner-driven registrations and cut admin ops because partners can monitor performance without manual code creation per campaign.

---

### Slice 1 — Promoter identity (foundation)

**US-1 Admin activates promoter by phone**  
As admin, I search by phone and activate a user as promoter with discount% and commission%.

- [ ] Search: phone (≥3 digits), `@tag`, user id — API debounced  
- [ ] Activate sets `promoterActive`, `promoterDiscountPercent`, `promoterCommissionPercent` on user (or side table)  
- [ ] Deactivate invalidates new code use; existing approved earnings preserved  
- [ ] Only `gamer` role eligible  

**US-2 Promoter gate**  
As a non-promoter, I cannot access `/me/promoter`.

- [ ] 404 or redirect to `/me`  
- [ ] `/me` shows «پنل پروموتر» link only when active  

---

### Slice 2 — Promoter dashboard (read)

**US-3 Summary card**  
As promoter, I see total uses, approved count, conversion %, pending/paid commission.

- [ ] Stats derived from `app_registrations.promoter_code_id` + earnings tables  
- [ ] Conversion = approved / total attached (exclude rejected from numerator; include in denominator optional — **decision: denominator = all non-rejected uses**)  

**US-4 Activity list**  
As promoter, I see who registered with my code.

- [ ] Show @tag, event, status, date — **no phone**  
- [ ] Newest first  

---

### Slice 3 — Promoter code generation (write)

**US-5 Promoter code (یک کد ثابت)**  
As active promoter, I have **one code** tied to my account — auto-created on activation from my `@tag`.

- [ ] **یک کد فقط** — regenerate/rename توسط ادمین، نه چند کد همزمان  
- [ ] Code inherits discount% + commission% from promoter profile (not editable by promoter)  
- [ ] Self-use blocked at validation  
- [ ] Admin can deactivate code when deactivating promoter  

**US-6 Share link**  
As promoter, I copy link with `?code=` prefilled.

- [ ] Same as current `promoter-card` behavior  
- [ ] `localStorage gl_code` capture unchanged  

---

### Slice 4 — Checkout & admin (mostly done — migrate)

**US-7 Buyer checkout** — ✅ exists  
- Register / pay / admin requests use `regPayableAmount`  
- Promo first registration only  

**US-8 Earning on approve** — ✅ exists  
- `recordPromoterEarning` on approve  

**US-9 Admin payout** — ✅ exists  
- Mark paid in admin payouts tab  

**US-10 Admin review — ticket taxonomy** — ✅ partial (2026-08-13)  
As admin reviewing a pending registration, I see **each seat (سهم) typed and colored** so I know what revenue to expect on the receipt.

Four seat types (per registration row):

| Type | Color | Revenue? | Commission? | How detected |
|---|---|---|---|---|
| **عادی** `full` | accent | ✅ full price | — | no promo, not free |
| **تخفیف** `promo` | gold | ✅ discounted | ✅ on approve | `promoter_code_id` + `discount_percent` snapshot |
| **رایگان** `free` | green | ❌ | ❌ | `free_attempts` (referral reward today; admin grant later) |
| **تأییدشده** `settled` | muted | already paid | — | `paid_attempts` from prior approval |

- [x] List card: gold border + promo badge when discounted  
- [x] Review sheet: promoter name + discount% banner  
- [x] Per-seat chips `#1 #2 #3…` with type label + price  
- [x] Expected amount = sum of **promo + full** unpaid seats only  
- [ ] Admin manual free grant (separate from referral) — future `admin_free_attempts` if needed  

**Accounting rule:** free seats never enter `revenueTotal` or promoter `recordPromoterEarning`. Commission base = paid promo seats only (existing logic in `recordPromoterEarning`).

---

### Data model changes (proposed)

```sql
-- Option A: columns on app_users (simplest for single-instance store)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS promoter_active BOOLEAN DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS promoter_discount_percent INT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS promoter_commission_percent INT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS promoter_activated_at TIMESTAMPTZ;

-- app_promoter_codes: add created_by ('admin' | 'promoter') for audit
-- Keep existing tables; deprecate admin-only code creation path
```

**Code creation authority shift:**

| Field | Who sets (v1) |
|---|---|
| `promoterActive` | Admin |
| `discountPercent` / `commissionPercent` on user | Admin at activation |
| Code string + event scope | Promoter |
| Per-code override of % | **Out of scope v1** |

---

## 8. Out of Scope (v1)

| Item | Why |
|---|---|
| City / region-based promoter programs | PM: keep simple; phone/id enough |
| Promoter edits own discount% | Admin retains pricing authority |
| Click / impression tracking | No infra; conversion = reg-based only |
| Automated bank payout | Manual mark-paid continues |
| Multiple commission tiers per promoter | One rate per user v1 |
| Promoter creates sub-codes for team | Complexity |
| Public promoter leaderboard | Privacy + gaming |
| Staging environment | Use in-memory dev (see deploy gates) |

---

## 9. Dependencies & Risks

### Dependencies

- Existing: `lib/promoter.ts`, reg columns, approve hook, validate API  
- New: user promoter flag, `/me/promoter` route, promoter code-create API  
- Admin UI reframe (activate vs code factory)

### Risks

| Risk | Mitigation |
|---|---|
| Promoter disputes conversion % | Document formula in dashboard tooltip; same data as admin |
| Code spam (100 codes) | Cap 3 active codes / promoter |
| v0 admin flow confusion | Don't deploy v0; migrate in one release |
| Privacy leak (phone in list) | Promoter sees @tag only |
| `%` feels wrong if pending dominates | Show approved vs pending separately |

---

## 10. Open Questions — **Decided (2026-08-13)**

| # | Question | Decision |
|---|---|---|
| 1 | Conversion denominator | `approved / (pending + approved)` — rejected excluded |
| 2 | Codes per promoter | **یک کد ثابت** (from `@tag` on activation) |
| 3 | Deactivate promoter | Soft-disable; earnings preserved ✅ |
| 4 | Pending in activity list | Yes — status chip «در انتظار تأیید» ✅ |
| 5 | Ship order | Dashboard read-only → code → deploy ✅ |
| 6 | Ticket type visibility | Four types in admin review; free ≠ revenue ✅ |
| 7 | Admin free seats vs referral | Same `free_attempts` field v1; label shows «جایزهٔ دعوت» when `referredBy` set; admin-grant label when no referrer (future) |

---

## 11. Migration from Sprint 7 (current code)

### Keep ✅

- `regPayableAmount`, `validatePromoCode`, `attachPromoToRegistration`  
- `recordPromoterEarning`, `markEarningPaid`  
- Register / pay / admin requests integration  
- `?code=` + `gl_code` capture  
- Admin payouts tab  

### Refactor 🔄

| Current | Target |
|---|---|
| Admin creates codes + sets % per code | Admin activates user + sets % once |
| `promoter-card` on `/me` | Link → `/me/promoter` dashboard |
| Admin form: code + discount + commission | Admin form: phone search + activate + % |
| `createPromoterCode` admin-only | `createPromoterCode` promoter API (inherits user %) |

### Remove ❌

- Admin UI fields for manual code string (move to promoter)  
- City in promoter search (already removed from API)  

---

## 12. Release plan

| Slice | Deliverable | Est. |
|---|---|---|
| **1** | `promoterActive` flag + admin activate/deactivate by phone | 0.5d |
| **2** | `/me/promoter` dashboard read-only (stats + activity) | 1d |
| **3** | Promoter code generation API + UI | 0.5d |
| **4** | Admin UI reframe + remove old code factory | 0.5d |
| **5** | Gate tests + deploy per [`29-deploy-gates.md`](29-deploy-gates.md) | 0.5d |

**Total:** ~3 dev days after founder signs open questions.

---

## 13. Wireframe (mobile)

```
/me/promoter
┌─────────────────────────────┐
│  پنل پروموتر                 │
├─────────────────────────────┤
│  ┌─ summary ─────────────┐  │
│  │  ۱۲ استفاده · ۸ تأیید  │  │
│  │  نرخ تبدیل ۶۷٪         │  │
│  │  ۱۲۰,۰۰۰ ت معوق        │  │
│  └────────────────────────┘  │
│  PROMO20          [کپی لینک]│
│  ٪۲۰ تخفیف · ٪۱۰ کمیسیون    │
│  (یک کد ثابت — بدون ساخت جدید)│
├─────────────────────────────┤
│  ثبت‌نام‌ها                  │
│  @buyer1 · کاپ PES · ✅      │
│  @buyer2 · FC26 · ⏳         │
└─────────────────────────────┘

/admin/promoters
┌─────────────────────────────┐
│  [ شرکا ]  [ پرداخت‌ها ]     │
│  🔍 0912…                   │
│  ┌ علی @tag · 0912… ─────┐  │
│  │ تخفیف ۲۰٪ · کمیسیون ۱۰٪│  │
│  │ [فعال ✓]  [غیرفعال]    │  │
│  └────────────────────────┘  │
└─────────────────────────────┘
```

---

## 14. Acceptance checklist (pre-deploy)

1. Admin activates user by phone → `/me/promoter` visible within same session  
2. Promoter creates code → buyer validates → amounts match admin queue  
3. Dashboard stats match SQL on `app_registrations` + earnings  
4. Deactivated promoter: codes invalid, dashboard 404  
5. Referral `@tag` unchanged  
6. Top-up / self-use blocked  

---

**Next step:** Founder answers §10 open questions → then implement Slice 1.
