'use client'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { C, DISP, Num, GamerAvatar, EmptyState, Button, GameBadge } from '@/components/ui'
import type { CenterSnapshot, CenterMatch, CenterPlayer } from '@/lib/match-center-types'

type Tab = 'live' | 'mine' | 'bracket' | 'prov' | 'players' | 'run'

const TABS: { key: Tab; label: string; admin?: boolean }[] = [
  { key: 'live', label: 'زنده' },
  { key: 'mine', label: 'بازی من' },
  { key: 'bracket', label: 'جدول' },
  { key: 'prov', label: 'استان‌ها' },
  { key: 'players', label: 'بازیکنان' },
  { key: 'run', label: 'اجرا', admin: true },
]

export default function CenterClient({ initial }: { initial: CenterSnapshot }) {
  const [data, setData] = useState(initial)
  const [tab, setTab] = useState<Tab>(initial.defaultTab as Tab)
  const [busy, setBusy] = useState(false)
  const [rules, setRules] = useState<string[] | null>(null)
  const [callFor, setCallFor] = useState<CenterMatch | null>(null)
  const [station, setStation] = useState('')
  const [runFilter, setRunFilter] = useState<'queue' | 'play' | 'late' | 'station' | 'ref'>('queue')

  const load = useCallback(() => {
    fetch('/api/center').then(r => r.ok ? r.json() : null).then(j => { if (j && !j.error) setData(j) }).catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(load, 12_000)
    return () => clearInterval(id)
  }, [load])

  async function act(body: object) {
    setBusy(true)
    try {
      const r = await fetch('/api/center/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'انجام نشد')
      load()
    } catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }
  async function admin(body: object) {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/center', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'انجام نشد')
      setCallFor(null)
      setStation('')
      load()
    } catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }
  async function result(matchId: string, winnerUserId: string) {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, winnerUserId }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'ثبت نشد')
      load()
    } catch (e: any) { alert(e.message) }
    finally { setBusy(false) }
  }

  const tabs = TABS.filter(t => !t.admin || data.isAdmin)
  const next = data.next
  const me = data.meUid

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.thi }}>مرکز مسابقات</h1>

      {next && tab !== 'mine' && (
        <button type="button" onClick={() => setTab('mine')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: C.accentSoft, border: `1px solid ${C.accent}66`, borderRadius: 13, padding: '12px 14px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: next.calledAt ? C.live : C.accent, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>
              {next.station ? `دستگاه ${next.station}` : next.gamesAhead > 0 ? `${next.gamesAhead} بازی تا نوبت` : 'بازی بعدی'}
            </div>
            <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{oppName(next, me)}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>بازی من</span>
        </button>
      )}

      <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
        {tabs.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12.5, fontWeight: 700, padding: '8px 14px', borderRadius: 999, background: tab === t.key ? C.accentSoft : C.sf1, border: `1px solid ${tab === t.key ? C.accent : C.line}`, color: tab === t.key ? C.accent : C.tbody }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'live' && <LiveTab live={data.live} recent={data.recent} me={me} />}
      {tab === 'mine' && (
        <MineTab
          next={next} mine={data.mine} me={me} busy={busy}
          onHere={() => next && act({ op: 'here', matchId: next.id })}
          onReady={() => next && act({ op: 'ready', matchId: next.id })}
          onRef={() => next && act({ op: 'ref', matchId: next.id })}
          onRules={() => next && setRules(data.rules[next.disc] ?? [])}
        />
      )}
      {tab === 'bracket' && <BracketTab events={data.events} />}
      {tab === 'prov' && <ProvTab rows={data.provinces} />}
      {tab === 'players' && (
        <PlayersTab rows={data.players} me={me} busy={busy}
          onFollow={(id, on) => act({ op: on ? 'unfollow' : 'follow', followeeId: id })} />
      )}
      {tab === 'run' && data.desk && (
        <RunTab
          desk={data.desk} filter={runFilter} setFilter={setRunFilter} busy={busy}
          onCall={m => { setCallFor(m); setStation(m.station ? String(m.station) : '') }}
          onWin={result}
        />
      )}

      {rules && <Sheet onClose={() => setRules(null)}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi, marginBottom: 12 }}>قوانین مسابقه</div>
        <ul style={{ margin: 0, padding: '0 18px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((r, i) => <li key={i} style={{ fontSize: 13, color: C.tbody, lineHeight: 1.7 }}>{r}</li>)}
        </ul>
      </Sheet>}

      {callFor && <Sheet onClose={() => setCallFor(null)}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi, marginBottom: 4 }}>فراخوان</div>
        <div style={{ fontSize: 12, color: C.tmut, marginBottom: 14 }}>بازی {callFor.num} · {callFor.p1?.name ?? '—'} × {callFor.p2?.name ?? '—'}</div>
        <input inputMode="numeric" value={station} onChange={e => setStation(e.target.value.replace(/\D/g, '').slice(0, 3))}
          placeholder="شماره دستگاه" style={{ width: '100%', boxSizing: 'border-box', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 14px', minHeight: 46, color: C.thi, fontSize: 16, outline: 'none', marginBottom: 12 }} />
        <Button disabled={busy || !station} onClick={() => admin({ op: 'call', matchId: callFor.id, station: Number(station) })}>فراخوان</Button>
      </Sheet>}
    </div>
  )
}

