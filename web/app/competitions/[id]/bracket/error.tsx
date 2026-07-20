'use client'
// Bracket-scoped error boundary. The product owner reported a rare white-screen
// when a bracket completes; we could not reproduce it, so this is the safety net:
// a completed/edge-case bracket that ever throws now degrades to a message + retry
// instead of a blank page, and logs the real error for diagnosis.
import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { C, DISP, Button } from '@/components/ui'

export default function BracketError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams()
  const id = (params?.id as string) || ''
  useEffect(() => { console.error('[bracket error]', error?.message, error?.digest, error?.stack) }, [error])

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '32px 22px', textAlign: 'center' }}>
      <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 46, color: C.accent, lineHeight: 1 }}>⌁</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.thi }}>جدول موقتاً باز نشد</span>
        <span style={{ fontSize: 13, color: C.tbody, lineHeight: 1.8 }}>
          نمایشِ براکت یه لحظه به مشکل خورد. دوباره امتحان کن — بازی‌ها و نتایجت جاشون امنه.
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 240 }}>
        <Button onClick={() => reset()}>تلاش دوباره</Button>
        <Button kind="secondary" href={id ? `/competitions/${id}` : '/competitions'}>برگشت به مسابقه</Button>
      </div>
    </div>
  )
}
