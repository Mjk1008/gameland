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
    <div className="animate-fade-up" style={{ padding: '14px 16px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#1D1913', border: '1px solid #2A241C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9BFAF' }} aria-label="خانه">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(245,200,75,.12)', border: '1px solid rgba(245,200,75,.5)', color: '#F5C84B', fontSize: 10, fontWeight: 800, padding: '5px 11px', borderRadius: 999 }}>
          ★ عضو افتخاری
        </span>
      </div>

      {/* title plate */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, border: '1px solid #3A332A', background: 'linear-gradient(150deg, #241C12, #17130E 60%, #1B1426)', padding: '18px 18px 16px' }}>
        <span aria-hidden style={{ position: 'absolute', top: -60, insetInlineEnd: -40, width: 190, height: 190, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,200,75,.16), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.28em', color: '#8A7F6E' }}>GAMELAND ARCADE</div>
          <h1 style={{ margin: '7px 0 0', fontSize: 23, fontWeight: 800, color: '#F2EDE4', lineHeight: 1.5 }}>
            جنگ‌های صلیبی — <span style={{ background: 'linear-gradient(92deg,#F5C84B,#FFE9A8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>قلعهٔ خان</span>
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#A89A88', lineHeight: 2 }}>
            کویر را آباد کن، دژ را نگه دار، ده موج صلیبیون را پس بزن.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {['🏗 بساز', '⚔ دفاع کن', '🔥 قیر را آتش بزن', '🔧 تعمیر کن'].map(t => (
              <span key={t} style={{ fontSize: 10, fontWeight: 700, color: '#C9BFAF', background: '#252017', border: '1px solid #2A241C', borderRadius: 8, padding: '5px 9px' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <CrusaderGame />
    </div>
  )
}
