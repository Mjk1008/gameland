import Link from 'next/link'
import { notFound } from 'next/navigation'
import { competitions, disciplines, placements, players } from '@/lib/seed'
import { TIER_LABEL_FA, pointsForPlacement } from '@/lib/ranking'
import { buildRoadmap, FINAL_SIZE, MAX_ATTEMPTS_PER_COMPETITION, MAX_SEEDS_TO_FINAL, PRELIM_COUNT } from '@/lib/competition-engine'

export function generateStaticParams() {
  return competitions.map((c) => ({ id: c.id }))
}

export default function CompetitionPage({ params }: { params: { id: string } }) {
  const c = competitions.find((x) => x.id === params.id)
  if (!c) return notFound()
  const d = disciplines.find((x) => x.id === c.disciplineId)
  const myPlacements = placements.filter((p) => p.competitionId === c.id).sort((a, b) => a.rank - b.rank)
  const playerMap = new Map(players.map((p) => [p.id, p]))

  // Mock per-player roadmap (demo player p001).
  const me = players[0]
  const roadmap = buildRoadmap({
    playerId: me.id,
    competition: c,
    attempts: [],
    seeds: [],
  })

  return (
    <div className="space-y-8">
      <header className="bg-panel rounded-2xl p-6 glow">
        <div className="text-xs text-muted">{d?.nameFa} · {TIER_LABEL_FA[c.tier]} · {c.organizer}</div>
        <h1 className="text-3xl font-extrabold mt-1">{c.name}</h1>
        <div className="text-muted mt-2">{c.date.slice(0, 10)} · {c.city} · {c.venue}</div>
        {c.prizePoolToman && (
          <div className="mt-4 text-gold font-bold">
            🏆 جایزه: {(c.prizePoolToman / 1_000_000).toLocaleString('fa-IR')} میلیون تومان
            <div className="text-xs text-muted font-normal mt-1">
              تأمین جایزه توسط حامیان: {c.sponsorIds.join('، ')} ·
              <span className="text-muted/70"> ورودی مسابقه = هزینهٔ سرویس مهارتی (سکهٔ غیرقابل‌نقد)، نه شرط‌بندی.</span>
            </div>
          </div>
        )}
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <Card title="فرمت" lines={[
          `${PRELIM_COUNT} جدول مقدماتی → فینال ${FINAL_SIZE.toLocaleString('fa-IR')} نفره`,
          'حذفی · هر برد یک قدم به سهمیه',
        ]} />
        <Card title="تلاش‌ها / سهمیه" lines={[
          `حداکثر ${MAX_ATTEMPTS_PER_COMPETITION.toLocaleString('fa-IR')} تلاش برای هر بازیکن`,
          `حداکثر ${MAX_SEEDS_TO_FINAL.toLocaleString('fa-IR')} سهمیه به فینال`,
        ]} />
        <Card title="رنکینگ" lines={[
          `قهرمان: ${pointsForPlacement(1, c.tier).toLocaleString('fa-IR')} امتیاز`,
          `سوم: ${pointsForPlacement(3, c.tier).toLocaleString('fa-IR')} · تاپ-۳۲: ${pointsForPlacement(32, c.tier).toLocaleString('fa-IR')}`,
        ]} />
      </section>

      <section className="bg-panel rounded-2xl p-6 glow">
        <h2 className="text-xl font-bold mb-3">روندنمای من — {me.nickname}</h2>
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <Tile label="تلاش‌های باقی‌مانده" value={`${roadmap.attemptsRemaining.toLocaleString('fa-IR')} از ${MAX_ATTEMPTS_PER_COMPETITION.toLocaleString('fa-IR')}`} />
          <Tile label="سهمیه‌های گرفته‌شده" value={`${roadmap.seeds.length.toLocaleString('fa-IR')} از ${MAX_SEEDS_TO_FINAL.toLocaleString('fa-IR')}`} />
          <Tile label="وضعیت فینال" value={roadmap.qualifiedForFinal ? '✅ راه‌یافته' : '⏳ در تلاش'} />
          <Tile label="قدم بعدی" value={roadmap.nextStep} dim />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">نتایج {myPlacements.length > 0 ? '' : '(در انتظار)'}</h2>
        <div className="bg-panel rounded-2xl glow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted">
              <tr className="border-b divider">
                <th className="text-right px-5 py-3">مقام</th>
                <th className="text-right px-5 py-3">بازیکن</th>
                <th className="text-right px-5 py-3">شهر</th>
                <th className="text-right px-5 py-3">امتیاز کسب‌شده</th>
              </tr>
            </thead>
            <tbody>
              {myPlacements.map((pl) => {
                const p = playerMap.get(pl.playerId)
                return (
                  <tr key={pl.playerId} className="border-b divider last:border-b-0">
                    <td className="px-5 py-3 font-bold">
                      {pl.rank === 1 ? '🏆' : pl.rank === 2 ? '🥈' : pl.rank === 3 ? '🥉' : pl.rank.toLocaleString('fa-IR')}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/players/${pl.playerId}`} className="hover:text-accent font-semibold">{p?.nickname}</Link>
                      <div className="text-xs text-muted">{p?.fullName}</div>
                    </td>
                    <td className="px-5 py-3 text-muted">{p?.city}</td>
                    <td className="px-5 py-3 font-mono text-accent">{pointsForPlacement(pl.rank, c.tier).toLocaleString('fa-IR')}</td>
                  </tr>
                )
              })}
              {myPlacements.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted py-6">نتایج هنوز ثبت نشده.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Card({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="bg-panel rounded-2xl p-5 glow">
      <div className="text-xs text-muted">{title}</div>
      <div className="mt-2 space-y-1 text-sm">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>
    </div>
  )
}

function Tile({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="rounded-xl bg-bg/40 ring-1 ring-muted/20 p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={'mt-1 font-bold ' + (dim ? 'text-sm text-muted' : 'text-lg text-ink')}>{value}</div>
    </div>
  )
}
