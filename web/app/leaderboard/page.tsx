import Link from 'next/link'
import { competitions, disciplines, placements, players } from '@/lib/seed'
import { computeRanking, TIER_LABEL_FA } from '@/lib/ranking'

export default function LeaderboardPage() {
  const ranks = computeRanking({
    players, competitions, placements, disciplineId: 'efootball', windowDays: 7 * 52 * 5,
  })
  const playerMap = new Map(players.map((p) => [p.id, p]))

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold">رنکینگ ملی · ای‌فوتبال</h1>
        <p className="text-muted mt-2">
          امتیاز = مقام × ضریب ردهٔ مسابقه (ماژور ۱.۰ · گیم‌لند ۰.۸ · آل‌استار ۰.۵ · محلی ۰.۳). پنجرهٔ غلتان ۵۲ هفته.
        </p>
      </header>

      <div className="flex gap-3 text-sm">
        {disciplines.map((d) => (
          <span key={d.id}
                className={'px-3 py-1.5 rounded-full ring-1 ' +
                  (d.id === 'efootball' ? 'bg-accent/10 ring-accent/40 text-accent' : 'ring-muted/30 text-muted')}>
            {d.nameFa}
          </span>
        ))}
      </div>

      <div className="bg-panel rounded-2xl glow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-muted">
            <tr className="border-b divider">
              <th className="text-right px-5 py-3">رتبه</th>
              <th className="text-right px-5 py-3">بازیکن</th>
              <th className="text-right px-5 py-3">شهر</th>
              <th className="text-right px-5 py-3">سبک</th>
              <th className="text-right px-5 py-3">امتیاز</th>
              <th className="text-right px-5 py-3">مسابقه</th>
              <th className="text-right px-5 py-3">بهترین مقام</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map((e, i) => {
              const p = playerMap.get(e.playerId)!
              return (
                <tr key={e.playerId} className="border-b divider last:border-b-0 hover:bg-bg/40">
                  <td className="px-5 py-3 font-bold">{(i + 1).toLocaleString('fa-IR')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/players/${e.playerId}`} className="hover:text-accent">
                      <div className="font-semibold">{p.nickname}</div>
                      <div className="text-xs text-muted">{p.fullName}</div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{p.city}</td>
                  <td className="px-5 py-3 text-muted">{p.playStyle}</td>
                  <td className="px-5 py-3 font-mono text-accent">{e.points.toLocaleString('fa-IR')}</td>
                  <td className="px-5 py-3">{e.events.toLocaleString('fa-IR')}</td>
                  <td className="px-5 py-3 text-muted">
                    رتبهٔ {e.bestPlacement.toLocaleString('fa-IR')} · {TIER_LABEL_FA[e.bestTier]}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        تساوی‌شکن‌ها: تعداد مسابقات بیشتر ← بهترین مقام ← آخرین قهرمانی. هیچ بازیکنی نمی‌تواند با پرداخت امتیاز بخرد.
      </p>
    </div>
  )
}
