// Honorary arcade — server-gated. Anyone who isn't the honorary account (or
// everyone, when the feature is switched off) gets a plain 404, so guessing
// the URL leaks nothing.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isHonoraryUser } from '@/lib/honor'
import CrusaderGame from './game'

export const dynamic = 'force-dynamic'

// No static `metadata` on purpose: Next still applies it to the notFound()
// render, which would leak the feature's name in the tab title of the 404
// that strangers get. The page inherits the root title instead.

export default async function ArcadePage() {
  if (!(await isHonoraryUser())) notFound()

  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/" style={{ fontSize: 13, color: '#A89A88', textDecoration: 'none' }}>‹ خانه</Link>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(245,166,35,.12)', border: '1px solid #F5A623', color: '#F5A623', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
          ★ عضو افتخاری
        </span>
      </div>

      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#F6EFE4' }}>جنگ‌های صلیبی — قلعهٔ خان</h1>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#A89A88', lineHeight: 1.9 }}>
          کویر را آباد کن، دژ را نگه دار، ده موج صلیبیون را پس بزن.
        </p>
      </div>

      <CrusaderGame />
    </div>
  )
}
