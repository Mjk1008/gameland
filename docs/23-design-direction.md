# 23 — Design Direction (LOCKED): "Broadcast"

**Stage:** Design · **Status:** ✅ locked 2026-07-05 · **Authoritative visual direction.**
Supersedes the color/visual aesthetic in [`22-brand-book`](22-brand-book.md) (keep 22's *strategy, brand lines, voice, motif* only). Tokens: [`web/lib/design-tokens.css`](../web/lib/design-tokens.css).

> **This is the single source of truth for how Gameland looks.** Direction "Broadcast" won a 3-way art-direction review. Design every screen from this. Do **not** default to the generic cyan-on-black esports look.

---

## 1. The thesis — "Prime-time broadcast"

Gameland runs **football & fighting sims** (FC26, PES21, eFootball, UFC6, NBA2K26). The look borrows from **live sports broadcast graphics**: a calm, warm-dark canvas with **one confident electric-amber accent** and **big, condensed numerals** treated like an on-air scoreboard/lower-third.

- **Exciting** comes from: bold condensed numbers, the single hot accent, purposeful motion (count-ups, live ticker).
- **Calm** comes from: warm near-black canvas, generous negative space, one accent only, hairline structure.
- **Modern & minimal:** one accent per screen, no gradients, no glow, no clutter. Whitespace is a feature.

**Do NOT:** cyan-on-black, neon, purple→blue gradients, glassmorphism, drop-shadows-as-decoration, rainbow of colors, emoji as icons, centered-everything.

---

## 2. Color (exact tokens)

Warm near-black ground (chosen — a real warm bias, not blue-black). **One accent: electric amber.** Semantic colors are separate and muted. See `design-tokens.css` for the machine values.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#14110D` | app background (warm near-black) |
| `--surface-1` | `#1E1A14` | cards |
| `--surface-2` | `#262019` | inputs, raised |
| `--line` | `#322A1F` | hairline borders |
| `--line-2` | `#40362A` | strong border / focus base |
| `--accent` | `#FF6A1A` | **the one accent** — CTAs, key numbers, active, links |
| `--accent-strong` | `#E85D0A` | pressed/active |
| `--accent-soft` | `rgba(255,106,26,.14)` | accent tint bg / chips |
| `--text-hi` | `#F6EFE4` | headings, key text (warm off-white) |
| `--text` | `#A89A88` | body |
| `--text-mut` | `#6E6252` | captions, placeholders |

**Semantic (state — muted, warm-compatible):** advance/open `#3FBE86` · out/live `#FF5A4E` · final/info `#C6A6FF`. Each with a 14% `-soft` tint.

**Disciplines:** shown as a **neutral chip + a small color dot** (avoid a rainbow of full-color badges). Dot hues: FC26 `#4AA3FF` · PES21 `#3FBE86` · eFootball `#FF6A1A` · UFC6 `#FF5A4E` · NBA2K26 `#F5A623`.

**Rule:** amber appears as the single point of emphasis per screen. Everything else is warm neutral.

---

## 3. Typography

Load these (Claude Design may use Google Fonts):
- **Persian (all UI text):** `Vazirmatn`.
- **Display + numerals (Latin):** `Saira Condensed` (700/800) — the broadcast/scoreboard voice. Fallback `Rajdhani`.
- **Latin body:** `Inter`.

Numbers (ranks, scores, points, timers) use the condensed display face, **big**, `font-variant-numeric: tabular-nums`, direction LTR. This is the signature — treat key stats like on-air graphics.

**Scale (mobile → desktop):** Display 34/38→44/48 (800) · H1 24/30 (800) · H2 19/26 (700) · H3 15/22 (700) · Body 14/22 (400–500) · Small 12.5 (500) · Label 11 uppercase +0.1em (700, Latin). Headings `text-wrap: balance`. Body ≤ ~65 chars.

---

## 4. Shape, spacing, elevation, motion

- **Radius:** chip 8 · input/button 11 · card 14 · sheet 16 · pill 999. Consistent, not rounded-everything.
- **Spacing:** 4px grid (4·8·12·16·20·24·32·48·64). Generous. Cards padding 14–16. Never pack a screen.
- **Elevation:** hairline borders over shadows. Modals/sheets only: `0 12px 40px rgba(0,0,0,.5)` + 45–55% scrim.
- **Icons:** one line set (Lucide), stroke 1.75, 24px grid, monochrome. No emoji.
- **Motion (minimal, meaningful, 150–260ms, ease-out; respect `prefers-reduced-motion`):**
  - Number **count-up** on rank/points/score reveal.
  - Card enter: subtle slide-up + fade, stagger 40ms.
  - Press: scale 0.98 on tappable cards/buttons.
  - A thin **accent "live" underline/ticker** on live events (the one animated flourish).
- **Signature motifs:** broadcast **lower-third** panel for the champion/your-rank hero; clean **bracket lines**; the amber live-ticker. Use each sparingly.

---

## 5. Screen inventory (design all — priority order)

Mobile-first, RTL Persian, bottom-nav app. **Every screen needs states: empty · loading (skeleton) · filled · error.**

### Tier 1 — MVP core (design first)
| Route | Screen | Key elements |
|---|---|---|
| `/` | Home | your-rank/champion lower-third hero · **promoter cards** (disc dot, title, capacity bar, countdown, CTA) · leaderboard peek · bottom nav |
| `/login` | Login | Google button (primary) · phone-OTP fallback |
| `/welcome` | Profile builder | first/last name · **province→city cascade** · phone + messenger (whatsapp/telegram/both) · nickname · **multi-discipline select** · experience · team |
| `/competitions` | Events list | filter by discipline · event cards with status chip + countdown |
| `/competitions/[id]` | Event detail | hero · prize (gold-ish accent, prestige) · **phases (date+location)** · rules link · register CTA |
| `/competitions/[id]/register` | Register | city select · discipline(s) of event · **ticket picker 1–6** · confirm |
| `/competitions/[id]/me` | My roadmap | per-ticket status timeline · seeds · which bracket |
| `/competitions/[id]/bracket` | Bracket | prelim brackets + final · **advance seats highlighted (green)** · hidden until reveal |
| `/leaderboard` | Ranking | discipline tabs · big rank numerals · search |
| `/me` | My dashboard | avatar · rank · my competitions · notifications peek · admin entry (if staff) |
| `/me/competitions` | My competitions | registered events + status |
| `/me/notifications` | Notifications | list, unread state |
| `/players` · `/players/[id]` | Players / profile | roster · honors (champion/prize = gold prestige) · rank |

### Tier 1 — Admin (design; operator UI, information-dense but on-style)
| Route | Screen | Key elements |
|---|---|---|
| `/admin` | Dashboard | counts · quick actions · event list |
| `/admin/events` | Events list | status per event |
| `/admin/events/new` | Create event | name · date range · **multi-discipline** · brackets# · **phases (date+location)** · prize · tier · **rules.md upload** · max players |
| `/admin/events/[id]` | Manage event | status transitions (soon→open→live→done) · draw (hidden→reveal, manual\|random) · **per-bracket advance count** · **live winner picking (dropdown + undo)** · **finalize/placements** |
| `/admin/gamers` | Gamers | list, roles |
| `/admin/notify` | Broadcast | compose notification |

### Tier 2 — secondary (design after core)
`/me/edit` · `/me/settings` · `/me/wallet` · `/rules` · `/about` · `/sponsors` · `/signup` · `/admin/disciplines` · `/admin/sponsors` · `/gamenets` · `/gamenets/[id]` · `/gamenets/new` (gamenet = V2 — lowest priority).

---

## 6. Component library to produce

Buttons (primary amber / secondary outline / prestige) · status chips (open/live/soon/done) · discipline chip+dot · inputs & **cascade select** (city disabled until province) · multi-select · **ticket picker 1–6** · **promoter card** (capacity bar + countdown) · leaderboard row · **rank/score numeral** (broadcast) · **bracket seat** (normal + green-advance + hidden) · phase/timeline item · notification item · bottom nav (5, active amber) · modal/sheet + scrim · skeleton loaders · empty states (use the bracket-line motif).

---

## 7. Deliverable expectations

- Mobile-first (375px), then tablet/desktop. No horizontal scroll. Safe areas respected.
- Contrast AA (4.5:1 text). Touch targets ≥44px. Focus states visible.
- One accent per screen; gold-ish tone reserved for champion/prize only.
- Real Persian content (pull names/events from the app, not lorem).
- Deliver as a coherent, reusable design system + every Tier-1 screen.
