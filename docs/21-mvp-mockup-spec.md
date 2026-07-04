# 21 — MVP Mockup Spec (for Claude Design)

**Stage:** Design · **Status:** 📐 build-ready brief · **Use with:** Claude Design
**Refs:** [`18`](18-admin-panel-prd.md) admin PRD · [`19`](19-event-model-spec.md) event model · [`20`](20-default-rules.md) rules

> A complete screen-by-screen brief so Claude Design can produce the MVP mockup with **every screen, box, dropdown, and state** correct. Quality bar = the Joulio energy-app mockup (clean, dark, polished, mobile-first, Persian/RTL). Gameland keeps its own identity below.

---

## 0. How to use this doc

Build the mockup **screen by screen** in the order of §4 (user) then §5 (admin). Every screen lists its **sections, inputs/dropdowns, and states** (empty / loading / filled / error). Reusable pieces are in §3 — build them once, reuse everywhere. Don't invent screens not listed; don't omit listed states.

---

## 1. Design foundation

- **Platform:** mobile-first (≤430px), RTL, Persian. Bottom-nav app shell.
- **Theme:** dark. Polish level = Joulio (soft cards, generous radius, calm contrast).
- **Font:** Vazirmatn (fa) + system fallback. Numbers/tags LTR in `Rajdhani`/mono.
- **Palette (Gameland identity — keep):**
  - bg `#0b0f14` · surface `#121821` · surface-2 `#151d27` · border `#1e293b`
  - brand/primary `#22d3ee` (cyan) · gold `#f5c84b` (prizes/champion)
  - text `#f1f5f9` / `#94a3b8` / muted `#64748b`
  - semantic: green `#34d399` (open/win) · red `#fb7185` (live/eliminate) · violet `#a78bfa` (final/done)
  - discipline colors: FC26 `#38bdf8` · PES21 `#34d399` · eFootball `#22d3ee` · UFC6 `#fb7185` · NBA2K26 `#f5c84b`
- **Radius:** cards 13–16px, chips/inputs 9–12px, avatars 10–16px.
- **Tone:** competitive but trustworthy; Persian copy, no filler.

