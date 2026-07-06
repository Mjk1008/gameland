import Link from 'next/link'
import { allSponsors } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default function SponsorsPage() {
  const list = allSponsors()
  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>حامیان مالی</span>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(245,200,75,.08), #121821)', border: '1px solid rgba(245,200,75,.22)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f5c84b', marginBottom: 6 }}>جایزه‌ها از کجا می‌آد؟</div>
        <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
          همهٔ جایزه‌های مسابقات گیم‌لند رو برندهای زیر تأمین می‌کنن. هیچ بخشی از ورودی شرکت‌کننده‌ها به جایزه‌ها اضافه نمی‌شه.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {list.map(s => (
          <a key={s.id} href={s.website || '#'} target={s.website ? '_blank' : undefined} rel="noopener noreferrer" style={{ all: 'unset', cursor: s.website ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 12px', background: '#121821', border: '1px solid #1e293b', borderRadius: 13 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#f5c84b22', border: '1px solid #f5c84b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color: '#f5c84b' }}>{s.name[0]}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', textAlign: 'center' }}>{s.name}</span>
            {s.website && <span dir="ltr" style={{ fontSize: 9, color: '#22d3ee', fontFamily: 'Rajdhani, sans-serif' }}>{s.website.replace(/^https?:\/\//, '')}</span>}
          </a>
        ))}
      </div>
    </div>
  )
}
