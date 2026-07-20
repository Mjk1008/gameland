'use client'
// App-wide error boundary. Without this, any render throw white-screens the whole
// app (and swallows the message). This degrades gracefully AND logs the error so
// it shows up in the browser console / monitoring instead of vanishing.
import { useEffect } from 'react'
import { C, DISP, Button } from '@/components/ui'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the real error — was previously swallowed by the missing boundary.
    console.error('[app error]', error?.message, error?.digest, error?.stack)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '32px 22px', textAlign: 'center' }}>
      <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 54, color: C.accent, lineHeight: 1 }}>:(</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.thi }}>یه مشکلی پیش اومد</span>
        <span style={{ fontSize: 13, color: C.tbody, lineHeight: 1.8 }}>
          این صفحه درست بارگذاری نشد. یه بار دیگه امتحان کن — اگه باز هم بود، بعداً سر بزن.
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 240 }}>
        <Button onClick={() => reset()}>تلاش دوباره</Button>
        <Button kind="secondary" href="/">برگشت به خانه</Button>
      </div>
    </div>
  )
}
