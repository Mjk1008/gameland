import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DISC, roadmapStages } from '@/lib/mock-data'
import { getUserById, getRegistration, getEvent, remainingTickets, matchesForComp } from '@/lib/store'
import { C, DISP, Num, StatusChip, BackHeader, Button, DISC_DOT } from '@/components/ui'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:     { label: 'منتظر قرعه', color: C.tmut },
  in_progress: { label: 'در حال بازی', color: C.accent },
  eliminated:  { label: 'حذف شد',      color: C.live },
  seed:        { label: 'به فینال',    color: C.win },
}

export default async function MyRoadmapPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect(`/login?callbackUrl=/competitions/${params.id}/me`)
  const r = getRegistration(uid, params.id)
  if (!r) redirect(`/competitions/${params.id}/register`)
  // buying more سهم stays open until the draw (cap 6 per discipline)
  const canTopUp = matchesForComp(params.id).length === 0 ? remainingTickets(uid, params.id) : 0
  const topUpBtn = canTopUp > 0 ? (
    <Link href={`/competitions/${params.id}/register`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, background: C.goldSoft, border: `1px solid ${C.gold}66`, borderRadius: 12, color: C.gold, fontWeight: 800, fontSize: 13.5 }}>
      + خرید سهمِ بیشتر <span className="gl-num" style={{ opacity: .8 }}>({canTopUp} تا مونده)</span>
    </Link>
  ) : null

  // Not yet approved → payment/approval gate, not the bracket roadmap.
  if (r.status !== 'approved') {
    const rejected = r.status === 'rejected'
    return (
      <div className="animate-fade-up">
        <BackHeader title="مسیر من" href={`/competitions/${c.id}`} />
        <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.thi }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 2 }}>{DISC[c.disc]?.name}</div>
            </div>
          </div>
          <div style={{ background: C.sf1, border: `1px solid ${rejected ? C.live : C.accent}55`, borderRadius: 14, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: rejected ? C.live : C.accent, marginBottom: 8 }}>
              {rejected ? 'ثبت‌نامت رد شد' : 'منتظر تایید پرداخت'}
            </div>
            <div style={{ fontSize: 13, color: C.tbody, lineHeight: 1.9 }}>
              {rejected
                ? 'فکر می‌کنی اشتباه شده؟ با پشتیبانی حرف بزن تا بررسی کنیم.'
                : 'مبلغ رو کارت‌به‌کارت کن و رسیدش رو بفرست. بعد از تایید ادمین، براکت و مسیر مسابقه‌ت همین‌جا فعال می‌شه.'}
            </div>
          </div>
          {!rejected && <Button href={`/competitions/${c.id}/pay`}>پرداخت و ارسال رسید ›</Button>}
          {!rejected && topUpBtn}
        </div>
      </div>
    )
  }

  const roadmap = roadmapStages(c.status)
  const attempts: Array<{ idx: number; status: keyof typeof STATUS_META }> = []
  for (let i = 0; i < r.attempts; i++) {
    let s: keyof typeof STATUS_META = 'pending'
    if (i < r.seedsEarned) s = 'seed'
    else if (i < r.prelimsCompleted) s = 'eliminated'
    else if (c.status === 'live' && i === r.prelimsCompleted) s = 'in_progress'
    attempts.push({ idx: i + 1, status: s })
  }

  return (
    <div className="animate-fade-up">
      <BackHeader title="مسیر من" href={`/competitions/${c.id}`} />

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: DISC_DOT[c.disc] ?? C.tmut, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.thi }}>{c.title}</div>
            <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 2 }}>{DISC[c.disc]?.name}</div>
          </div>
          <StatusChip status={c.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          <Tile label="بلیط‌هام" value={r.attempts} color={C.accent} />
          <Tile label="seed به فینال" value={r.seedsEarned} color={C.gold} />
          <Tile label="بازی‌شده" value={r.prelimsCompleted} color={C.tbody} />
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.thi, marginBottom: 10 }}>براکت‌های مقدماتی من</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {attempts.map(a => {
              const m = STATUS_META[a.status]
              return (
                <div key={a.idx} style={{ padding: 12, background: C.sf1, border: `1px solid ${m.color}55`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span className="gl-num" style={{ fontSize: 11, color: C.tmut }}>#{a.idx}</span>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: m.color }}>{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.thi, marginBottom: 12 }}>مراحل مسابقه</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {roadmap.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 13, minHeight: 48 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.sf1, border: `2px solid ${C.accent}`, marginTop: 4 }} />
                  {i < roadmap.length - 1 && <div style={{ flex: 1, width: 2, background: C.line }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 13px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.thi }}>{s.stage}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.tmut }}>{s.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {topUpBtn}
        <Button href={`/competitions/${c.id}/bracket`} kind="secondary">مشاهدهٔ کامل براکت ›</Button>
      </div>
    </div>
  )
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <Num size={24} color={color}>{value}</Num>
      <span style={{ fontSize: 10, color: C.tmut }}>{label}</span>
    </div>
  )
}
