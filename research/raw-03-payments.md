# RAW — Iran Payments & Monetization Constraints (research agent 3)

> Preserved for traceability. Synthesized into [`../docs/02-market-data.md`](../docs/02-market-data.md) §3 + [`../docs/10-business-model.md`](../docs/10-business-model.md).

## 1. International rails — ALL dead [H]
Stripe, PayPal, Visa, Mastercard, Amex, SWIFT (15+ banks designated), Apple Pay, Google Pay — all unavailable to Iranian businesses (OFAC sanctions). UnionPay/Mir links exist only for inbound tourists, not for charging foreign customers.

## 2. Domestic: Shaparak / Shetab [H]
- **Shetab** = national interbank switch (2002, all 26 banks, ~57k ATMs). **Shaparak** = card-payment oversight (CBI, 50B+ tx/yr).
- Flow: pay → PSP redirect → enter Shetab card + OTP → Shaparak → Shetab → bank auth → ~3s round-trip. Settlement T+1.
- Debit cards only (no consumer credit cards; interest-prohibiting banking). Denominated Toman/Rial.

## 3. Gateways (درگاه پرداخت) [M]
| Gateway | Fee | Cap (Toman) |
|---|---|---|
| **ZarinPal** | 1% | ~3–4k (ZarinLink flat 200) |
| **NextPay** | 1% | **800 (lowest)**, 45-day free |
| **IDPay** | fixed tiers | 100–3,000 |
| **Zibal** | 0.5–1% | 4–6k |
| **Pay.ir** | 1% | 7k |
| **Vandar** | 1% | 4k |
| **Jibit** | 0.5% | 2k |
| Behpardakht Mellat (bank-direct) | 0 | — |
- Caps are tiny in USD (~$0.02–0.17). Two types: direct (bank PSP, lower fee, 3–30 days, eNamad required) vs intermediary (واسط, fast onboard).

## 4. Requirements to get a gateway [H]
1. Iranian national ID / registered company. 2. Iranian bank account + Shaba (IBAN). 3. Tax tracking code (کد رهگیری مالیاتی). 4. **eNamad (نماد اعتماد الکترونیکی)** — e-commerce trust badge, 38 conditions, mandatory for online sales. 5. **Samandehi (ساماندهی)** — content/domain licensing (distinct from eNamad). 6. Public-WHOIS .ir or .com domain.
- **Games sold online must first get IRCG license** [H].
- NextPay & ZarinPal reportedly work WITHOUT eNamad for lower tier [M, verify].

## 5. Mobile IAP
- **Google Play & App Store billing dead for Iran** [H] (Iranian apps even removed 2023). Android ~84% of market.
- **Cafe Bazaar (کافه‌بازار):** 56M users, 124k games, ~90–97% domestic Android share, 46M+ tx (2023). **IAP 30%** (dev keeps 70%) [M, 2017 figure]. Sold to Tapsell Jan 2025.
- **Myket (مایکت):** 40–55M installs, ~26M MAU. **IAP 15%** (since May 2021) [M]. No yearly dev fee.
- **iOS: no viable domestic IAP path** [H]. TestFlight/sideload only.

## 6. Wallet / coin (کیف‌پول / سکه) — standard pattern [H]
- Iranian apps use internal coin/diamond (سکه/الماس): user buys a bundle via Shaparak once → spends coins internally (no per-micro-tx gateway fee, smooth UX).
- Examples: Digipay (Digikala), Hamrah Card (16M+), Divar wallet (Oct 2024 B2B ad credit), all mobile games.
- **Non-convertible coins = NOT regulated as crypto.** If cashable-out/tradeable → grey/regulated. [M]

## 7. Crypto — banned for domestic payments [H]
CBI (Dec 2025): crypto/gold for payment "forbidden." Fiat↔crypto via Shaparak blocked since late 2024. Crypto ads banned Feb 2025. Mining legal (must sell to CBI). ~22% own crypto; USDT dominant; $7.78B on-chain 2025. **Cannot legally use crypto for tickets/store.**

## Constraint map
Shaparak gateways = primary path. Wallet/coin = micropayment layer (maps to Smoothcomp per-athlete credit). Android IAP via Bazaar(30%)/Myket(15%); web/PWA avoids store tax. iOS none. Crypto/international = off-limits.

## Sources
irun2iran, jeecart, cs-cart, en.wikipedia (Shetab/Shaparak/Cafe_Bazaar/Cryptocurrency_in_Iran/Virtual_currency_law_in_Iran), linkedin Yaghmaee, incopars, qorfechi, rayanmoshaver, polam.io, arenalearn, parspack, iranbestlawyer, myindustry, techrasa (eNamad), ideaagency (CafeBazaar 2023), azernews, intellinews (Tapsell), myket.ir/kb, crystalintelligence, aljazeera (crypto), aimgroup (Divar wallet), iranintl/arabnews (apps removed), en.ircg.ir (game licensing), ezeepayment.
