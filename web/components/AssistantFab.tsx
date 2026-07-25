'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Presence policy: the assistant lives on every browse surface. It hides ONLY
// where it would hurt — the chat itself, auth/profile-completion forms, the
// purchase funnel (register/pay), admin workspace, and the zoom/drag bracket.
const HIDE_PREFIXES = ['/assistant', '/login', '/signup', '/welcome', '/forgot', '/reset', '/admin']
const HIDE_SUFFIXES = ['/register', '/pay', '/bracket']

// The assistant's floating entry — deliberately NOT a generic support-bot
// bubble: a glassy capsule with a slowly-rotating gold↔purple energy ring,
// a breathing glow, and the product's own voice. Portaled to <body> so page
// transforms can never re-anchor it (the fixed-position containing-block trap).
export default function AssistantFab() {
  const [mounted, setMounted] = useState(false)
  const path = usePathname()
  const { status } = useSession()
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  if (status !== 'authenticated') return null
  if (HIDE_PREFIXES.some(p => path?.startsWith(p))) return null
  if (HIDE_SUFFIXES.some(sfx => path?.endsWith(sfx))) return null

  return createPortal(
    <>
      <Link href="/assistant" aria-label="دستیار گیم‌لند" className="glai-wrap">
        <span className="glai-ring" aria-hidden />
        <span className="glai-body">
          <span className="glai-orb" aria-hidden>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1A1508" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8z" />
              <path d="M19 15l.7 1.8L21.5 18l-1.8.7L19 20.5l-.7-1.8L16.5 18l1.8-.7z" />
            </svg>
          </span>
          <span className="glai-txt">
            <span className="glai-title">دستیار گیم‌لند</span>
            <span className="glai-sub">بپرس، جوابِ خودتو می‌گیری</span>
          </span>
        </span>
      </Link>
      <style jsx global>{`
        .glai-wrap {
          position: fixed;
          bottom: calc(80px + env(safe-area-inset-bottom, 0px));
          inset-inline-start: 14px;
          z-index: 45;
          display: block;
          border-radius: 999px;
          padding: 1.5px;
          text-decoration: none;
          animation: glaiBreathe 3.6s ease-in-out infinite;
        }
        .glai-ring {
          position: absolute; inset: 0; border-radius: 999px; overflow: hidden;
        }
        .glai-ring::before {
          content: ''; position: absolute; inset: -60%;
          background: conic-gradient(from 0deg, #F5C84B, #A855F7 35%, transparent 55%, #F5C84B 80%, #F5C84B);
          animation: glaiSpin 4.5s linear infinite;
        }
        .glai-body {
          position: relative;
          display: flex; align-items: center; gap: 9px;
          background: rgba(18, 15, 11, .86);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border-radius: 999px;
          padding: 8px 15px 8px 17px;
        }
        .glai-orb {
          width: 30px; height: 30px; border-radius: 999px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #FFE9A8, #F5C84B 55%, #E8B429);
          box-shadow: 0 0 14px rgba(245, 200, 75, .5);
        }
        .glai-txt { display: flex; flex-direction: column; gap: 1px; }
        .glai-title { font-size: 12px; font-weight: 800; color: #F5C84B; line-height: 1.5; }
        .glai-sub { font-size: 9px; color: rgba(242, 237, 228, .55); line-height: 1.4; }
        @keyframes glaiSpin { to { transform: rotate(360deg) } }
        @keyframes glaiBreathe {
          0%, 100% { filter: drop-shadow(0 6px 18px rgba(245, 200, 75, .18)); transform: translateY(0) }
          50% { filter: drop-shadow(0 10px 26px rgba(245, 200, 75, .34)); transform: translateY(-2px) }
        }
        .glai-wrap:active .glai-body { transform: scale(.97) }
        @media (prefers-reduced-motion: reduce) {
          .glai-wrap, .glai-ring::before { animation: none }
        }
      `}</style>
    </>,
    document.body
  )
}
