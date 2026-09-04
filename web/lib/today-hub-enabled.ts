// Live Day Hub («امروز») feature gate. Mirrors lib/arena-enabled.ts exactly —
// env-var-only, admin flips it on before a match day and off after. See
// docs/35-live-day-hub-plan.md's gating decision.
export function isTodayHubEnabled(): boolean {
  return process.env.TODAY_HUB_ENABLED === 'true' || process.env.NEXT_PUBLIC_TODAY_HUB_ENABLED === 'true'
}
