# 32 — Promoter UX Redesign PRD

**Status:** Approved for build · **Date:** 2026-08-15  
**Supersedes UX sections of:** [`31-promoter-platform-prd.md`](31-promoter-platform-prd.md)  
**Module:** `web/lib/promoter.ts` · `/admin/promoters` · `/me/promoter`

---

## 1. Needs assessment

### 1.1 Admin — current pain

| # | Observation | Impact |
|---|---|---|
| A1 | **فعال‌سازی ≠ ساخت کد** — admin activates partner but no code exists until a second action | Promoter lands on empty dashboard; admin thinks job is done |
| A2 | **Three code-creation paths** — activate form, inline «+ کد», requests tab | Admin doesn't know which to use |
| A3 | **Partner card is a junk drawer** — terms, codes, create form, deactivate all at same level | Hard to scan; actions feel accidental |
| A4 | **Request review uses `window.prompt`** | Unprofessional; no context; mobile-unfriendly |
| A5 | **No deactivate/restore per code** — only partner-level deactivate | Can't pause one bad code without killing partner |
| A6 | **Inactive codes hidden** from admin list | Can't restore; looks like data loss |

### 1.2 Promoter — current pain

| # | Observation | Impact |
|---|---|---|
| P1 | **Empty state after activation** | «هنوز کد فعالی نداری» — distrust |
| P2 | **Request flow buried** behind expand + counter `(n/5)` | Partners don't discover self-serve path |
| P3 | **Multiple codes without hierarchy** | Unclear which link to share |
| P4 | **No visibility of deactivated codes** | Confusion when admin pauses a code |
| P5 | **Rejected request** — small red box, easy to miss | Partner doesn't know what to fix |

### 1.3 Buyer / checkout (unchanged — keep)

- `regPayableAmount` single source ✅  
- Promo at first registration only ✅  
- Separate from `@tag` referral ✅  

---

## 2. Product principles (this redesign)

1. **One lifecycle, labeled steps:** فعال‌سازی → کد → استفاده → کمیسیون → پرداخت  
2. **Every action has one home** — no duplicate create-code entry points  
3. **Soft delete only** — codes deactivate; history + earnings preserved  
4. **Sheets over prompts** — inline forms, no `window.prompt` / `confirm` for core flows  
5. **Mobile-first admin** — same patterns as registration review sheet  

---

## 3. Scope

### In scope (V1 — this ship)

| ID | Feature |
|---|---|
| S1 | **Auto first code** on admin activation (from `@tag`, fallback algorithm exists) |
| S2 | Admin **partner detail** — expandable card: terms · codes · create · deactivate partner |
| S3 | Admin **code actions:** غیرفعال / فعال‌سازی مجدد (per code) |
| S4 | Admin **request inbox** — inline approve (optional code override) + inline reject reason |
| S5 | Admin **edit terms** (% discount / commission) on existing partner |
| S6 | Promoter **state machine UI** — no code / pending / active / rejected |
| S7 | Promoter sees **inactive codes** (read-only, grey) |
| S8 | Remove duplicate «+ کد» micro-button; one «ساخت کد» form in partner detail |

### Out of scope (V1)

| Item | Why |
|---|---|
| Hard delete codes | Breaks earnings FK / audit |
| Promoter self-deactivate code | Admin retains control |
| Per-event code scope picker UI | Rare; API supports `compId` — admin note only |
| Automated payout | Manual mark-paid continues |
| Email/SMS on approve-reject | Telegram/manual for now |
| Change MAX_CODES (stay 5) | Sufficient for pilot |

---

## 4. User journeys (target)

### 4.1 Admin — onboard partner

```
Admin → /admin/promoters → تب شرکا
  → جستجوی شماره → انتخاب کاربر
  → تخفیف ٪ + کمیسیون ٪ → «فعال‌سازی و ساخت کد اول»
  → کارت partner باز می‌شود: کد @tag فعال + آمار
```

### 4.2 Admin — approve code request

```
Admin → تب درخواست‌ها (badge count)
  → کارت درخواست: نام · تگ · کد پیشنهادی · یادداشت
  → [اختیاری: ویرایش کد] → «تأیید» | «رد» (+ دلیل inline)
  → درخواست از صف حذف · partner + promoter notified via dashboard state
```

### 4.3 Admin — pause / restore code

```
Admin → partner card → بخش کدها
  → کد ACTIVE → «غیرفعال» (confirm inline)
  → کد INACTIVE → «فعال‌سازی مجدد» (if under active cap)
```

### 4.4 Promoter — daily use

```
/me → پنل پروموتر
  → Summary: uses · conversion · commission
  → Primary code card: COPY code · COPY link
  → Activity list (per code)
  → [optional] درخواست کد جدید — if <5 active & no pending request
```

---

## 5. Information architecture

### Admin `/admin/promoters`

| Tab | Contents |
|---|---|
| **شرکا** | Activate form (top) · Partner list · Expand = detail sheet |
| **درخواست‌ها** | Pending queue only · Count badge |
| **پرداخت‌ها** | Pending earnings · Mark paid |

**Partner detail (expanded):**

| Block | Actions |
|---|---|
| Header | name · phone · @tag |
| شرایط | discount% · commission% · [ذخیره] |
| کدهای فعال | list + stats + غیرفعال |
| کدهای غیرفعال | list + فعال‌سازی مجدد |
| ساخت کد | code (opt) · note (opt) · [ساخت] |
| Danger | [غیرفعال کردن پروموتر] |

### Promoter `/me/promoter`

| State | UI |
|---|---|
| `pendingRequest` | Yellow banner — waiting |
| `codes.length === 0` | Empty + explain contact admin OR wait |
| `codes.length > 0` | Primary code hero + accordion for rest |
| `canRequestNew` | Bottom CTA → inline form |
| `lastRejected` | Red banner + reason + retry CTA |

---

## 6. API changes

| Action | Body | Notes |
|---|---|---|
| `activate` | + auto `adminIssueCode` after activate | S1 |
| `deactivateCode` | `{ codeId }` | sets `active: false` |
| `reactivateCode` | `{ codeId }` | sets `active: true`; respects cap |
| `update` | existing | terms on user |
| GET | include `inactiveCodes` per partner | `active: false` rows |

---

## 7. Success criteria

- Admin onboard partner **≤ 3 taps** after search (activate includes code)
- Zero `window.prompt` / `confirm` on promoter admin core paths
- Promoter with fresh activation **always sees a code** without extra step
- Request approve/reject **without leaving tab**

---

## 8. Test plan (smoke)

1. Activate user → code appears for admin + promoter dashboard  
2. Deactivate code → buyer validation fails · admin can restore  
3. Promoter request → admin approve with override → code live  
4. Promoter request → reject with reason → promoter sees banner  
5. Deactivate partner → all codes inactive · dashboard 404  
6. Payout mark-paid unchanged  

See also [`29-deploy-gates.md`](29-deploy-gates.md) promoter section.
