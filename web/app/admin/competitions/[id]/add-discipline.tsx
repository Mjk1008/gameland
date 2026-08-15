'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DISC } from '@/lib/mock-data'
import { buildDisciplineTitle, disciplineSlotKey, formatModeLabel } from '@/lib/discipline-format'
import { C, Button, GameBadge, inp, Field } from '@/components/ui'
import CoverUploader from '@/components/CoverUploader'

type Disc = keyof typeof DISC

function firstOpenDisc(existing: Set<string>): Disc {
  for (const k of Object.keys(DISC) as Disc[]) {
    if (!existing.has(disciplineSlotKey(k, 1)) || !existing.has(disciplineSlotKey(k, 2))) return k
  }
  return 'fc26'
}

function firstOpenFormat(disc: Disc, existing: Set<string>): 1 | 2 {
  if (!existing.has(disciplineSlotKey(disc, 1))) return 1
  if (!existing.has(disciplineSlotKey(disc, 2))) return 2
  return 1
}

// Add one discipline (a child Event) to a parent competition.
export default function AddDisciplineForm({ compId, compTitle, compDate, existingSlots }: {
  compId: string; compTitle: string; compDate: string; existingSlots: string[]
}) {
  const router = useRouter()
  const taken = new Set(existingSlots)
  const [open, setOpen] = useState(false)
  const [disc, setDisc] = useState<Disc>(() => firstOpenDisc(taken))
  const [prize, setPrize] = useState(0)
  const [tier, setTier] = useState<'S' | 'A' | 'B' | 'C'>('A')
  const [finalSize, setFinalSize] = useState(128)
  const [teams, setTeams] = useState(64)
  const [teamSize, setTeamSize] = useState<1 | 2>(() => firstOpenFormat(firstOpenDisc(taken), taken))
  const [ticketPrice, setTicketPrice] = useState('')
  const [ticketOriginal, setTicketOriginal] = useState('')
  const [coverData, setCoverData] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const slotTaken = taken.has(disciplineSlotKey(disc, teamSize))

  function pickDisc(k: Disc) {
    setDisc(k)
    setFinalSize(k === 'fc26' ? 128 : 32)
    if (taken.has(disciplineSlotKey(k, teamSize))) setTeamSize(firstOpenFormat(k, taken))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setBusy(true)
    if (slotTaken) { setErr('این ترکیب بازی و فرمت قبلاً اضافه شده'); setBusy(false); return }
    try {
      const gameName = DISC[disc].name
      const res = await fetch('/api/admin/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: buildDisciplineTitle(compTitle, gameName, teamSize),
          season: compTitle,
          disc, tier, prize, teams, finalSize,
          format: 'مقدماتی (شهری) + فینال', date: compDate,
          status: 'open', statusLabel: 'ثبت‌نام باز',
          competitionId: compId,
          teamSize, ticketPrice: ticketPrice || undefined, ticketOriginal: ticketOriginal || undefined,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'اضافه نشد')
      if (coverData && j.event?.id) {
        const cr = await fetch('/api/admin/event-cover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: j.event.id, imageData: coverData }),
        })
        if (!cr.ok) {
          const cj = await cr.json().catch(() => ({}))
          throw new Error(cj.error || 'رشته اضافه شد ولی کاور ذخیره نشد')
        }
      }
      setOpen(false); setPrize(0); setCoverData(null)
      router.refresh()
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', textAlign: 'center', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: C.accent, background: C.accentSoft, border: `1px dashed ${C.accent}66` }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        افزودن رشته
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ background: C.sf1, border: `1px solid ${C.accent}55`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>رشتهٔ جدید</div>
        <div style={{ fontSize: 11.5, color: C.tmut, marginTop: 4, lineHeight: 1.7 }}>
          زیرمجموعهٔ «{compTitle}» — همون رویداد، براکت جدا. می‌تونی همون بازی رو هم ۱به۱ و هم ۲به۲ داشته باشی.
        </div>
      </div>

      <CoverUploader
        label="کاور رشته (اختیاری)"
        hint="۱۶:۹ · اگه نذاری، عکس پیش‌فرض بازی نشون داده می‌شه"
        previewSrc={coverData ?? undefined}
        onUpload={async dataUrl => { setCoverData(dataUrl) }}
      />

      <Field label="بازی">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.keys(DISC) as Disc[]).map(k => {
            const on = disc === k
            const soloUsed = taken.has(disciplineSlotKey(k, 1))
            const teamUsed = taken.has(disciplineSlotKey(k, 2))
            const fullyUsed = soloUsed && teamUsed
            return (
              <button key={k} type="button" disabled={fullyUsed} onClick={() => pickDisc(k)} style={{ all: 'unset', cursor: fullyUsed ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 52, border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 12.5, opacity: fullyUsed ? 0.4 : 1, padding: '6px 4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GameBadge disc={k} size={20} />{DISC[k].name}</span>
                {!fullyUsed && (soloUsed || teamUsed) && (
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: C.tmut }}>{soloUsed ? '۱به۱ ✓' : ''}{soloUsed && teamUsed ? ' · ' : ''}{teamUsed ? '۲به۲ ✓' : ''}</span>
                )}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="فرمت بازی" hint="براکت‌های ۲به۲ تیم‌به‌تیمه — هر بازیکن سهمِ خودش رو جدا پرداخت می‌کنه.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([[1, '۱ به ۱ (انفرادی)'], [2, '۲ به ۲ (تیمی)']] as const).map(([k, label]) => {
            const on = teamSize === k
            const used = taken.has(disciplineSlotKey(disc, k))
            return (
              <button key={k} type="button" disabled={used} onClick={() => setTeamSize(k)} style={{ all: 'unset', cursor: used ? 'default' : 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 12.5, opacity: used ? 0.4 : 1 }}>
                {label}{used ? ' ✓' : ''}
              </button>
            )
          })}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="جایزه (میلیون تومان)"><input type="number" inputMode="numeric" min="0" value={prize} onChange={e => setPrize(Number(e.target.value))} style={inp} /></Field>
        <Field label="ظرفیت (نفر)"><input type="number" inputMode="numeric" min="2" value={teams} onChange={e => setTeams(Number(e.target.value))} style={inp} /></Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="قیمت هر سهم (تومان)" hint="خالی = پیش‌فرض ۵۰۰٬۰۰۰"><input type="number" inputMode="numeric" min="0" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} style={inp} placeholder="۵۰۰۰۰۰" /></Field>
        <Field label="قیمت قبل از تخفیف" hint="خالی = پیش‌فرض ۷۹۸٬۰۰۰"><input type="number" inputMode="numeric" min="0" value={ticketOriginal} onChange={e => setTicketOriginal(e.target.value)} style={inp} placeholder="۷۹۸۰۰۰" /></Field>
      </div>

      <Field label="تایر (امتیازبندی)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {([['S', 'ماژور'], ['A', 'گیم‌لند'], ['B', 'آل‌استار'], ['C', 'محلی']] as const).map(([k, label]) => {
            const on = tier === k
            return <button key={k} type="button" onClick={() => setTier(k)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 10, background: on ? C.goldSoft : C.sf2, color: on ? C.gold : C.tbody, fontWeight: 600, fontSize: 12 }}>{label}</button>
          })}
        </div>
      </Field>

      <Field label="سایزِ فینال" hint="FIFA معمولاً ۱۲۸ · بقیه ۳۲">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[16, 32, 64, 128].map(n => {
            const on = finalSize === n
            return <button key={n} type="button" onClick={() => setFinalSize(n)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${on ? C.accent : C.line}`, borderRadius: 10, background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-disp)' }}>{n}</button>
          })}
        </div>
      </Field>

      {slotTaken && <div style={{ fontSize: 12, color: C.gold, background: C.goldSoft, border: `1px solid ${C.gold}55`, padding: 10, borderRadius: 10 }}>این ترکیب ({DISC[disc].name} · {formatModeLabel(teamSize)}) قبلاً در این رویداد هست.</div>}

      {err && <div style={{ fontSize: 12.5, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, padding: 10, borderRadius: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setOpen(false)} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, fontSize: 13, fontWeight: 700, color: C.tbody, border: `1px solid ${C.line2}` }}>انصراف</button>
        <div style={{ flex: 2 }}><Button type="submit" disabled={busy || slotTaken}>{busy ? 'در حال افزودن…' : 'افزودن رشته'}</Button></div>
      </div>
    </form>
  )
}
