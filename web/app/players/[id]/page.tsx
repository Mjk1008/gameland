import Link from 'next/link'
import { notFound } from 'next/navigation'
import { competitions, disciplines, placements, players } from '@/lib/seed'
import { computeRanking, honorsFor, TIER_LABEL_FA, titleCounts } from '@/lib/ranking'

export function generateStaticParams() {
  return players.map((p) => ({ id: p.id }))
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const p = players.find((x) => x.id === params.id)
  if (!p) return notFound()
  const honors = honorsFor(p.id, competitions, placements)
  const t = titleCounts(honors)
  const ranks = computeRanking({
    players, competitions, placements, disciplineId: 'efootball', windowDays: 7 * 52 * 5,
  })
  const myRankIndex = ranks.findIndex((r) => r.playerId === p.id)
  const myEntry = myRankIndex >= 0 ? ranks[myRankIndex] : undefined

  return (
    <div className="space-y-8">
      <div className="bg-panel rounded-2xl p-6 glow flex flex-col md:flex-row gap-6">
        <div className="w-24 h-24 rounded-2xl bg-accent/15 ring-1 ring-accent/40 grid place-items-center text-3xl font-extrabold text-accent">
          {p.nickname.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold">{p.nickname}</h1>
          <div className="text-muted mt-1">{p.fullName} · {p.city}{p.province && ` · ${p.province}`}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {p.disciplines.map((dId) => {
              const d = disciplines.find((x) => x.id === dId)
              return <span key={dId} className="px-2 py-1 rounded-full bg-bg/60 ring-1 ring-muted/30">{d?.nameFa ?? dId}</span>
            })}
            {p.playStyle && <span className="px-2 py-1 rounded-full bg-bg/60 ring-1 ring-muted/30">سبک: {p.playStyle}</span>}
          </div>
          {p.bio && <p className="text-sm text-muted mt-4 leading-7">{p.bio}</p>}
        </div>
        {myEntry && (
          <div className="text-left md:text-right">
            <div className="text-xs text-muted">رتبهٔ فعلی · ای‌فوتبال</div>
            <div className="text-4xl font-extrabold text-accent">{(myRankIndex + 1).toLocaleString('fa-IR')}</div>
            <div className="text-sm font-mono text-muted">{myEntry.points.toLocaleString('fa-IR')} امتیاز</div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="قهرمانی‌ها" value={t.champion} accent="gold" />
        <Stat label="نایب‌قهرمانی" value={t.runnerUp} accent="silver" />
        <Stat label="سوم" value={t.third} accent="bronze" />
        <Stat label="حضور در تاپ-۸" value={t.top8} accent="accent" />
      </div>

      <section>
        <h2 className="text-xl font-bold mb-3">صفحهٔ افتخارات</h2>
        <div className="bg-panel rounded-2xl glow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted">
              <tr className="border-b divider">
                <th className="text-right px-5 py-3">مسابقه</th>
                <th className="text-right px-5 py-3">تاریخ</th>
                <th className="text-right px-5 py-3">رده</th>
                <th className="text-right px-5 py-3">مقام</th>
              </tr>
            </thead>
            <tbody>
              {honors.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted py-6">هنوز افتخاری ثبت نشده.</td></tr>
              )}
              {honors.map((h) => (
                <tr key={h.competitionId} className="border-b divider last:border-b-0">
                  <td className="px-5 py-3">
                    <Link href={`/competitions/${h.competitionId}`} className="hover:text-accent font-semibold">
                      {h.competitionName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{h.date.slice(0, 10)}</td>
                  <td className="px-5 py-3 text-muted">{TIER_LABEL_FA[h.tier]}</td>
                  <td className="px-5 py-3 font-bold">
                    {h.rank === 1 ? <span className="text-gold">🏆 قهرمان</span>
                      : h.rank === 2 ? <span className="text-silver">🥈 نایب‌قهرمان</span>
                      : h.rank === 3 ? <span className="text-bronze">🥉 سوم</span>
                      : <span>رتبهٔ {h.rank.toLocaleString('fa-IR')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: 'gold'|'silver'|'bronze'|'accent' }) {
  const cls = { gold: 'text-gold', silver: 'text-silver', bronze: 'text-bronze', accent: 'text-accent' }[accent]
  return (
    <div className="bg-panel rounded-2xl p-5 glow">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-3xl font-extrabold mt-1 ${cls}`}>{value.toLocaleString('fa-IR')}</div>
    </div>
  )
}
