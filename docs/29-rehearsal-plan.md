# 29 — Pre-launch Rehearsal Plan (dry-run)

> Goal: before go-live, run **every operator + player flow end-to-end** — all
> قرعه‌کشی‌ها, a full mock مسابقه from ثبت‌نام to امتیاز نهایی — on a copy of the
> real ~2000-user database, in an environment that **cannot touch live data,
> cannot send SMS to real numbers, and cannot move real money.**
>
> Owner: MJK (PM/operator).  Code: branch `mvp`, unmodified.
> Tooling: `web/scripts/rehearsal/*` + `npm run rehearsal:*`.

---

## 1. Isolation model — what makes this safe

| Risk | Guard |
|---|---|
| Writing to the live DB | Separate app `gameland-rehearsal` + separate DB `gameland-rehearsal-db`. Every write-script routes through `assertSafeTarget()` which refuses if the target DB host/name equals `gameland-db`, or if the app is `gameland`, or if `KAVENEGAR_API_KEY` is present. |
| **Real SMS to real (cloned) phone numbers** | `pushNotif()` fires an SMS for `SMS_TRIGGERS = ['registration','draw','match_ready','advance']` (store.ts:1087). Rehearsal app env has **no `KAVENEGAR_API_KEY`** → `lib/sms.ts` returns `{provider:'stub'}` and only `console.log`s. Preflight fails loudly if the key is ever set. |
| Real money | Payment is manual فیش + admin approval — no gateway on the critical path. Testers must not pay a real card; approvals in the rehearsal are just status flips. |
| Polluting the national ranking / leaderboard real users see | It's a different DB. Nothing in the rehearsal is visible on `gamelandteam.ir`. |
| Search engines / public stumbling in | No custom domain on the rehearsal app; URL is `gameland-rehearsal.liara.run` only, shared with staff directly. |
| Assistant spend | Optional. Leave `METIS_API_KEY` **unset** to test everything except the assistant, or set it to test the assistant too (≈ negligible for a dry-run; watch `/admin/ai`). |

**Accepted trade-off (MJK decision):** the rehearsal DB contains a copy of real
user rows (names, phones). Mitigations: SMS disabled, no public URL, DB deleted
at teardown, `clone.mjs` skips `app_ai_messages` / `app_track_events` /
`app_notifications` / `app_coin_txns` row-data.

---

## 2. One-time setup

### 2.1 Create the rehearsal app + DB  *(MJK runs — needs Liara account)*

```bash
liara db create --name gameland-rehearsal-db --type postgres --plan small-g2 -y
liara app create --app gameland-rehearsal --platform next
```

> Live DB is **PostgreSQL 16.10**; local `pg_dump` is 16.14 (`brew install libpq`).
> Create the rehearsal DB as **Postgres 16** too (`-v 16` if prompted) so the
> dump restores cleanly.

Get the new DB connection string:

```bash
liara db ls
```

Open `gameland-rehearsal-db` in the Liara console → **enable Public Network** →
copy the **public** connection string (`postgres://root:…@<something>.liara.cloud:3xxxx/…`).
The clone/reset scripts run from your laptop, so they need the public host — the
internal `…-db:5432` host only resolves inside Liara. This matches how live
`DATABASE_URL` already works (CLAUDE.md §4 connects to it from the laptop).

### 2.2 Set the rehearsal app env

Copy live env, then **change / drop** the marked keys:

