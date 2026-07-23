'use client'
import { useEffect, useState } from 'react'
import { C } from '@/components/ui'

// One-time "add to home screen" nudge. Never nags:
// - already installed (standalone display-mode) → never shows
// - dismissed once → never shows again (localStorage)
// - Android/Chrome → native install via beforeinstallprompt
// - iOS Safari (no install API) → a one-time visual guide sheet
const KEY = 'gl_a2hs_done'

export default function AddToHome() {
  const [mode, setMode] = useState<'hidden' | 'android' | 'ios'>('hidden')
  const [deferred, setDeferred] = useState<any>(null)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
      if (standalone) { localStorage.setItem(KEY, 'installed'); return }

      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
      if (isIos) {
        // show after a beat so it never fights the page's first paint
        const t = setTimeout(() => setMode('ios'), 2500)
        return () => clearTimeout(t)
      }
      const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); setMode('android') }
      window.addEventListener('beforeinstallprompt', onPrompt)
      return () => window.removeEventListener('beforeinstallprompt', onPrompt)
    } catch {}
  }, [])

  function dismiss() {
    try { localStorage.setItem(KEY, 'dismissed') } catch {}
    setMode('hidden'); setShowIosGuide(false)
  }
  async function install() {
    if (!deferred) return dismiss()
    deferred.prompt()
    try { await deferred.userChoice } catch {}
    try { localStorage.setItem(KEY, 'installed') } catch {}
    setMode('hidden')
  }

  if (mode === 'hidden') return null

  return (
    <div style={{ position: 'fixed', insetInline: 12, bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))', zIndex: 60 }} className="animate-fade-up">
      <div style={{ background: C.sf1, border: `1px solid ${C.gold}55`, borderRadius: 15, padding: '13px 14px', boxShadow: '0 8px 30px rgba(0,0,0,.45)' }}>
        {!showIosGuide ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <img src="/icons/icon-192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.thi }}>گیم‌لند رو بیار رو صفحهٔ اصلی</div>
              <div style={{ fontSize: 11, color: C.tmut, marginTop: 2 }}>دسترسی یک‌لمسه، مثل یه اپِ واقعی</div>
            </div>
            <button onClick={dismiss} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: C.tmut, padding: '8px 6px' }}>بعداً</button>
            <button onClick={mode === 'android' ? install : () => setShowIosGuide(true)} style={{ all: 'unset', cursor: 'pointer', background: C.accent, color: C.ink, fontWeight: 800, fontSize: 12.5, padding: '10px 16px', borderRadius: 10 }}>
              {mode === 'android' ? 'نصب' : 'چطوری؟'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.thi, marginBottom: 8 }}>تو آیفون این‌طوری اضافه می‌شه:</div>
            <div style={{ fontSize: 12.5, color: C.tbody, lineHeight: 2.1 }}>
              ۱. پایینِ Safari دکمهٔ <b style={{ color: C.thi }}>Share</b> (مربع با فلشِ بالا) رو بزن<br />
              ۲. <b style={{ color: C.thi }}>Add to Home Screen</b> رو انتخاب کن<br />
              ۳. بالا سمتِ راست <b style={{ color: C.thi }}>Add</b> رو بزن — تمام 🎮
            </div>
            <button onClick={dismiss} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', marginTop: 12, background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 0', boxSizing: 'border-box', fontSize: 12.5, fontWeight: 700, color: C.tbody }}>اوکی، فهمیدم</button>
          </div>
        )}
      </div>
    </div>
  )
}
