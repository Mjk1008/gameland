import { getEventConfig } from './store'
import { TICKET } from './payment'

// The only place ticket price is resolved. Per-event overrides live in
// EventConfig (store.ts) — undefined means "use the platform default," so
// every existing event is unaffected with no backfill. Every read site that
// used to import TICKET.price / ticketOffPercent directly must call this
// instead (see docs/27-team-format-plan.md §7).
// Split out of payment.ts because it pulls in store.ts → the Postgres client
// (Node built-ins like net/tls/fs) — payment.ts itself must stay importable
// from client components (toman/PAYMENT are used there), so this file is the
// server-only half. Never import this from a 'use client' file.
export function ticketPriceFor(compId: string): { price: number; original: number; offPercent: number } {
  const cfg = getEventConfig(compId)
  const price = cfg.ticketPrice ?? TICKET.price
  const original = cfg.ticketOriginal ?? TICKET.original
  const offPercent = original > price ? Math.round((1 - price / original) * 100) : 0
  return { price, original, offPercent }
}
