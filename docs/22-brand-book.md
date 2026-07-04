# 22 — Gameland Brand Book & Design System

**Stage:** Design · **Status:** ✅ v1 locked · **Source of truth** for all UI/mockups.
**Consumes:** [`21`](21-mvp-mockup-spec.md) mockup spec · **Feeds:** Claude Design mockup + app restyle.
Tokens: [`web/lib/design-tokens.css`](../web/lib/design-tokens.css) · [`web/lib/design-tokens.json`](../web/lib/design-tokens.json)

> Modern, minimal, uncluttered. One hero accent (cyan), gold reserved for prestige, everything else quiet neutral. The signature idea — **ranking as progression** — shows up as an ascending-steps motif.

---

## 1. Brand strategy

- **Name:** Gameland — گیم‌لند
- **Category:** Iran's competitive-gaming tournament & **persistent ranking** platform (football sims + fighting games).
- **Essence:** *the ranking home of Iranian gaming* — where competition becomes credible, lasting progression.
- **Brand line (primary):** **«خانهٔ گیمرهای ایران»**
- **Brand line (ranking/support):** **«هر برد، یک پله بالاتر»** (every win, one step up)
- **Personality:** competitive · credible · modern · fair · community-first. Not: hype-y, cluttered, childish.
- **Signature motif:** **ascending steps / rank ladder** — a stepped line rising left→right (RTL: rising toward the start). Used in the monogram, dividers, and empty-state art. Use sparingly.

