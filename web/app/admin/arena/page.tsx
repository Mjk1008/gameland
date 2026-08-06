import { BackHeader, C, DISP } from '@/components/ui'
import { arenaFraudLeaderboard, arenaMonthStats } from '@/lib/arena'
import { getUserById, whenReady } from '@/lib/store'
import { faDigits } from '@/lib/jalali'

export const dynamic = 'force-dynamic'

const fa = (n: number | string) => faDigits(n)

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '12px 14px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, flex: '1 1 140px' }}>
      <div style={{ fontSize: 11, color: C.tmut, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 22, color: C.thi }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.tbody, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AdminArenaPage() {
  const stats = arenaMonthStats()
  const rows = arenaFraudLeaderboard(40)

  return (
    <div className="animate-fade-up">
      <BackHeader title="مانیتور میدون" href="/admin" />
      <div style={{ padding: '0 16px 28px' }}>
        <p style={{ fontSize: 12, color: C.tbody, lineHeight: 2, marginBottom: 12 }}>
          اسنپ‌شات ۳۰ روز — فرض: میدون حدود یک ماه لانچ شده.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          <StatCard label="درخواست کل" value={fa(stats.requestsTotal)} sub={`${fa(stats.uniqueRequesters)} بازیکن منحصربفرد`} />
          <StatCard label="باز الان" value={fa(stats.requestsOpen)} sub={`${fa(stats.citiesWithOpen)} شهر`} />
          <StatCard label="تأیید نهایی" value={fa(stats.matchesConfirmed)} sub={`CCR ${fa(stats.ccrPercent)}%`} />
          <StatCard label="قبول → match" value={fa(stats.matchesTotal)} sub={`${fa(stats.matchesPending)} در صف · ${fa(stats.matchesScheduled)} بوک‌شده`} />
          <StatCard label="منقضی / لغو" value={fa(stats.requestsExpired + stats.requestsCancelled)} sub={`${fa(stats.matchesLapsed)} lapsed`} />
          <StatCard label="بازیکن با بازی OK" value={fa(stats.uniqueWithConfirmed)} />
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.thi, marginBottom: 10 }}>نسبت درخواست به تأیید (fraud watch)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.length === 0 && <div style={{ color: C.tmut, fontSize: 13 }}>هنوز داده‌ای نیست.</div>}
          {rows.map(r => {
            const u = getUserById(r.uid)
            return (
              <div key={r.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
                <span style={{ fontFamily: DISP, fontWeight: 800, color: r.ratio >= 3 ? C.live : C.tbody, minWidth: 36 }}>{r.ratio.toFixed(1)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{u?.name ?? r.uid}</div>
                  <div style={{ fontSize: 11, color: C.tmut }}>@{u?.tag} · {r.requests} req / {r.confirmed} ok</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
