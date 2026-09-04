'use client'
import { useCallback, useEffect, useState } from 'react'
import { C, DISP, EmptyState } from '@/components/ui'

// Kept in sync with lib/store.ts PERMISSIONS — small enough not to warrant a
// server round-trip just to render labels.
const PERMISSIONS = [
  { key: 'result_entry', label: 'ثبت نتیجه براکت', desc: 'ثبت نتیجه، لغو مسابقه و اعلان به بازیکن روی مسابقه‌های براکت — بدون آنالیتیکس، سهم بازیکن‌ها یا ساخت/ویرایش براکت' },
] as const

type UserRow = { id: string; name: string; tag: string; phone: string; role: string; permissions: string[] }

const inp: React.CSSProperties = {
  background: '#252017', border: '1px solid #3A332A', borderRadius: 10, padding: '10px 12px',
  color: '#F2EDE4', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}

export default function AccessClient() {
  const [granted, setGranted] = useState<UserRow[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserRow[]>([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchReady, setSearchReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const loadGranted = useCallback(async () => {
    const res = await fetch('/api/admin/permissions')
    const j = await res.json()
    if (res.ok) setGranted(j.users ?? [])
  }, [])

  useEffect(() => { loadGranted() }, [loadGranted])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setSearchReady(false); return }
    const t = setTimeout(async () => {
      setSearchBusy(true)
      try {
        const res = await fetch(`/api/admin/permissions?q=${encodeURIComponent(q)}`)
        const j = await res.json()
        if (res.ok) { setResults(j.users ?? []); setSearchReady(!!j.ready) }
      } finally { setSearchBusy(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  async function toggle(u: UserRow, perm: string, grant: boolean) {
    setErr(null); setBusyId(u.id)
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, permission: perm, grant }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'ثبت نشد')
      const patched = { ...u, permissions: j.user?.permissions ?? u.permissions }
      setResults(rs => rs.map(r => r.id === u.id ? patched : r))
      await loadGranted()
    } catch (e: any) { setErr(e.message) }
    finally { setBusyId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>جستجوی کاربر</div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="0912… یا @تگ یا اسم" style={inp} autoComplete="off" dir="ltr" />
        {searchBusy && <div style={{ fontSize: 10.5, color: C.tmut }}>در حال جستجو…</div>}
        {err && <div style={{ fontSize: 12.5, fontWeight: 700, color: C.live, background: C.liveSoft, border: `1px solid ${C.live}55`, borderRadius: 10, padding: '9px 11px' }}>{err}</div>}
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {results.map(u => <UserCard key={u.id} u={u} busy={busyId === u.id} onToggle={toggle} />)}
          </div>
        )}
        {searchReady && !searchBusy && results.length === 0 && query.trim().length >= 2 && (
          <div style={{ fontSize: 10.5, color: C.tmut, lineHeight: 1.7 }}>حساب گیمری با این مشخصات پیدا نشد.</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 8 }}>دسترسی‌های فعال</div>
        {granted.length === 0 ? (
          <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="فعلاً به کسی دسترسی محدود داده نشده." /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {granted.map(u => <UserCard key={u.id} u={u} busy={busyId === u.id} onToggle={toggle} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function UserCard({ u, busy, onToggle }: { u: UserRow; busy: boolean; onToggle: (u: UserRow, perm: string, grant: boolean) => void }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.thi }}>{u.name}</div>
        <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2, textAlign: 'right' }}>@{u.tag} · {u.phone}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PERMISSIONS.map(p => {
          const on = u.permissions.includes(p.key)
          return (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button" disabled={busy}
                onClick={() => onToggle(u, p.key, !on)}
                style={{
                  all: 'unset', cursor: 'pointer', flexShrink: 0, minWidth: 74, textAlign: 'center', padding: '7px 10px', borderRadius: 8,
                  fontSize: 11.5, fontWeight: 700,
                  background: on ? C.accentSoft : C.sf2, color: on ? C.accent : C.tbody, border: `1px solid ${on ? C.accent : C.line}`,
                }}
              >
                {on ? 'فعال ✓' : 'غیرفعال'}
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.thi }}>{p.label}</div>
                <div style={{ fontSize: 10, color: C.tmut, marginTop: 1, lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
