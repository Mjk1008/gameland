# 15 — Competition Engine & Notifications (focus #3 + #4)

**Stage:** Plan (design spec — not code) · **Status:** ✅ v1. Specs the **proper running of competitions** (#3) and **notifications/info** (#4). Exact thresholds = founder-confirm knobs.

---

## Part A — Competition engine (#3)

### The mechanic (from brief, legally reframed)
- **Format:** knockout / elimination.
- **6 preliminary brackets** per competition; top finishers of each advance.
- Players buy **1–6 "attempts" ("chances")** before the competition.
- Each attempt = one run through a preliminary bracket; performing well earns a **seed** to the final.
- A player carries **up to 3 seeds** into the final.
- **Final = 128 players.**

**Worked example (from brief):** buy 2 attempts → attempt 1: win 3, lose 4th → no seed; attempt 2: win 6 in a row → direct seed to final. Buy 6 attempts → more tries, but **max 3 seeds** counted.

### ⚖️ Legal framing (keystone — [11-R1/R2](11-risks.md))
- An **attempt = a paid skill-service** (access to compete), **NOT a stake**. Bought with **non-convertible coins**.
- **Prizes are sponsor-funded and fixed**, independent of how many attempts are sold. No "entry pool → winner takes pot."
- → keeps it a **skill competition**, off the gambling line. The attempts cap (3 seeds) also reduces pay-to-advance optics.

### Entities
`Competition` → `PreliminaryBracket[6]` → `BracketMatch[]`; `Attempt`(player, bracket-run); `Seed`(player→final, max 3); `Final`(128); `Match`(result feeds [ranking](14-ranking-design.md)).

### Qualification logic (structure; numbers to confirm)
- Each preliminary bracket = a single-elim mini-bracket; reaching the qualifying threshold (e.g., bracket winner / win-streak of N) earns a **seed**.
- 6 brackets × top finisher(s) → fill the **128-player final**.
- Re-entry: a new attempt re-enters the player into a fresh bracket run (capped at 6 attempts, 3 seeds).
- **Founder knobs:** bracket size (e.g., 64→6 wins), how many advance per bracket, win threshold per seed.

### Per-player roadmap (brief: "هر بازیکن رود مپ خودشو داشته باشه")
Each player sees:
- My current bracket + position, **next match** (opponent, time, which gamenet/venue).
- **Wins-to-advance**, seeds earned (x/3), and my **path to the 128 final**.
- Live status: in-progress / advanced / eliminated / qualified.

### Integrity
- Attempts tied to the **phone-keyed identity** ([14](14-ranking-design.md)) → no buying attempts on alt accounts; duplicate flagging at registration ([11-R11](11-risks.md)).

---

## Part B — Notifications / info dissemination (#4)

Goal: **kill the WhatsApp Q&A** — every player gets everything, automatically.

### Channels
- **SMS-first** (domestic provider e.g. Kavenegar) — works without VPN, survives filtering/blackouts.
- **In-app** (PWA) + optional **Telegram-bot mirror** (meet users where they already are).
- **Not** dependent on filtered Instagram/WhatsApp for critical flows.

### Triggers (per-player, targeted)
registration confirmed · schedule published · **match-ready / your next match** (opponent, time, venue) · result recorded · advanced / eliminated · **seed earned** · qualified for final · **any schedule change**.

### Broadcast (per-competition)
full info packet on open: format, rules, dates, venues, how attempts/seeds work, prizes (sponsor) — the exact things "people keep asking on WhatsApp."

### Content principle
Every message answers "what do I need to know / do next?" — schedule, format, rules, my next step. Persian, concise, with a deep-link to the player's roadmap.

---

## Dependencies
- Feeds [14-ranking](14-ranking-design.md) (results → points).
- Bound by [11-risks](11-risks.md) (sponsor-funded prizes, coin wallet).
- Built on [12-tech](12-tech-approach.md) (Iran-hosted, SMS, offline-first).