function oppName(m: CenterMatch, me?: string) {
  const opp = me && m.p1?.uid === me ? m.p2 : me && m.p2?.uid === me ? m.p1 : null
  return opp ? opp.name : `${m.p1?.name ?? '—'} × ${m.p2?.name ?? '—'}`
}

function LiveTab({ live, recent, me }: { live: CenterMatch[]; recent: CenterMatch[]; me?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {live.length === 0 && recent.length === 0 && <EmptyState text="الان بازی زنده‌ای نیست." />}
      {live.length > 0 && live.map(m => <MatchRow key={m.id} m={m} me={me} live />)}
      {recent.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginTop: 4 }}>نتایج</div>
          {recent.map(m => <MatchRow key={m.id} m={m} me={me} />)}
        </>
      )}
    </div>
  )
}

function MineTab({ next, mine, me, busy, onHere, onReady, onRef, onRules }: {
  next?: CenterMatch; mine: CenterMatch[]; me?: string; busy: boolean
  onHere: () => void; onReady: () => void; onRef: () => void; onRules: () => void
}) {
  if (!me) return <Button href="/login?callbackUrl=/center">ورود</Button>
  if (!next && mine.length === 0) return <EmptyState text="بازی بعدی نداری." />
  const meP = next && (next.p1?.uid === me ? next.p1 : next.p2)
  const opp = next && (next.p1?.uid === me ? next.p2 : next.p1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {next && (
        <div style={{ background: C.sf1, border: `1px solid ${next.calledAt ? C.accent : C.line}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.tmut, marginBottom: 8 }}>{next.eventTitle} · {next.roundLabel}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
            {next.station
              ? <><Num size={42} color={C.accent}>{next.station}</Num><span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>دستگاه</span></>
              : next.gamesAhead > 0
              ? <><Num size={42} color={C.accent}>{next.gamesAhead}</Num><span style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>بازی تا نوبت</span></>
              : <span style={{ fontSize: 16, fontWeight: 800, color: C.thi }}>نوبت توست</span>}
          </div>
          {opp && <PlayerBlock p={opp} label="حریف" />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 0', fontSize: 12.5, color: C.tbody }}>
            {next.venueName && <div>{next.venueName}{next.venueAddress ? ` · ${next.venueAddress}` : ''}</div>}
            {next.scheduleLabel && <div>{next.scheduleLabel}</div>}
            <div>{next.stageLabel}{next.groupLabel ? ` · ${next.groupLabel}` : ''} · {next.format}</div>
            <div>{next.qualify}</div>
            {opp && <div style={{ color: opp.ready ? C.win : opp.here ? C.gold : C.tmut }}>{opp.ready ? 'حریف آماده است' : opp.here ? 'حریف حاضر شد' : 'حریف هنوز نیامده'}</div>}
            {next.path && <div style={{ color: C.thi, fontWeight: 700 }}>{next.path}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={busy || !!meP?.here} onClick={onHere} style={btn(!!meP?.here)}>{meP?.here ? 'حاضر' : 'حضور در محل'}</button>
            <button type="button" disabled={busy || !!meP?.ready} onClick={onReady} style={btn(!!meP?.ready, true)}>{meP?.ready ? 'آماده' : 'آماده بازی هستم'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {opp && <Link href={`/players/${opp.tag}`} style={linkBtn}>مشاهده حریف</Link>}
            {next.mapUrl && <a href={next.mapUrl} target="_blank" rel="noreferrer" style={linkBtn}>مسیر</a>}
            <button type="button" onClick={onRules} style={linkBtn}>قوانین مسابقه</button>
            <button type="button" disabled={busy} onClick={onRef} style={linkBtn}>درخواست داور</button>
          </div>
        </div>
      )}
      {mine.filter(m => m.id !== next?.id).map(m => <MatchRow key={m.id} m={m} me={me} />)}
    </div>
  )
}

function PlayerBlock({ p, label }: { p: CenterPlayer; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px' }}>
      <GamerAvatar uid={p.uid} tag={p.tag} hasPhoto={p.hasPhoto} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.tmut }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>{p.name}</div>
        <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2 }}>@{p.tag} · {p.city}{p.rank ? ` · #${p.rank}` : ''}</div>
      </div>
    </div>
  )
}

function MatchRow({ m, me, live }: { m: CenterMatch; me?: string; live?: boolean }) {
  const share = () => {
    const t = `${m.p1?.name ?? ''} ${m.score || 'vs'} ${m.p2?.name ?? ''} · ${m.eventTitle}`
    if (navigator.share) navigator.share({ text: t }).catch(() => {})
    else navigator.clipboard?.writeText(t).catch(() => {})
  }
  return (
    <div style={{ background: C.sf1, border: `1px solid ${live ? C.live + '44' : C.line}`, borderRadius: 13, padding: '12px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.live, flexShrink: 0 }} />}
        <GameBadge disc={m.disc} size={18} />
        <span style={{ fontSize: 11.5, color: C.tmut, flex: 1 }}>{m.roundLabel}{m.groupLabel ? ` · ${m.groupLabel}` : ''}</span>
        {m.station && <span className="gl-num" style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>#{m.station}</span>}
        {m.status === 'done' && <button type="button" onClick={share} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.gold }}>اشتراک</button>}
      </div>
      <Side p={m.p1} win={m.status === 'done' && m.winnerUid === m.p1?.uid} me={me} />
      <Side p={m.p2} win={m.status === 'done' && m.winnerUid === m.p2?.uid} me={me} />
    </div>
  )
}

function Side({ p, win, me }: { p?: CenterPlayer; win: boolean; me?: string }) {
  if (!p) return <div style={{ fontSize: 13, color: C.tmut, padding: '4px 0' }}>—</div>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', opacity: win || !me ? 1 : 0.85 }}>
      <GamerAvatar uid={p.uid} tag={p.tag} hasPhoto={p.hasPhoto} size={28} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: win ? C.gold : p.uid === me ? C.accent : C.thi }}>{p.name}</span>
      {p.ready && <span style={{ fontSize: 10, fontWeight: 700, color: C.win }}>آماده</span>}
      {!p.ready && p.here && <span style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>حاضر</span>}
    </div>
  )
}

function BracketTab({ events }: { events: { id: string; title: string; disc: string }[] }) {
  if (events.length === 0) return <EmptyState text="جدولی کشیده نشده." />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map(e => (
        <Link key={e.id} href={`/competitions/${e.id}/bracket`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 14px' }}>
          <GameBadge disc={e.disc} size={28} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.thi }}>{e.title}</span>
          <span style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>براکت</span>
        </Link>
      ))}
    </div>
  )
}

