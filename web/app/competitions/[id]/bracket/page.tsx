import { notFound } from 'next/navigation'
import { getEvent, matchesForComp, getUserById } from '@/lib/store'
import { C, DISP, BackHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function BracketPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()

  const real = matchesForComp(c.id)
  const drawn = real.length > 0

  if (drawn) {
    const byBracket: Record<number, Record<number, typeof real>> = {}
    for (const m of real) {
      byBracket[m.bracket] ??= {}
      byBracket[m.bracket][m.round] ??= []
      byBracket[m.bracket][m.round].push(m)
    }
    return (
      <div className="animate-fade-up">
        <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
        <div style={{ padding: '14px 16px 28px' }}>
          <Info text="قرعه‌کشی انجام شده — بازی‌های زیر آماده‌ان." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {Object.entries(byBracket).sort((a, b) => Number(a[0]) - Number(b[0])).map(([bIdx, rounds]) => (
              <div key={bIdx}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>براکت {bIdx}</span>
                  <span style={{ fontSize: 10, color: C.tmut }}>{Object.keys(rounds).length} مرحله</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0])).map(([rIdx, ms]) => (
                    <div key={rIdx}>
                      <div className="gl-label" style={{ fontSize: 10, color: C.tmut, marginBottom: 5 }}>Round {rIdx}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ms.map(m => <MatchRow key={m.id} m={m} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const BRACKET_COUNT = 6, SLOTS = 4
  return (
    <div className="animate-fade-up">
      <BackHeader title={`براکت — ${c.title}`} href={`/competitions/${c.id}`} />
      <div style={{ padding: '14px 16px 28px' }}>
        <Info text="هنوز قرعه‌کشی نشده. بعد از بسته‌شدن ثبت‌نام‌ها، ادمین قرعه‌کشی رو انجام می‌ده." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
          {Array.from({ length: BRACKET_COUNT }, (_, bi) => (
            <div key={bi}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>براکت {bi + 1}</span>
                <span style={{ fontSize: 10, color: C.tmut }}>{SLOTS} نفر · حذفی تک</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><EmptySlot n={bi * SLOTS + 1} /><EmptySlot n={bi * SLOTS + 2} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}><Line /><Line /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><EmptySlot n={bi * SLOTS + 3} /><EmptySlot n={bi * SLOTS + 4} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Info({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: C.tbody, marginBottom: 14, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 11 }}>{text}</div>
}
function MatchRow({ m }: { m: any }) {
  const p1 = m.p1UserId ? getUserById(m.p1UserId) : null
  const p2 = m.p2UserId ? getUserById(m.p2UserId) : null
  const w = m.winnerUserId
  const border = m.status === 'done' ? C.win + '55' : m.status === 'ready' ? C.accent + '55' : C.line
  return (
    <div style={{ background: C.sf1, border: `1px solid ${border}`, borderRadius: 11, padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <UserCell u={p1} win={w === m.p1UserId} />
        <span className="gl-num" style={{ fontSize: 11, color: C.tmut }}>{m.score ?? 'vs'}</span>
        <UserCell u={p2} win={w === m.p2UserId} />
      </div>
    </div>
  )
}
function UserCell({ u, win }: { u: any; win: boolean }) {
  if (!u) return <span style={{ fontSize: 11, color: C.tmut, flex: 1, textAlign: 'center' }}>TBD</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, opacity: win ? 1 : 0.65 }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 10, color: win ? C.accent : C.tbody }}>{u.tag[0]?.toUpperCase()}</span>
      </div>
      <span dir="ltr" style={{ fontFamily: DISP, fontSize: 12, fontWeight: win ? 700 : 500, color: win ? C.accent : C.tbody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.tag}</span>
    </div>
  )
}
function EmptySlot({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.ink, border: `1px dashed ${C.line}`, borderRadius: 9 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="gl-num" style={{ fontWeight: 700, fontSize: 11, color: C.tmut }}>{n}</span>
      </div>
      <span style={{ fontSize: 11, color: C.tmut }}>در انتظار قرعه‌کشی</span>
    </div>
  )
}
function Line() { return <div style={{ width: 14, height: 1.5, background: C.line2 }} /> }