### Voice
Confident, direct, Persian, no filler. A control says exactly what happens. Fair-play tone (we're the credible authority, not a hype machine).
- ✅ «رتبه‌ت ثبت شد.» · «ثبت‌نام باز است.» · «به فاینال رسیدی.»
- ❌ «واو! عالیه!!! 🎉🎉» · «شاید بتونی ثبت‌نام کنی» · apologetic/vague errors.
- Errors: what went wrong + how to fix — «این تگ قبلاً گرفته شده. یکی دیگه انتخاب کن.»

---

## 2. Logo system

- **Wordmark:** `GAMELAND` set in the display face (Rajdhani/Chakra Petch), weight 700, uppercase, letter-spacing **+0.14em**. Persian lockup: «گیم‌لند» in Vazirmatn 800.
- **Monogram:** a geometric **G** whose inner terminal is cut as an **ascending step** (the rank-ladder motif) — works as app icon / avatar / favicon.
- **Clear space:** minimum = height of the “G” on all sides.
- **Min size:** wordmark ≥ 88px wide; monogram ≥ 24px.
- **Color use:** brand cyan on dark (default), `text-hi` on brand, single-color only. Never gradient-fill the mark, never add shadow, never stretch, never place on busy imagery.

---

## 3. Color

Cool near-black ground with a subtle cyan bias (chosen, not default grey). **One accent** (cyan). Gold = prestige only (champions, prizes, first place). Semantic colors are separate from the accent.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#0A0E13` | app background |
| `--surface-1` | `#111823` | cards |
| `--surface-2` | `#18212E` | inputs, raised |
| `--line` | `#23303F` | hairline borders |
| `--line-2` | `#2E3E50` | strong border / focus ring base |
| `--brand` | `#22D3EE` | primary accent, CTAs, links, active nav |
| `--brand-strong` | `#06B6D4` | pressed/active brand |
| `--brand-soft` | `rgba(34,211,238,.12)` | tint bg for brand chips |
| `--gold` | `#F5C84B` | **prestige only** — champion, prize, 1st |
| `--gold-soft` | `rgba(245,200,75,.12)` | prize card tint |
| `--text-hi` | `#F2F6FA` | headings, key numbers |
| `--text` | `#93A4B5` | body |
| `--text-mut` | `#5D6B7A` | captions, placeholders |

**Semantic (state, not accent):** win/open `#34D399` · live/eliminate `#FB7185` · final/info `#A78BFA`. Each with a `-soft` 12% tint.

**Discipline colors** (badges only): FC26 `#38BDF8` · PES21 `#34D399` · eFootball `#22D3EE` · UFC6 `#FB7185` · NBA2K26 `#F5C84B`.

**Rule:** a screen uses neutrals + at most **one** accent region of emphasis. Gold appears at most once per screen (the prize/champion). No gradients, no glow.

---

## 4. Typography

- **Display / wordmark / numbers:** Rajdhani (fallback Chakra Petch → system condensed). Bold, technical, esports.
- **Persian UI text:** Vazirmatn (fallback Tahoma).
- **Latin body:** Inter (fallback system).

**Scale** (mobile → desktop):

| Role | Size / line | Weight | Notes |
|---|---|---|---|
| Display | 32 / 36 → 40 / 44 | 800 | hero, wordmark; `text-wrap: balance` |
| H1 | 24 / 30 | 800 | page title |
| H2 | 19 / 26 | 700 | section |
| H3 | 15 / 22 | 700 | card title |
| Body | 14 / 22 | 400–500 | default |
| Small | 12.5 / 18 | 500 | meta |
| Caption/Label | 11 / 14 | 700 | uppercase Latin, letter-spacing +0.08em |
| Number/Tag | Rajdhani | 700 | `font-variant-numeric: tabular-nums`, LTR |

Keep running text ≤ ~65 characters. Persian digits in prose; Rajdhani Latin digits for stats/tags.

---

## 5. Spacing, radius, elevation

- **Grid:** 4px base → scale `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.
- **Radius:** sm `8` (chips) · md `11` (inputs/buttons) · lg `14` (cards) · xl `16` (sheets) · pill `999`.
- **Elevation (minimal):** prefer **hairline borders** over shadows. Level-1 = `1px --line`. Level-2 (modals/sheets) = `0 8px 30px rgba(0,0,0,.45)`. No decorative shadows on cards.
- **Density:** generous. Cards breathe (padding 14–16). Never pack a screen; whitespace is a feature.

---

## 6. Iconography & graphics

- **Icons:** thin line, stroke 1.7–2px, round caps/joins, 24px grid. Monochrome (`text` / `brand`).
- **Motif graphic:** the ascending-steps line — used in empty states, the champion hero, section dividers. Subtle, one accent, never busy.
- **No:** emoji as UI markers, gradients, noise, glows, drop-shadows on flat elements.

---

## 7. Core components (spec)

- **Button / primary:** brand bg, `#06232A` text, radius 11, weight 700, 44px tap height. Hover → `--brand-strong`. Focus → 2px `--brand` ring offset.
- **Button / secondary:** transparent bg, 1px `--line` (or colored), text `--text-hi`.
- **Card:** `--surface-1`, 1px `--line`, radius 14, padding 14–16.
- **Input / select:** `--surface-2`, 1px `--line`, radius 11; label above in `--text-mut`; focus ring `--brand`. Cascade select: city disabled until province set.
- **Chip / status:** dot + label, semantic color + `-soft` bg, radius pill.
- **Discipline badge:** rounded square, discipline color tint + short code, Rajdhani.
- **Ticket picker:** segmented 1–6, selected = brand tint + border.
- **Promoter card:** title + disc badge, capacity bar (`--brand` fill), empty-slots number, countdown (tabular-nums), CTA.
- **Bracket seat:** neutral rows; **advance seats tinted `win` (green)** with «صعود» tag; hidden pre-reveal.
- **Bottom nav:** 5 items, active `--brand`, inactive `--text-mut`, unread dot on «من».

States for everything: **empty · loading (skeleton) · filled · error (inline red) · gated**. Focus states visible. `prefers-reduced-motion` respected.

---

## 8. Do / Don't

| Do | Don't |
|---|---|
| One accent per screen | Rainbow of colors |
| Gold only for champion/prize | Gold as a generic highlight |
| Hairline borders, flat surfaces | Drop-shadows, glows, gradients |
| Generous whitespace | Dense, packed screens |
| Direct Persian copy | Hype, emoji, exclamation spam |
| Tabular numerals for stats | Proportional digits in tables |

---

*Change control:* edit this file → run the brand token sync → update `design-tokens.css`/`.json`. This book wins over ad-hoc choices; the user's explicit direction wins over this book.
