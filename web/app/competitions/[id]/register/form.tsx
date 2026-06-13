'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DISC, avatarBg, statusColor, Disc } from '@/lib/mock-data'

interface Props { comp: { id: string; title: string; disc: Disc; status: 'live' | 'open' | 'soon' | 'done'; statusLabel: string; prize: number; format: string; teams: number } }

export default function RegisterForm({ comp }: Props) {
  const router = useRouter()
  const d = DISC[comp.disc]
  const sc = statusColor(comp.status)

  const [attempts, setAttempts] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  // pricing model (legal-safe: per-attempt service fee, not gambling)
  const PER_ATTEMPT_COINS = 100
  const totalCoins = attempts * PER_ATTEMPT_COINS

  async function submit() {
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compId: comp.id, attempts }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'خطا')
      router.push(`/competitions/${comp.id}/me`)
      router.refresh()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href={`/competitions/${comp.id}`} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>ثبت‌نام در مسابقه</span>
      </div>

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Comp summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: avatarBg(d.color), border: `1px solid ${d.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14, color: d.color }} dir="ltr">{d.short}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#f1f5f9' }}>{comp.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: sc, fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }}/>{comp.statusLabel}
            </div>
          </div>
        </div>

        {/* Explainer */}
        <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>چجوری کار می‌کنه؟</div>
          <div>• می‌تونی <b>۱ تا ۶ شانس</b> بخری</div>
          <div>• هر شانس = یک ورود به یکی از ۶ براکت مقدماتی</div>
          <div>• قهرمان هر براکت → فاینال ۱۲۸ نفره</div>
          <div>• حداکثر <b>۳ seed</b> از مقدماتی به فاینال (حتی اگه ۶ شانس برده باشی)</div>
        </div>

        {/* Attempt picker */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>تعداد شانس</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 7 }}>
            {[1,2,3,4,5,6].map(n => {
              const on = attempts === n
              return (
                <button key={n} type="button" onClick={() => setAttempts(n)} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '14px 0', background: on ? '#22d3ee22' : '#121821', border: `1px solid ${on ? '#22d3ee' : '#1e293b'}`, borderRadius: 12, color: on ? '#22d3ee' : '#94a3b8', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22 }} dir="ltr">
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        {/* Cost */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '14px 16px' }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>هزینهٔ سرویس (سکه)</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>سکه = غیرقابل تبدیل به پول · شرط‌بندی نیست</div>
          </div>
          <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 26, color: '#f5c84b' }}>{totalCoins}</div>
        </div>

        {/* Legal note */}
        <div style={{ background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 11, padding: '10px 12px', fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
          جایزه‌ها از طرف حامیان مالی تأمین می‌شه. ورودی = هزینهٔ سرویس مهارتی، نه شرط‌بندی.
        </div>

        {err && <div style={{ fontSize: 12, color: '#fb7185', background: '#fb71851a', border: '1px solid #fb718533', padding: 10, borderRadius: 10 }}>{err}</div>}

        <button onClick={submit} disabled={busy} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', background: '#22d3ee', color: '#0b0f14', fontWeight: 800, fontSize: 16, padding: '14px 0', borderRadius: 12, opacity: busy ? 0.6 : 1 }}>
          {busy ? '...' : `ثبت‌نام با ${attempts} شانس`}
        </button>
      </div>
    </div>
  )
}