function ProvTab({ rows }: { rows: CenterSnapshot['provinces'] }) {
  if (rows.length === 0) return <EmptyState text="گروه استانی نیست." />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '13px 14px' }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.thi }}>{r.label}</div>
          <span className="gl-num" style={{ fontSize: 13, fontWeight: 800, color: r.live ? C.live : C.tmut }}>{r.live}</span>
          <span style={{ fontSize: 11, color: C.tmut }}>زنده</span>
          <span className="gl-num" style={{ fontSize: 13, fontWeight: 800, color: C.tbody }}>{r.done}</span>
          <span style={{ fontSize: 11, color: C.tmut }}>نتیجه</span>
        </div>
      ))}
    </div>
  )
}

function PlayersTab({ rows, me, busy, onFollow }: {
  rows: CenterSnapshot['players']; me?: string; busy: boolean
  onFollow: (id: string, followed: boolean) => void
}) {
  if (!me) return <Button href="/login?callbackUrl=/center">ورود</Button>
  if (rows.length === 0) return <EmptyState text="بازیکنی در جریان نیست." />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(p => (
        <div key={p.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '11px 12px' }}>
          <Link href={`/players/${p.tag}`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <GamerAvatar uid={p.uid} tag={p.tag} hasPhoto={p.hasPhoto} size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>{p.nextLabel}</div>
            </div>
          </Link>
          {p.uid !== me && (
            <button type="button" disabled={busy} onClick={() => onFollow(p.uid, p.followed)}
              style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '8px 12px', borderRadius: 999, background: p.followed ? C.sf2 : C.accentSoft, border: `1px solid ${p.followed ? C.line2 : C.accent}`, color: p.followed ? C.tbody : C.accent }}>
              {p.followed ? 'دنبال‌شده' : 'دنبال'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function RunTab({ desk, filter, setFilter, busy, onCall, onWin }: {
  desk: NonNullable<CenterSnapshot['desk']>
  filter: 'queue' | 'play' | 'late' | 'station' | 'ref'
  setFilter: (f: 'queue' | 'play' | 'late' | 'station' | 'ref') => void
  busy: boolean
  onCall: (m: CenterMatch) => void
  onWin: (matchId: string, uid: string) => void
}) {
  const chips: { key: typeof filter; label: string; n: number }[] = [
    { key: 'queue', label: 'صف', n: desk.waiting.length },
    { key: 'play', label: 'در حال', n: desk.playing.length },
    { key: 'late', label: 'عقب', n: desk.late.length },
    { key: 'station', label: 'دستگاه', n: desk.stations.length },
    { key: 'ref', label: 'داور', n: desk.refs.length + desk.absent.length },
  ]
  const list =
    filter === 'queue' ? desk.waiting :
    filter === 'play' ? desk.playing :
    filter === 'late' ? desk.late :
    filter === 'ref' ? [...desk.absent, ...desk.refs] : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="gl-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
        {chips.map(c => (
          <button key={c.key} type="button" onClick={() => setFilter(c.key)}
            style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 999, background: filter === c.key ? C.goldSoft : C.sf1, border: `1px solid ${filter === c.key ? C.gold : C.line}`, color: filter === c.key ? C.gold : C.tbody }}>
            {c.label} {c.n > 0 ? c.n : ''}
          </button>
        ))}
      </div>
      {filter === 'station' && (desk.stations.length === 0 ? <EmptyState text="دستگاهی تخصیص نشده." /> : desk.stations.map(s => (
        <div key={s.n} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Num size={28} color={C.accent}>{s.n}</Num>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.tmut }}>{s.status}</span>
          </div>
          {s.current && <div style={{ fontSize: 13, color: C.thi, marginTop: 6 }}>{s.current}</div>}
          {s.next && <div style={{ fontSize: 12, color: C.tmut, marginTop: 4 }}>بعدی: {s.next}</div>}
        </div>
      )))}
      {filter !== 'station' && (list.length === 0 ? <EmptyState text="موردی نیست." /> : list.map(m => (
        <div key={m.id} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '12px 13px' }}>
          <div style={{ fontSize: 11, color: C.tmut, marginBottom: 8 }}>بازی {m.num} · {m.roundLabel}{m.station ? ` · دستگاه ${m.station}` : ''}</div>
          <Side p={m.p1} win={false} />
          <Side p={m.p2} win={false} />
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {m.status === 'ready' && !m.cancelled && (
              <>
                <button type="button" disabled={busy} onClick={() => onCall(m)} style={btn(false)}>{m.calledAt ? 'فراخوان دوباره' : 'فراخوان'}</button>
                {m.p1 && <button type="button" disabled={busy} onClick={() => onWin(m.id, m.p1!.uid)} style={btn(false, true)}>وین {m.p1.name}</button>}
                {m.p2 && <button type="button" disabled={busy} onClick={() => onWin(m.id, m.p2!.uid)} style={btn(false, true)}>وین {m.p2.name}</button>}
              </>
            )}
          </div>
        </div>
      )))}
    </div>
  )
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [on, setOn] = useState(false)
  useEffect(() => setOn(true), [])
  if (!on) return null
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', background: 'rgba(8,6,4,.62)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: C.sf1, borderTop: `1px solid ${C.line2}`, borderRadius: '18px 18px 0 0', padding: '12px 16px calc(20px + env(safe-area-inset-bottom))', maxHeight: '82vh', overflowY: 'auto' }}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: C.line2, margin: '0 auto 14px' }} />
        {children}
      </div>
    </div>,
    document.body,
  )
}

function btn(done: boolean, primary?: boolean): React.CSSProperties {
  return {
    all: 'unset', cursor: done ? 'default' : 'pointer', boxSizing: 'border-box', flex: 1, textAlign: 'center',
    minHeight: 44, borderRadius: 11, fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-fa)',
    background: done ? C.sf2 : primary ? C.accent : 'transparent',
    color: done ? C.tmut : primary ? C.ink : C.thi,
    border: `1px solid ${done ? C.line : primary ? C.accent : C.line2}`,
    opacity: done ? 0.7 : 1,
  }
}
const linkBtn: React.CSSProperties = {
  all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: C.tbody, padding: '8px 0',
}
