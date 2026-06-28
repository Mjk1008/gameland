import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DISC, avatarBg } from '@/lib/mock-data'
import { getEvent, matchesForComp, getUserById } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default function BracketPage({ params }: { params: { id: string } }) {
  const c = getEvent(params.id)
  if (!c) return notFound()
  const d = DISC[c.disc as keyof typeof DISC] ?? { name: c.disc, short: c.disc.slice(0, 4).toUpperCase(), color: '#94a3b8' }

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
        <Header c={c}/>
        <div style={{ padding: '14px 16px 28px' }}>
          <Info text="قرعه‌کشی انجام شده. مسابقات زیر آماده‌اند."/>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {Object.entries(byBracket).sort((a, b) => Number(a[0]) - Number(b[0])).map(([bIdx, rounds]) => (
              <div key={bIdx}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>براکت {bIdx}</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{Object.keys(rounds).length} مرحله</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0])).map(([rIdx, ms]) => (
                    <div key={rIdx}>
                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 5 }} dir="ltr">Round {rIdx}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ms.map(m => <MatchRow key={m.id} m={m} d={d}/>)}
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

  // Not drawn yet — show empty numbered slots
  const BRACKET_COUNT = 6
  const SLOTS_PER_BRACKET = 4

  return (
    <div className="animate-fade-up">
      <Header c={c}/>
      <div style={{ padding: '14px 16px 28px' }}>
        <Info text="هنوز قرعه‌کشی انجام نشده. پس از ثبت‌نام‌ها، ادمین قرعه‌کشی رو انجام می‌ده."/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
          {Array.from({ length: BRACKET_COUNT }, (_, bi) => (
            <div key={bi}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>براکت {bi + 1}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>{SLOTS_PER_BRACKET} نفر · حذفی تک</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <EmptySlot label={`${bi * SLOTS_PER_BRACKET + 1}`}/>
                  <EmptySlot label={`${bi * SLOTS_PER_BRACKET + 2}`}/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: '#475569' }}>
                  <Line/><Line/>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <EmptySlot label={`${bi * SLOTS_PER_BRACKET + 3}`}/>
                  <EmptySlot label={`${bi * SLOTS_PER_BRACKET + 4}`}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Header({ c }: { c: any }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
      <Link href={`/competitions/${c.id}`} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </Link>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>براکت — {c.title}</span>
    </div>
  )
}
function Info({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, padding: '10px 12px', background: '#121821', border: '1px solid #1e293b', borderRadius: 11 }}>{text}</div>
}
function MatchRow({ m, d }: { m: any; d: any }) {
  const p1 = m.p1UserId ? getUserById(m.p1UserId) : null
  const p2 = m.p2UserId ? getUserById(m.p2UserId) : null
  const winner = m.winnerUserId
  return (
    <div style={{ background: '#121821', border: '1px solid ' + (m.status === 'done' ? '#34d39955' : m.status === 'ready' ? '#22d3ee55' : '#1e293b'), borderRadius: 11, padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <UserCell u={p1} isWinner={winner === m.p1UserId} d={d}/>
        <span style={{ fontSize: 10, color: '#64748b' }} dir="ltr">{m.score ?? 'vs'}</span>
        <UserCell u={p2} isWinner={winner === m.p2UserId} d={d}/>
      </div>
    </div>
  )
}
function UserCell({ u, isWinner, d }: { u: any; isWinner: boolean; d: any }) {
  if (!u) return <span style={{ fontSize: 11, color: '#475569', flex: 1, textAlign: 'center' }}>TBD</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, opacity: isWinner ? 1 : 0.7 }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, background: avatarBg(d.color), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 10, color: d.color }}>{u.tag[0]}</span>
      </div>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: isWinner ? 700 : 500, color: isWinner ? '#22d3ee' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{u.tag}</span>
    </div>
  )
}
function EmptySlot({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#0b0f14', border: '1px dashed #1e293b', borderRadius: 9, opacity: 0.5 }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 11, color: '#475569' }}>{label}</span>
      </div>
      <span style={{ fontSize: 11, color: '#334155' }}>در انتظار قرعه‌کشی</span>
    </div>
  )
}
function Line() { return <div style={{ width: 14, height: 1.5, background: '#334155' }}/> }
