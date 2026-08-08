// Shared date-range parsing for /admin/behavior and export.

export type BehaviorRange = {
  sinceMs: number
  untilMs: number | undefined
  days: number
  label: string
  prevSince: number
  prevUntil: number | undefined
  chartDays: number
  compare: boolean
}

export function parseBehaviorRange(params: {
  bdays?: string
  bfrom?: string
  bto?: string
}, now = Date.now()): BehaviorRange {
  const bfrom = params.bfrom?.trim()
  const bto = params.bto?.trim()

  if (params.bdays === 'custom' && !(bfrom && bto)) {
    // custom mode selected but dates not applied yet — fall back to 30d
  } else if (bfrom && bto) {
    const from = new Date(bfrom + 'T00:00:00').getTime()
    const to = new Date(bto + 'T23:59:59').getTime()
    if (!Number.isNaN(from) && !Number.isNaN(to) && to >= from) {
      const span = to - from + 1
      const days = Math.max(1, Math.ceil(span / 86400000))
      return {
        sinceMs: from,
        untilMs: to + 1,
        days,
        label: `${bfrom} تا ${bto}`,
        prevSince: from - span,
        prevUntil: from,
        chartDays: Math.min(days, 90),
        compare: true,
      }
    }
  }

  const key = params.bdays ?? 'all'
  if (key === 'all') {
    return {
      sinceMs: 0,
      untilMs: undefined,
      days: 0,
      label: 'کل دوره',
      prevSince: 0,
      prevUntil: undefined,
      chartDays: 90,
      compare: false,
    }
  }

  const days = key === '7' ? 7 : key === '90' ? 90 : 30
  const sinceMs = now - days * 86400000
  return {
    sinceMs,
    untilMs: undefined,
    days,
    label: `${days} روز اخیر`,
    prevSince: now - days * 2 * 86400000,
    prevUntil: sinceMs,
    chartDays: Math.min(days, 90),
    compare: true,
  }
}

export function behaviorRangeQuery(range: BehaviorRange, city: string, disc: string, extra?: Record<string, string>) {
  const p = new URLSearchParams()
  if (range.sinceMs > 0 && range.untilMs) {
    p.set('bdays', 'custom')
    const from = new Date(range.sinceMs)
    const to = new Date((range.untilMs ?? Date.now()) - 1)
    p.set('bfrom', from.toISOString().slice(0, 10))
    p.set('bto', to.toISOString().slice(0, 10))
  } else if (range.days === 0) {
    p.set('bdays', 'all')
  } else {
    p.set('bdays', String(range.days))
  }
  p.set('bcity', city)
  p.set('bdisc', disc)
  if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v)
  return p.toString()
}
