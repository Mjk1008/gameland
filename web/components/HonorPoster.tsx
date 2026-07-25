// Home-page entry point for the honorary arcade. Renders nothing at all for
// everyone else — including when the feature is switched off — so the only
// footprint on the shared home page is the two lines that mount it.
import Link from 'next/link'
import { C, DISP } from './ui'
import { isHonoraryUser } from '@/lib/honor'

export default async function HonorPoster() {
  if (!(await isHonoraryUser())) return null

  return (
    <Link
      href="/arcade"
      className="animate-fade-up"
      style={{
        all: 'unset', cursor: 'pointer', display: 'block', position: 'relative',
        overflow: 'hidden', borderRadius: 16, border: `1px solid ${C.gold}`,
        boxShadow: `0 0 0 1px ${C.goldSoft}, 0 12px 34px rgba(0,0,0,.5)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/games/crusader-poster.jpeg"
        alt="Stronghold Crusader"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />

      {/* bottom scrim so the caption stays readable over the art */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,8,5,.94) 0%, rgba(10,8,5,.55) 34%, transparent 62%)' }} />

      <div style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: C.goldSoft, border: `1px solid ${C.gold}`, color: C.gold, fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, backdropFilter: 'blur(6px)' }}>
        ★ عضو افتخاری
      </div>

      <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '14px 16px', display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.thi }}>جنگ‌های صلیبی — قلعهٔ خان</div>
          <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 3 }}>نسخهٔ ویژه، فقط برای تو</div>
        </div>
        <span style={{ flexShrink: 0, fontFamily: DISP, fontSize: 12.5, fontWeight: 700, letterSpacing: '.04em', color: C.ink, background: C.gold, padding: '8px 16px', borderRadius: 10 }}>
          بازی کن ›
        </span>
      </div>
    </Link>
  )
}
