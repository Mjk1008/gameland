import Link from 'next/link'
import { competitions, disciplines } from '@/lib/seed'
import { TIER_LABEL_FA } from '@/lib/ranking'

export default function CompetitionsIndex() {
  const sorted = competitions.slice().sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">تقویم مسابقات</h1>
      <div className="grid md:grid-cols-2 gap-5">
        {sorted.map((c) => {
          const d = disciplines.find((x) => x.id === c.disciplineId)
          return (
            <Link key={c.id} href={`/competitions/${c.id}`}
                  className="bg-panel rounded-2xl p-5 glow hover:ring-1 hover:ring-accent/40 block">
              <div className="text-xs text-muted">{d?.nameFa} · {TIER_LABEL_FA[c.tier]}</div>
              <div className="text-lg font-bold mt-1">{c.name}</div>
              <div className="text-sm text-muted mt-2">{c.date.slice(0,10)} · {c.city} · {c.venue}</div>
              {c.prizePoolToman && (
                <div className="text-sm text-gold mt-3 font-semibold">
                  جایزه: {(c.prizePoolToman / 1_000_000).toLocaleString('fa-IR')}M ﺗﻮﻣﺎن · حامی: {c.sponsorIds.join('، ')}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
