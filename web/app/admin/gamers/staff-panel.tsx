'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { C, DISP } from '@/components/ui'

export type StaffRow = {
  id: string
  name: string
  tag: string
  phone: string
  city: string
  role: 'admin' | 'organizer' | 'gamer'
  locked: boolean
}

type SearchHit = { id: string; name: string; tag: string; phone: string; city: string }

const inp: React.CSSProperties = {
  background: '#252017', border: '1px solid #3A332A', borderRadius: 10, padding: '10px 12px',
  color: '#F2EDE4', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'ادمین',
  organizer: 'برگزارکننده',
}

export default function StaffPanel({
  initialStaff,
  meId,
  canManage,
}: {
  initialStaff: StaffRow[]
  meId: string
  canManage: boolean
}) {
  const router = useRouter()
  const [staff, setStaff] = useState(initialStaff)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<SearchHit | null>(null)
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searchReady, setSearchReady] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { setStaff(initialStaff) }, [initialStaff])

  useEffect(() => {
    if (!canManage || picked) return
    const q = query.trim()
    if (q.length < 2) { setHits([]); setSearchReady(false); return }
    const digits = q.replace(/\D/g, '')
    if (digits.length > 0 && digits.length === q.length && digits.length < 3) {
      setHits([]); setSearchReady(false); return
    }
    const t = setTimeout(async () => {
      setSearchBusy(true)
      try {
        const res = await fetch(`/api/admin/staff?q=${encodeURIComponent(q)}`)
        const j = await res.json()
        if (res.ok) { setHits(j.users ?? []); setSearchReady(!!j.ready) }
      } finally { setSearchBusy(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [query, picked, canManage])

  async function setRole(userId: string, role: 'admin' | 'gamer', confirmMsg: string) {
    if (!confirm(confirmMsg)) return
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'نشد')
      setStaff(j.staff ?? [])
      setPicked(null)
      setQuery('')
      setHits([])
      router.refresh()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.thi }}>کادر ادمین</div>
        <div style={{ fontSize: 11, color: C.tmut, marginTop: 4, lineHeight: 1.7 }}>
          {canManage
            ? 'با شماره یا @تگ جستجو کن و ادمین کن. طرف باید یک‌بار از حساب خارج بشه و دوباره وارد بشه.'
            : 'فقط ادمین می‌تونه نقش کادر را عوض کند.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {staff.map(u => {
          const canDemote = canManage && u.role === 'admin' && u.id !== meId && !u.locked
          const canPromote = canManage && u.role === 'organizer'
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{u.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, background: C.goldSoft, padding: '2px 6px', borderRadius: 5 }}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                  {u.id === meId && <span style={{ fontSize: 9, fontWeight: 700, color: C.tmut }}>تو</span>}
                </div>
                <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>
                  @{u.tag}{u.phone ? ` · ${u.phone}` : ''}
                </div>
              </div>
              {canPromote && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRole(u.id, 'admin', `«${u.name}» ادمین بشه؟ به کل پنل دسترسی پیدا می‌کنه.`)}
                  style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', fontSize: 11, fontWeight: 700, color: C.gold, opacity: busy ? 0.5 : 1, flexShrink: 0 }}
                >
                  ادمین کردن
                </button>
              )}
              {canDemote && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRole(u.id, 'gamer', `دسترسی ادمینِ «${u.name}» برداشته بشه؟`)}
                  style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', fontSize: 11, fontWeight: 700, color: C.live, opacity: busy ? 0.5 : 1, flexShrink: 0 }}
                >
                  حذف دسترسی
                </button>
              )}
            </div>
          )
        })}
      </div>

      {canManage && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.tmut, marginBottom: 6 }}>ادمین جدید</div>
          {picked ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: C.sf2, border: `1px solid ${C.accent}44` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>{picked.name}</div>
                  <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>
                    @{picked.tag}{picked.phone ? ` · ${picked.phone}` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => setPicked(null)} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: C.tbody }}>تغییر</button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRole(picked.id, 'admin', `«${picked.name}» ادمین بشه؟ به کل پنل دسترسی پیدا می‌کنه.`)}
                style={{ all: 'unset', cursor: busy ? 'default' : 'pointer', textAlign: 'center', minHeight: 42, borderRadius: 10, background: C.gold, color: C.ink, fontWeight: 800, fontSize: 13, opacity: busy ? 0.5 : 1 }}
              >
                {busy ? 'در حال ذخیره…' : 'ادمین کردن'}
              </button>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="0912… یا @tag"
                style={inp}
                autoComplete="off"
                dir="ltr"
              />
              {searchBusy && <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5 }}>در حال جستجو…</div>}
              {hits.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {hits.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setPicked(u); setQuery(''); setHits([]) }}
                      style={{ all: 'unset', cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: C.sf2, border: `1px solid ${C.line}`, fontSize: 12, color: C.thi, textAlign: 'right' }}
                    >
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2 }}>
                        @{u.tag}{u.phone ? ` · ${u.phone}` : ''}{u.city ? ` · ${u.city}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchReady && !searchBusy && hits.length === 0 && query.trim().length >= 2 && (
                <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5 }}>نتیجه‌ای نیست</div>
              )}
            </>
          )}
        </div>
      )}

      {err && <div style={{ fontSize: 12, color: C.live }}>{err}</div>}
    </div>
  )
}
