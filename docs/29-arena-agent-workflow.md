# 29 — Arena («میدون») Agent Workflow

**Goal:** ship Phases A′→F locally testable; **Phase G (Liara deploy) is human gate.**

| Agent / owner | Phases | Deliverable |
|---------------|--------|-------------|
| **Schema agent** | A | `init.sql`, `persistence.ts` self-heal, `schema.ts`, `arena-config.ts`, `arena-slots.ts` |
| **Data agent** | B | `lib/arena.ts` + `persist.playRequest/playMatch` |
| **API agent** | C | `app/api/arena/**` routes |
| **UI agent** | D | `/arena/*`, `/me/arena`, components |
| **Ranking agent** | D′ | `challengePointsOf` @ 4 call sites + profile breakdown |
| **Notify agent** | E | `pushNotif` wiring in arena handlers |
| **Admin agent** | F | `/admin/arena` + behavior funnel |
| **Analytics agent** | A′ | `track()` events + `/admin/behavior` arena block |
| **QA / founder** | G | `ARENA_ENABLED=true` local → Liara deploy |

**Sequence:** A′ ∥ A → B → C → (D ∥ D′) → E → F → local QA → G

**Stop gate:** accept rate not measured until real users; code gate = manual QA checklist in `28-challenge-ladder-build-plan.md`.
