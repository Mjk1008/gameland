'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// Instant top bar when any in-app link is tapped — fixes the "frozen / bad network" feel.
export default function NavProgress() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)

  useEffect(() => { setActive(false) }, [pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      const a = el?.closest('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('tel:')) return
      const path = href.split('?')[0].split('#')[0]
      if (!path || path === pathname) return
      setActive(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])

  if (!active) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        height: 3,
        zIndex: 100,
        pointerEvents: 'none',
        overflow: 'hidden',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div className="gl-nav-progress" />
    </div>
  )
}
