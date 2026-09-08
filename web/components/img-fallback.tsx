'use client'
import { useState } from 'react'

// Generic broken-image guard: on load failure, swap to whatever the caller
// passes as `fallback` instead of the browser's broken-image glyph. Kept
// free of any dependency on ui.tsx's tokens/JSX so ui.tsx can import this
// without a circular import — the caller builds the fallback node itself.
export default function ImgWithFallback({ src, alt = '', style, fallback, loading }: {
  src: string
  alt?: string
  style?: React.CSSProperties
  fallback: React.ReactNode
  loading?: 'lazy' | 'eager'
}) {
  const [broken, setBroken] = useState(false)
  if (broken) return <>{fallback}</>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={loading} onError={() => setBroken(true)} style={style} />
}
