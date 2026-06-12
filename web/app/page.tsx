import Link from 'next/link'
import { competitions, disciplines, placements, players } from '@/lib/seed'
import { computeRanking, TIER_LABEL_FA } from '@/lib/ranking'

export default function HomePage() {
  const efootball = computeRanking({
    players, competitions, placements, disciplineId: 'efootball', windowDays: 7 * 52 * 5,
  })
  const playerMap = new Map(players.map((p) => [p.id, p]))
  const upcoming = competitions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  return (
    <div className="space-y-12">
      <section className="text-center pt-6 pb-2">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          خانهٔ <span className="text-accent">گیمرهای</span> ایران
        </h1>
        <p className="text-muted mt-4 max-w-2xl mx-auto">
          مسابقات حرفه‌ای، رنکینگ ملی پایدار، اطلاع‌رسانی کامل و پروفایل افتخارات هر بازیکن — یک‌جا.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-5">
        <FeatureCard title="رنکینگ ملی" body="امتیاز بر اساس مقام × ردهٔ مسابقه، با پنجرهٔ ۵۲ هفته. شفاف، اعتمادپذیر." />
        <FeatureCard title="موتور مسابقه" body="۶ جدول مقدماتی → فینال ۱۲۸ نفره، با تلاش‌های قابل‌خرید و حداکثر ۳ سهمیه." />
        <FeatureCard title="اطلاع‌رسانی کامل" body="پیامک + درون‌برنامه. زمان، مکان، حریف، روندنمای فردی — بدون پرسش در واتس‌اپ." />
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-bold">رنکینگ ای‌فوتبال</h2>
          <Link href="/leaderboard" className="text-sm text-accent hover:underline">دیدن کامل</Link>
        </div>
        <div className="bg-panel rounded-2xl glow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-muted">
              <tr className="border-b divider">
                <th className="text-right px-5 py-3">رتبه</th>
                <th className="text-right px-5 py-3">بازیکن</th>
                <th className="text-right px-5 py-3">امتیاز</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">مسابقه</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">بهترین</th>
              </tr>
            </thead>
            <tbody>
              {efootball.slice(0, 10).map((e, i) => {
                const p = playerMap.get(e.playerId)
                return (
                  <tr key={e.playerId} className="border-b divider last:border-b-0 hover:bg-bg/40">
                    <td className="px-5 py-3 font-bold">{rankBadge(i + 1)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/players/${e.playerId}`} className="hover:text-accent">
                        <div className="font-semibold">{p?.nickname}</div>
                        <div className="text-xs text-muted">{p?.fullName} · {p?.city}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono">{e.points.toLocaleString('fa-IR')}</td>
                    <td className="px-5 py-3 hidden md:table-cell">{e.events.toLocaleString('fa-IR')}</td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      رتبهٔ {e.bestPlacement.toLocaleString('fa-IR')} · {TIER_LABEL_FA[e.bestTier]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">مسابقات اخیر</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {upcoming.map((c) => {
            const d = disciplines.find((x) => x.id === c.disciplineId)
            return (
              <Link key={c.id} href={`/competitions/${c.id}`}
                    className="bg-panel rounded-2xl p-5 glow hover:ring-1 hover:ring-accent/40 transition">
                <div className="text-xs text-muted">{d?.nameFa} · {TIER_LABEL_FA[c.tier]}</div>
                <div className="text-lg font-bold mt-1">{c.name}</div>
                <div className="text-sm text-muted mt-2">{c.city} · {c.venue}</div>
                {c.prizePoolToman && (
                  <div className="text-sm text-gold mt-3 font-semibold">
                    جایزه: {(c.prizePoolToman / 1_000_000).toLocaleString('fa-IR')} میلیون تومان
                    <span className="text-muted text-xs"> · حامی: {c.sponsorIds.join('، ')}</span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-panel rounded-2xl p-6 glow">
      <div className="text-lg font-bold mb-2">{title}</div>
      <div className="text-sm text-muted leading-7">{body}</div>
    </div>
  )
}

function rankBadge(rank: number) {
  if (rank === 1) return <span className="text-gold">۱</span>
  if (rank === 2) return <span className="text-silver">۲</span>
  if (rank === 3) return <span className="text-bronze">۳</span>
  return <span className="text-muted">{rank.toLocaleString('fa-IR')}</span>
}
