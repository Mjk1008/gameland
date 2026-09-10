'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C } from '@/components/ui'
import { Section, primaryBtn, BRACKET_SIZES } from './tournament-panel'

type SearchUser = { id: string; name: string; tag: string; city?: string }
type Row = { query: string; results: SearchUser[]; searching: boolean; chosen: SearchUser | null }

type Props = { compId: string; finalExists: boolean }

const emptyRow = (): Row => ({ query: '', results: [], searching: false, chosen: null })

// «چیدمانِ دقیق» — برای وقتی که قرعه‌کشی جای دیگه‌ای (مثلاً Challonge) انجام
// شده و باید عیناً همون جفت‌بندی توی اپ بیاد، نه یه چیدمانِ رندومِ مشابه.
// جایگاه i با جایگاهِ i+1 توی راند اول جفت می‌شن — دقیقاً ترتیبِ خوندنِ یه
// عکسِ براکتِ معمولی (جعبهٔ ۱، جعبهٔ ۲، …). چیزی این‌جا خودکار قاطی/رندوم
// نمی‌شه؛ هرکی رو دستی توی جایگاهش می‌ذاری همون‌جا می‌مونه.
export default function ExactSeedPanel({ compId, finalExists }: Props) {
  const router = useRouter()
  const [size, setSize] = useState(32)
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 32 }, emptyRow))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function resize(n: number) {
    setSize(n)
    setRows(prev => {
      const next = prev.slice(0, n)
      while (next.length < n) next.push(emptyRow())
      return next
    })
  }

  function setRow(i: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function search(i: number, q: string) {
    setRow(i, { query: q, chosen: null })
    if (debounce.current) clearTimeout(debounce.current)
    if (q.trim().length < 2) { setRow(i, { results: [] }); return }
    setRow(i, { searching: true })
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/user-search?q=${encodeURIComponent(q.trim())}`)
        const j = await res.json()
        setRow(i, { results: j.users ?? [], searching: false })
      } catch { setRow(i, { results: [], searching: false }) }
    }, 300)
  }

  function pick(i: number, u: SearchUser) {
    setRow(i, { chosen: u, query: '', results: [] })
  }
  function clear(i: number) {
    setRow(i, emptyRow())
  }

  const filled = rows.filter(r => r.chosen).length

  async function submit() {
    if (filled < 2) { setMsg({ ok: false, text: 'حداقل ۲ نفر رو انتخاب کن' }); return }
    if (finalExists && !confirm('فینال از قبل چیده شده؛ عیناً با این چیدمان جایگزین می‌شه (نتیجه‌های ثبت‌شدهٔ فینال هم پاک می‌شن). مطمئنی؟')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/final-exact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId, seats: rows.map(r => r.chosen?.id ?? '') }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      router.refresh()
      setMsg({ ok: true, text: `چیده شد (پیش‌نویس) · ${j.seats} نفر — قبل از انتشار با جدولِ بیرونی مقایسه کن` })
    } catch (e: any) { setMsg({ ok: false, text: e.message }) }
    finally { setBusy(false) }
  }

  return (
    <Section title="چیدمانِ دقیق (وارد کردنِ جدولِ بیرونی)" sub="هر جایگاه رو با جایگاهِ زیرش توی راندِ اول جفت می‌کنه — عیناً همون جدول">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: C.tmut, marginBottom: 5 }}>تعداد جایگاه</div>
        <select value={size} disabled={busy} onChange={e => resize(Number(e.target.value))} style={sel}>
          {BRACKET_SIZES.map(s => <option key={s} value={s}>{s} نفره</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
        {rows.map((row, i) => (
          <div key={i}>
            {i % 2 === 0 && (
              <div style={{ fontSize: 10.5, color: C.tmut, marginTop: i === 0 ? 0 : 10, marginBottom: 3 }}>
                جعبهٔ {i / 2 + 1}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <span style={{ width: 20, flexShrink: 0, fontSize: 11, color: C.tmut, textAlign: 'center' }}>{i + 1}</span>
              {row.chosen ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: C.ink, border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 10px' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.chosen.name} · @{row.chosen.tag}
                  </span>
                  <button type="button" disabled={busy} onClick={() => clear(i)} style={rmBtn}>✕</button>
                </div>
              ) : (
                <input
                  value={row.query} onChange={e => search(i, e.target.value)} disabled={busy}
                  placeholder="نام، @تگ یا شماره… (خالی = بای)"
                  style={inp}
                />
              )}
              {!row.chosen && row.results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', insetInlineStart: 28, insetInlineEnd: 0, zIndex: 5, marginTop: 3, display: 'flex', flexDirection: 'column', gap: 4, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {row.results.map(u => (
                    <button key={u.id} type="button" onClick={() => pick(i, u)}
                      style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 7, fontSize: 12.5, color: C.thi }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name} · @{u.tag}{u.city ? ` · ${u.city}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.tmut, marginBottom: 10 }}>{filled} از {size} جایگاه پر شده</div>

      <button onClick={submit} disabled={busy || filled < 2} style={primaryBtn(finalExists, busy || filled < 2)}>
        {busy ? 'در حال چیدن…' : 'چیدن دقیق از این جدول'}
      </button>

      {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: msg.ok ? C.win : C.live, background: msg.ok ? C.winSoft : C.liveSoft, border: `1px solid ${(msg.ok ? C.win : C.live)}55`, padding: 11, borderRadius: 10 }}>{msg.text}</div>}
    </Section>
  )
}

const inp: React.CSSProperties = { flex: 1, minWidth: 0, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '7px 10px', color: C.thi, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }
const sel: React.CSSProperties = { width: '100%', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 9, padding: '9px 10px', color: C.thi, fontSize: 13, outline: 'none' }
const rmBtn: React.CSSProperties = { all: 'unset', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, fontSize: 12, fontWeight: 700, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}44`, flexShrink: 0 }