| Key | Value in rehearsal |
|---|---|
| `DATABASE_URL` | **new** `gameland-rehearsal-db` string |
| `NEXTAUTH_URL` | `https://gameland-rehearsal.liara.run` |
| `NEXT_PUBLIC_APP_URL` | `https://gameland-rehearsal.liara.run` |
| `NEXTAUTH_SECRET` | any fresh random string |
| `ADMIN_PHONES` / `ADMIN_EMAILS` | your own — so you're admin |
| `AUTH_PROVIDER` | same as live |
| `KAVENEGAR_API_KEY` | **DO NOT SET** (this is the SMS kill-switch) |
| `KAVENEGAR_OTP_TEMPLATE` | may drop; OTP falls back to `123456` |
| `METIS_API_KEY` | set only if testing the assistant |
| `ASSISTANT_MODEL` | same as live if `METIS_API_KEY` set |
| `HONOR_USER_PHONE` | your phone if testing the arcade, else drop |
| `GOOGLE_*` | drop (OAuth can't work from Liara anyway) |

```bash
liara env set --app gameland-rehearsal \
  DATABASE_URL='postgres://…gameland-rehearsal-db…' \
  NEXTAUTH_URL='https://gameland-rehearsal.liara.run' \
  NEXT_PUBLIC_APP_URL='https://gameland-rehearsal.liara.run' \
  NEXTAUTH_SECRET='…' AUTH_PROVIDER='…' ADMIN_PHONES='09…'
```

### 2.3 Verify isolation  *(must pass before anything else)*

```bash
cd web
npm run rehearsal:preflight -- --app gameland-rehearsal
```

Expect `✓ "gameland-rehearsal" looks isolated`. If it prints `KAVENEGAR key → PRESENT ✖`, stop and unset it.

### 2.4 Clone live data + deploy

```bash
# needs: brew install libpq && brew link --force libpq   (pg_dump/psql on PATH)
npm run rehearsal:clone  -- --app gameland-rehearsal --confirm
npm run rehearsal:deploy -- --app gameland-rehearsal
```

`deploy.mjs` refuses if the checkout is behind `origin/mvp` (CLAUDE.md §1).

### 2.5 Smoke check

```bash
curl -sI https://gameland-rehearsal.liara.run | head -1        # 200
curl -s  https://gameland-rehearsal.liara.run | wc -c          # ~45 KB, not MB
```

Log in with your admin phone (OTP `123456`). Confirm `/admin` loads and the
gamer count matches live.

---

## 3. Rehearsal prep in the app  *(as admin, in the rehearsal app)*

1. `/admin/competitions/new` → create a رویداد, e.g. **«رهرسال پیش از اجرا»**, set `location` (venue the assistant reports).
2. Add **2–3 رشته** (Events) — pick the games you'll actually run. Set tier, prize, `regDeadline`, `finalSize`.
3. If piloting 2v2: make one رشته `teamSize = 2` on a **separate** رویداد.
4. `/admin/ai` → confirm `ai_knowledge` has venue / online-vs-inperson / receipt SLA facts.
5. Note the `eventId` of each رشته (URL of `/admin/events/[id]`). You'll need it for `--comp`.

---

## 4. The runbook

Mark each row **P / F** and note anything surprising. "Expected" is the contract;
a mismatch is a bug to file before launch.

### A · Auth & onboarding
| # | Step | Expected | P/F |
|---|---|---|---|
| A1 | Sign up a brand-new phone (`0912…` not in DB), password, OTP `123456` | account created; row committed before 200 (no dup on refresh) | |
| A2 | Log out / log in again | session restored | |
| A3 | Complete profile (name, city, disc, experience) | profile 100%; **+25** activity points on `/me` | |
| A4 | Upload avatar | shows on `/me`; served from `/api/avatar/<id>`; **+10** points; page stays ~KB not MB | |
| A5 | Open the app as a cloned real user (reset their password via `/forgot`?) or just use fresh accounts | — | |

### B · Registration & payment (فیش)
| # | Step | Expected | P/F |
|---|---|---|---|
| B1 | Register 1 سهم on a رشته | reg row `pending`; `attempts=1` | |
| B2 | Try to buy 7 سهم | capped at **6** per discipline | |
| B3 | Enter a referral `@tag` at purchase (and via `?ref=` link) | referrer recorded once; self-referral blocked | |
| B4 | Upload receipt image | stored in `app_receipts`; visible to admin only at `/api/admin/receipt/<regId>` | |
| B5 | `/admin/requests` → open the review sheet → **approve** | status `approved`; `paidAttempts` set; **+15/سهم**; in-app notif appears; server log shows `[SMS stub] → …` (never a real send) | |
| B6 | Approve/reject buttons on the list cards | **absent** — only inside the sheet (CLAUDE.md §6) | |
| B7 | Reject another reg with a reason | user sees reason on their reg + the assistant can quote it; user can re-request | |
| B8 | Top-up from 2 → 4 سهم after approval | bills only the **2** difference (`attempts−paidAttempts`) | |
| B9 | Referral rewards: get 3 approved referrals → 1 free سهم; 6 → 3 total | `freeAttempts` granted; consumed on next reg; idempotent (`referralMilestone`) | |
| B10 | `/admin/requests/history` → reverse an approval | status flips back; points recompute | |

### C · Teams (2v2) — only if piloting
| # | Step | Expected | P/F |
|---|---|---|---|
| C1 | Captain creates team + invites partner `@tag` | team `forming`; invite notif to partner | |
| C2 | Partner accepts | team `complete`; registration created for both | |
| C3 | Replace partner before draw | last `(team,slot)` row is the active one after restart | |
| C4 | Leave one team incomplete | not in `seatableTeamsForComp` → excluded from draw | |

### D · قرعه‌کشی (draw)
| # | Step | Expected | P/F |
|---|---|---|---|
| D1 | `/admin/events/<id>` → draw prelims, **city** grouping | `ok:true`; prelim matches created per city; every approved reg notified (SMS = stub) | |
| D2 | Inspect a player who bought ≥2 سهم | their سهم land in **distinct bracket indices** — never face each other (`distributeSeats`) | |
| D3 | Re-draw the same رشته | blocked / `redrawn` semantics as designed; to force a clean redraw use §5 | |
| D4 | Draw a second رشته with **province** grouping | groups by province instead of city | |
| D5 | After draw, player tries to change سهم / register | **locked** (`matchesForComp > 0`) | |
| D6 | `/admin` prelim-venue assignment | venue shows on the player's match page | |
| D7 | Scale check: draw the رشته that has the most approved regs (aim for a few hundred+) | completes without timeout; admin pages still render | |

### E · Prelim → final → finalize
| # | Step | Expected | P/F |
|---|---|---|---|
| E1 | Record prelim outcomes (advance/eliminate) for a city bracket | `seedsEarned` increments on advance; `prelimsCompleted` tracks | |
| E2 | Push one player past 3 advances | capped at **3 seeds** to the final | |
| E3 | `/api/admin/assemble-final` (or admin UI) | final bracket built; ≤3 seeds per city; size = `finalSize` | |
| E4 | Set a manual `finalSeeding` override | respected over auto seeding | |
| E5 | Enter final match results round by round | winners advance; bracket consistent | |
| E6 | Finalize the رشته | `app_placements` written; ranking points = tier-multiplier × placement (`lib/ranking.ts`); `rankingPoints` / `rankingEvents` updated | |

### F · Points & ranking parity
| # | Step | Expected | P/F |
|---|---|---|---|
| F1 | Pick 3 finished players. Compare their total on **home**, **leaderboard**, **/me**, and the **assistant's** answer | all four identical | |
| F2 | National ranking order | sorted by `rankingPoints, rankingEvents`; no `#0` / off-by-one; ties stable | |
| F3 | A player with only activity points (no placement) | appears with the derived total, below placed players | |

### G · Assistant — only if `METIS_API_KEY` set
| # | Step | Expected | P/F |
|---|---|---|---|
| G1 | "کجا برگزار میشه؟" for the رویداد | reports the `Competition.location`; renders `[[event:ID]]` widget | |
| G2 | "وضعیت ثبت‌نامم چیه؟" as a rejected user | states rejected + the admin's reason; `[[status]]` widget | |
| G3 | Ask about a deadline / online-vs-inperson | answer matches `ai_knowledge`, not invented | |
| G4 | Send 21 messages in a day as one user | 21st blocked (limit counted from Postgres) | |

### H · Notifications & SMS safety
| # | Step | Expected | P/F |
|---|---|---|---|
| H1 | Notification list for any active user | newest-first; unread badge correct | |
| H2 | `liara app logs --app gameland-rehearsal` during a draw + an approval | every SMS line is `[SMS stub] → …` / `provider:'stub'`. **Zero** `kavenegar` lines. If you see one, abort — the key leaked in. | |

### I · Gamenet platform — if in scope
| # | Step | Expected | P/F |
|---|---|---|---|
| I1 | Register a gamenet as an owner | `pending` | |
| I2 | `/admin/gamenets` verify / reject | status + `verified` flip; reject reason surfaced | |
| I3 | Upload gamenet photos | served via `/api/gamenet-photo/<id>`; max 6 | |

### J · Arena («میدون») — if enabled
| # | Step | Expected | P/F |
|---|---|---|---|
| J1 | Create a 1v1 play request (discipline, best-of) | listed in `/arena` | |
| J2 | Book at a **verified** gamenet, both confirm, submit result | capped ranking points applied to both | |

### K · Load / perf at ~2000 users
| # | Step | Expected | P/F |
|---|---|---|---|
| K1 | Home TTFB + payload on mobile throttle | payload ~45 KB; no multi-MB base64 | |
| K2 | `/admin/requests` with a large pending queue | renders; actions responsive | |
| K3 | Leaderboard deep scroll / pagination | no full-table dump; smooth | |
| K4 | Boot time after `clone` (cold hydrate of ~2000 users) | app answers within Liara's start window; `whenReady()` gates auth correctly | |

---

## 5. Re-running the whole draw cycle

To run قرعه‌کشی → final again from a clean slate (keeps users, teams, regs; regs stay `approved`):

```bash
# all events:
npm run rehearsal:reset -- --app gameland-rehearsal --confirm
# or one رشته only:
npm run rehearsal:reset -- --app gameland-rehearsal --comp <eventId> --confirm

liara app restart --app gameland-rehearsal      # REQUIRED — memory is the source of truth
```

Wipes `app_matches` + `app_placements`, zeroes `seeds_earned` / `prelims_completed`
(and global `ranking_points` / `ranking_events` on a full reset). Restart forces
a fresh hydrate.

To go back to a pristine copy of live data, re-run `rehearsal:clone` then `rehearsal:deploy`.

---

## 6. Teardown  *(after sign-off)*

```bash
liara app delete gameland-rehearsal
liara db delete gameland-rehearsal-db
```

Then confirm live is untouched — counts unchanged, no rehearsal artifacts:

```bash
npm run env:prod                                  # sanity: still the real app
# spot-check gamer / registration counts on gamelandteam.ir/admin vs. your notes
```

Delete `.env.local` if you pointed anything local at the rehearsal DB.

---

## 7. Sign-off

| Section | Runner | Date | Result (all P?) | Bugs filed |
|---|---|---|---|---|
| A Auth | | | | |
| B Registration | | | | |
| C Teams | | | | |
| D Draw | | | | |
| E Prelim→Final | | | | |
| F Points parity | | | | |
| G Assistant | | | | |
| H Notif/SMS safety | | | | |
| I Gamenet | | | | |
| J Arena | | | | |
| K Load | | | | |

**Go / No-go for launch:** ­­____________   **by:** ____________   **date:** ____________
