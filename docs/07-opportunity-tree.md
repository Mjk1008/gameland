# 07 — Opportunity-Solution Tree

**Stage:** Idea · **Framework:** Teresa Torres OST · **Status:** ✅ v1 (prioritized with data).

```
OUTCOME: a trusted, growing home for competitive gaming in Iran
         (active players ↑, community retained, gamenets networked)
│
├─ OPP-A  Competition info is chaotic (WhatsApp overload)            [WEDGE]
│    ├─ pro notification system (SMS-first, low-bandwidth)
│    ├─ per-player bracket roadmap ("my path / who I face")
│    └─ annual competition calendar
│
├─ OPP-B  Wins don't persist / no gamer identity                    [WEDGE]
│    ├─ Gamer Bank (rich profile)
│    ├─ honors/achievements page (amateur, self-serve)
│    └─ persistent NATIONAL ranking (offline-first points)
│
├─ OPP-C  Offline events are hard to run fairly & legally           [ENABLER]
│    ├─ competition engine: 6 prelim brackets + entry attempts
│    │     ⚠ re-architected: skill-service entry, SPONSOR-funded prizes  [11-R1/R2]
│    ├─ multi-account integrity (identity-at-registration, not kernel AC)
│    └─ deterministic/free seeding (not paid raffle)                 [11-R5]
│
├─ OPP-D  Community is disconnected from venues                     [MOAT]
│    ├─ gamenet directory + profiles
│    ├─ gamenet hosting/booking tools + discovery
│    └─ talent scouting / call-outs (استعدادیابی)
│
└─ OPP-E  No commerce / support loop                                [LATER]
     ├─ store/marketplace (IRCG-licensed games, controllers)
     └─ AI support bot (replaces repetitive Q&A)
```

## Prioritization (RICE-style, qualitative)
| Opp | Reach | Impact | Confidence | Effort | Verdict |
|---|---|---|---|---|---|
| **A** info/notifications | High | High | High | Low–Med | **MVP** |
| **B** identity + ranking | High | High | High | Med | **MVP** |
| **C** legal competition engine | Med | High | **Med** (legal gate) | High | **MVP-after-legal** |
| **D** gamenet network | Med (B2B) | High (moat+revenue) | Med | Med | **Phase 2** |
| **E** store + bot | Med | Med | Low | Med–High | **Phase 3+** |

## Why this order
A+B deliver **immediate, legally-safe value** (info + identity + ranking need no prize money) → builds the audience while **C's legal model is finalized**. D is the **defensible moat + stable B2B revenue**. E monetizes/serves once the network exists. The **legal gate (R1/R2) sits in front of C**, not in front of A/B — so we can ship value without touching the gambling line.