*(If the founder prefers Joulio's teal `#00C4A7` over Gameland cyan — swap `--brand`; everything else holds.)*

---

## 2. App shell

- **Bottom nav (user):** خانه · مسابقات · رنکینگ · گیمرها · من — active = brand, inactive = muted. Unread badge on «من».
- **Sticky top header** on sub-pages: back chevron (right, RTL) + title.
- **Admin** uses a top tab bar instead of bottom nav: داشبورد · مسابقات · گیمرها · اعلان · رشته‌ها.

---

## 3. Component library (build once, reuse)

1. **Card** — surface bg, 1px border, radius 14, padding 12–16.
2. **Status chip** — dot + label, colored by status (open=green, live=red, soon=gold, done=violet).
3. **Discipline badge** — square avatar, discipline color bg tint + short code (FC26/PES/EF/UFC/2K).
4. **Primary button** — brand bg, dark text (`#0b0f14`), radius 12, bold. **Secondary** — surface bg + colored border.
5. **Text input** — surface-2 bg, border, radius 11. Label above in muted.
6. **Dropdown (select)** — same style as input; chevron; disabled state greyed.
7. **Cascade dropdown** — province → city (city disabled until province chosen; repopulates on change). Data: 31 provinces.
8. **Multi-select chips** — disciplines: tap to toggle, selected = discipline-color tint + border.
9. **Ticket picker (1–6)** — segmented 1..6 buttons; selected highlighted; helper text «هر بلیط یک شانس مستقل».
10. **Promoter countdown card** — event title + disc badge; **capacity bar** (ثبت‌نام‌شده/ظرفیت) + **empty-slots** number; **countdown timer** to start (روز/ساعت/دقیقه); CTA «ثبت‌نام».
11. **Empty state** — centered icon + one line + optional CTA (e.g. «هنوز مسابقه‌ای نیست»).
12. **Bracket** — match rows (p1 vs p2, score, winner highlighted); **green advance seats** = the last N slots that qualify, tinted green with «صعود» tag; states: hidden (pre-reveal) / drawn / live / done.
13. **Roadmap timeline** — vertical stages with dots (done/current/pending).
14. **Toast / inline error** — red tint box for API errors.

---

## 4. USER app — screens

### 4.1 Login `/login`
- Logo + «ورود به حساب».
- **Primary:** «ورود با گوگل» (white button + G icon).
- Divider «یا با موبایل».
- Phone form: موبایل input → «ارسال کد» → code input → «تأیید و ورود».
- States: phone step / code step / error.
- (Google button shown only when configured — always show in mockup.)

### 4.2 Profile builder `/welcome` — **required before any registration**
- Header «تکمیل پروفایل گیمر» + subtitle.
- Inputs: **نام** · **نام خانوادگی** (2-col) · **استان→شهر (cascade)** · **اسم مستعار/تگ** (LTR) · **شماره تماس** · **پیام‌رسان** (chips: واتساپ/تلگرام/هردو) · **رشته‌ها** (multi-select chips, 5 games) · **سابقه (سال)** · **نام تیم (اختیاری)**.
- Submit «ورود به گیم‌لند». States: filled / validation error (تگ تکراری، فیلد خالی).

### 4.3 Home `/`
- **Guest:** hero «خانهٔ گیمرهای ایران» + «ورود/ثبت‌نام» CTAs + peek of open events.
- **Logged-in:**
  - **Champion hero** (top-ranked gamer) OR empty «پس از اولین مسابقه فعال می‌شود».
  - **Active competitions** = list of **promoter countdown cards** (§3.10).
  - **Leaderboard peek** (top 3) → «همه».
- Bottom nav.

### 4.4 Competitions list `/competitions`
- Filter chips by discipline (همه + 5).
- Cards grouped/sorted by status; each: disc badge, title, status chip, tier, prize, date, city(s).
- Empty state.

### 4.5 Competition detail `/competitions/[id]`
- Hero: disc badge, title, status chip, season.
- **Multi-phase timeline** (§3.13): prelim (cities + dates) → final (Tehran + date). For single-stage events: one phase.
- Date/venue box per phase.
- **Prize pool** card + breakdown (۱/۲/۳/۴) with sponsor-funded note.
- Format · participants/capacity.
- **Register CTA** (or «روندنمای من» if already registered; disabled if not open / profile incomplete → route to /welcome).
- **Final results** section (when done): top finishers.

### 4.6 Register `/competitions/[id]/register`
- Guard: profile complete (else redirect /welcome), event open.
- Inputs: **شهر** (dropdown of the event's prelim cities) · **رشته‌ها** (multi, from event's disciplines) · **ticket picker 1–6** (§3.9).
- Legal note (free entry, sponsor-funded).
- Confirm «ثبت‌نام». States: success → /me/competitions; error (بسته/تکراری).

### 4.7 My competitions `/me/competitions`
- List of registered events: disc badge, title, status, «X شانس · Y seed». Empty state → /competitions.

### 4.8 My roadmap `/competitions/[id]/me`
- Per-ticket cards (شانس #1..N) with status (منتظر قرعه/در جریان/حذف/به فاینال).
- Summary tiles (شانس‌ها / seed / انجام‌شده).
- Stage timeline.
- **Pre-reveal state:** «قرعه‌کشی هنوز رونمایی نشده».
- Link «مشاهدهٔ براکت».

### 4.9 Bracket `/competitions/[id]/bracket`
- Hidden until admin reveals → «هنوز قرعه‌کشی رونمایی نشده».
- When drawn: brackets with matches; **green advance seats** for the qualifying slots; live updates.

### 4.10 Me `/me`
- Header: avatar, name, @tag · city, «ویرایش».
- Tiles: (سکه optional/hidden V1) · مسابقات · اعلان.
- Admin CTA (if staff).
- «ثبت‌نام در مسابقات» open list.
- Recent notifications. Settings + footer links.

### 4.11 Edit profile `/me/edit`
- Same field set as /welcome, pre-filled.

### 4.12 Leaderboard `/leaderboard`
- Discipline filter chips + search. Ranked rows: rank, avatar, name/@tag, points, best rank, events. Empty state.

### 4.13 Players / Gamer Bank `/players`
- Discipline filter + search. Gamer cards: avatar, name/@tag, disc badge, city.

### 4.14 Player profile `/players/[id]`
- Header + disc + city + ranking points.
- **Honors** (from placements): rank medals per event.
- History list.

### 4.15 Notifications `/me/notifications`
- List, unread highlighted; auto-mark read on view. Types: registration/draw/match_ready/result/advance/announcement.

### 4.16 Static: `/about` · `/rules` · `/sponsors` · `/me/settings`
- Rules renders the unified default ([`20`](20-default-rules.md)); per-event rules note.

---

## 5. ADMIN app — screens

### 5.1 Dashboard `/admin`
- Stat tiles: گیمرها · مسابقات فعال · ایونت‌ها.
- CTAs: ساخت ایونت · اعلان · مدیریت گیمرها.
- Events list → detail.

### 5.2 Events list `/admin/events`
- Rows: disc badge, title, status, prize/teams. «+ ایونت جدید».

### 5.3 **Create event v2** `/admin/events/new` — the most important admin screen
Inputs (grouped):
- **اطلاعات پایه:** عنوان · فصل/دوره · **رشته‌ها** (multi-select) · **تایر** (S/A/B/C for ranking) · **جایزهٔ کل** (عدد) · فرمت.
- **زمان‌بندی کلی:** بازهٔ تاریخ کل ایونت (شروع/پایان — date pickers) + **date نمایشی** (متن fa).
- **مرحله‌ها (phases):** repeatable block. Each phase: **نام مرحله** (مقدماتی/فینال) · **بازهٔ تاریخ** · **محل/شهر** · **تعداد براکت** · **سهمیه صعود** (admin-set). «+ افزودن مرحله». Single-stage event = one phase.
- **ظرفیت:** max players (اختیاری).
- **قوانین:** toggle «قوانین پیش‌فرض» یا **آپلود فایل .md**.
- **وضعیت اولیه:** soon/open.
- Submit «ایجاد ایونت». States: validation errors per field.

### 5.4 Event management `/admin/events/[id]`
- Header + status chip.
- **StatusControl:** soon → open → live → done (4 buttons; current highlighted; alerts on change).
- Stat tiles: ثبت‌نام · شانس کل · seed.
- **Registrations list** (+ ability to register-on-behalf / remove — fast-follow).
- **Draw controls** (§5.5).
- **Live picking** (§5.6).
- **Finalize** (§5.7).
- Link to bracket.

### 5.5 Draw
- Toggle **دستی | تصادفی**.
- Per-bracket **advance count** inputs (feeds green seats).
- «اجرای قرعه‌کشی» (respects per-player no-collision in prelim).
- **Reveal toggle:** «مخفی / رونمایی‌شده» — players see bracket only after reveal.
- Re-draw confirm.

### 5.6 Live picking (projector mode)
- Per bracket/match: **dropdown of that match's players** → pick winner → optional score.
- Show **remaining players**; **undo/remove** a wrong pick.
- Winner auto-advances; newly-ready matches alert the two players.

### 5.7 Finalize
- List participants with **rank input** each (۱=قهرمان; blank=no rank).
- «قطعی‌سازی و اعلام نتایج» → writes placements → leaderboard/honors update → notifies.
- Editable after (به‌روزرسانی نتایج).

### 5.8 Gamers `/admin/gamers`
- List: name, @tag, role badge, city, missing-profile flag. (role management fast-follow.)

### 5.9 Notify `/admin/notify`
- Compose: title + body + audience (همه / گیمرها). Send broadcast.

### 5.10 Disciplines `/admin/disciplines` · Sponsors `/admin/sponsors`
- Simple list + add form.

---

## 6. Key flows (for prototype wiring)

1. **Onboarding:** Login → (Google/OTP) → if profile incomplete → `/welcome` → Home.
2. **Registration:** Competitions → detail → Register (city + disciplines + tickets) → My competitions.
3. **Tournament (admin):** Create event v2 → open reg → close (live) → Draw (set advance counts, random/manual) → Reveal → Live picking → Finalize (ranks) → done → leaderboard updates.
4. **Player during event:** roadmap (hidden→revealed) → bracket (green seats) → result notifications → final rank on profile.

---

## 7. States checklist (must exist for every relevant screen)

- **Empty:** no events / no registrations / no players / no notifications / leaderboard before first event.
- **Loading:** skeletons on list/detail.
- **Filled:** normal.
- **Error:** API/validation inline (red box).
- **Gated:** profile-incomplete → /welcome; not-logged-in → /login; reg-closed → disabled CTA with reason.
- **Draw hidden vs revealed** (roadmap + bracket).

---

## 8. Out of scope for this mockup (V2)

Coins/wallet UI · gamenet directory · store/marketplace · AI bot · bulk player import · multi-organizer permissions. Don't draw these.
