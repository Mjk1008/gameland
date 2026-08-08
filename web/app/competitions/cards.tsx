import Link from 'next/link'
import type { Event, Registration } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { C, Num, StatusChip, DISC_DOT } from '@/components/ui'

const REG_STATE: Record<string, { label: string; c: string; s: string }> = {
  approved: { label: 'ثبت‌نامت تاییده', c: C.win, s: C.winSoft },
  pending:  { label: 'در انتظار تایید', c: C.gold, s: C.goldSoft },
  rejected: { label: 'ثبت‌نام رد شد', c: C.live, s: C.liveSoft },
}

const bodyBg = 'linear-gradient(160deg, rgba(56,48,38,.92), rgba(24,20,15,.96))'
const cardShell: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', display: 'block', borderRadius: 18, overflow: 'hidden',
  transform: 'translateZ(0)', boxShadow: '0 10px 34px -18px rgba(0,0,0,.8)',
}

// Banner (16:9) — coverSrc should come from resolveEventCardCover / resolveCompetitionCardCover.
function Banner({ disc, coverSrc, title, sub, status, discColor }: { disc?: string; coverSrc?: string; title: string; sub?: string; status?: string; discColor: string }) {
  const img = coverSrc
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', background: `linear-gradient(135deg, ${discColor}, ${discColor}55)` }}>
      {img && <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,17,13,.05) 0%, rgba(20,17,13,.35) 50%, rgba(20,17,13,.94) 100%)' }} />
      {status && <div style={{ position: 'absolute', top: 12, insetInlineStart: 12 }}><StatusChip status={status} /></div>}
      <div style={{ position: 'absolute', insetInlineStart: 14, insetInlineEnd: 14, bottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.thi, textShadow: '0 2px 10px rgba(0,0,0,.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', opacity: .85, marginTop: 2, textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// One discipline (child Event) — banner + prize/capacity/format + reg state.
export function DisciplineCard({ ev, reg, coverSrc }: { ev: Event; reg?: Registration; coverSrc?: string }) {
  // days-to-start countdown — shown only when a real future start time exists
  const daysToStart = ev.startsAt && ev.startsAt > Date.now() ? Math.max(1, Math.ceil((ev.startsAt - Date.now()) / 86400000)) : null
  const d = DISC[ev.disc as keyof typeof DISC]
  const discColor = DISC_DOT[ev.disc] ?? C.accent
  const cap = ev.maxPlayers ?? ev.teams
  const rs = reg ? REG_STATE[reg.status] : null
  return (
    <Link href={`/competitions/${ev.id}`} style={{ ...cardShell, border: `1px solid ${rs ? rs.c + '66' : 'rgba(246,239,228,.10)'}` }}>
      <Banner disc={ev.disc} coverSrc={coverSrc} title={d?.name ?? ev.disc} sub={daysToStart ? `⏳ ${daysToStart} روز تا شروع${ev.date ? ' · ' + ev.date : ''}` : (ev.date || undefined)} status={ev.status} discColor={discColor} />
      <div style={{ background: bodyBg, padding: '12px 14px 14px' }}>
        {rs && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: rs.s, border: `1px solid ${rs.c}55`, borderRadius: 8, padding: '5px 10px', marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: rs.c }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: rs.c }}>{rs.label}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(20,17,13,.45)', border: '1px solid rgba(246,239,228,.07)', borderRadius: 12, overflow: 'hidden' }}>
          {ev.prize > 0 && (
            <Cell><Num size={16} color={C.gold}>{ev.prize}M</Num><Lab>تومان جایزه</Lab></Cell>
          )}
          <Cell><Num size={16}>{cap || ev.teams}</Num><Lab>ظرفیت</Lab></Cell>
          <Cell wide><span style={{ fontSize: 12, fontWeight: 700, color: C.tbody, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{ev.format || '—'}</span><Lab>فرمت</Lab></Cell>
        </div>
      </div>
    </Link>
  )
}

// Mother competition (رویداد) — custom cover or first discipline fallback.
export function CompetitionCard({ href, title, sub, coverDisc, coverSrc, discCount, prizeSum, status }: {
  href: string; title: string; sub?: string; coverDisc?: string; coverSrc?: string; discCount: number; prizeSum: number; status?: string
}) {
  const discColor = coverDisc ? (DISC_DOT[coverDisc] ?? C.accent) : C.accent
  return (
    <Link href={href} style={{ ...cardShell, border: '1px solid rgba(168,85,247,.28)' }}>
      <Banner disc={coverDisc} coverSrc={coverSrc} title={title} sub={sub} status={status} discColor={discColor} />
      <div style={{ background: bodyBg, padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(20,17,13,.45)', border: '1px solid rgba(246,239,228,.07)', borderRadius: 12, overflow: 'hidden' }}>
          <Cell><Num size={16} color={C.accent}>{discCount}</Num><Lab>رشته</Lab></Cell>
          {prizeSum > 0 && <Cell><Num size={16} color={C.gold}>{prizeSum}M</Num><Lab>مجموع جایزه</Lab></Cell>}
          <Cell wide><span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textAlign: 'center' }}>مشاهدهٔ رشته‌ها ›</span><Lab>ورود</Lab></Cell>
        </div>
      </div>
    </Link>
  )
}

function Cell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div style={{ flex: wide ? 1.4 : 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderInlineEnd: '1px solid rgba(246,239,228,.07)' }}>{children}</div>
}
function Lab({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, color: C.tmut }}>{children}</span>
}
