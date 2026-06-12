# 13 — Data Intake Spec (Phase 0)

**Purpose:** the exact data needed from Gameland's existing records to bootstrap **Ranking** + **Gamer Bank**. Any format works (Excel / Google Sheet / CSV / even screenshots) — these are just the fields to map onto.

> The richest Gameland data is **yours** (competition history + player records), not public. Send what you have; missing columns are fine — we fill over time.

## Sheet A — Players (one row per gamer)
| field | فارسی | required? | example |
|---|---|---|---|
| `nickname` | نیک‌نیم / گیمرتگ | ✅ | "NimaPro" |
| `full_name` | نام کامل | ✅ | "نیما صادقی" |
| `phone` | موبایل (شناسهٔ یکتا) | ✅ (for identity/anti-multi-account) | 0912… |
| `city` / `province` | شهر / استان | ⬜ | تهران |
| `disciplines` | بازی‌ها (با کاما) | ✅ | "eFootball, EA FC" |
| `play_style` | سبک بازی | ⬜ | حمله‌ای |
| `photo` | عکس (لینک/فایل) | ⬜ | nima.jpg |
| `notes` | توضیح | ⬜ | — |

## Sheet B — Competitions (one row per event)
| field | فارسی | required? | example |
|---|---|---|---|
| `competition_id` | شناسهٔ مسابقه | ✅ | C-2024-07 |
| `name` | نام | ✅ | "جام تابستان" |
| `discipline` | بازی | ✅ | eFootball |
| `date` | تاریخ | ✅ | 1403/05/12 |
| `city` / `venue` | شهر / مکان (گیم‌نت؟) | ⬜ | تهران |
| `tier` | رده | ✅ | major / all-star / regular |
| `organizer` | برگزارکننده | ⬜ | Gameland / IRCG / … |
| `format` | فرمت | ⬜ | knockout / 6-prelim+final |

## Sheet C — Results (one row per player × competition)
| field | فارسی | required? | example |
|---|---|---|---|
| `competition_id` | شناسهٔ مسابقه | ✅ | C-2024-07 |
| `nickname` | بازیکن (مطابق Sheet A) | ✅ | NimaPro |
| `placement` | مقام | ✅ | 1 |
| `bracket` | جدول (مقدماتی/فینال) | ⬜ | final |
| `wins` / `losses` | برد / باخت | ⬜ | 6 / 1 |

## Ranking computation (what the data enables)
`player_points (per discipline) = Σ over events in the ranking window of points(tier, placement) × tier_multiplier`

**Points by tier × placement** (from the brief; tunable):
| placement | major | all-star | regular(≈800) |
|---|---|---|---|
| 1st | 1000 | 500 | 800 |
| 2nd | 800 | 300 | 640 |
| 3rd | 500 | 150 | 400 |
| … | (curve to 64/128) | top-32 = 30 | scaled |

→ Leaderboard per discipline (top ranked featured + everyone listed), and each player's **honors page** auto-built from Sheets A+C.

## How to send
Drop the 3 sheets (or whatever subset you have) — even a messy export. I'll clean, dedupe (multi-account check on `phone`), structure into this schema, and produce the first ranking + sample Gamer Bank profiles.
