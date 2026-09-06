'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { C } from '@/components/ui'
import { STORY_IMAGE_DURATION_MS } from '@/lib/stories-shared'
import type { StoryItem } from '@/lib/today-snapshot'

// Fullscreen story viewer — one unified pointer state machine, not three
// competing gesture handlers (docs/37 §4.3/§9.6). The list is a snapshot
// taken at open time by the parent; it never re-reads live polling data
// while open (docs/37 §4.1 — a mid-view expiry/delete must not shift the
// index under the user).
const TAP_MAX_MS = 250
const DRAG_THRESHOLD_PX = 10
const CLOSE_DRAG_PX = 80
const LOAD_TIMEOUT_MS = 6000

type Phase = 'loading' | 'playing' | 'paused' | 'errored'

export default function StoryViewer({ stories, startIndex, onClose, onSeen }: {
  stories: StoryItem[]
  startIndex: number
  onClose: () => void
  onSeen: (ids: string[]) => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [phase, setPhase] = useState<Phase>('loading')
  const [progress, setProgress] = useState(0)   // 0..1 within the current story
  const [dragY, setDragY] = useState(0)
  const [allFailed, setAllFailed] = useState(false)

  const genRef = useRef(0)
  const rafRef = useRef<number>()
  const lastTsRef = useRef<number>(0)
  const elapsedRef = useRef(0)
  const failCountRef = useRef(0)
  const seenRef = useRef<Set<string>>(new Set())
  const flushedRef = useRef<Set<string>>(new Set())
  const pointerRef = useRef({ x0: 0, y0: 0, t0: 0, dragging: false })
  const containerRef = useRef<HTMLDivElement>(null)

  const total = stories.length
  const current = stories[index]

  const flushSeen = useCallback(() => {
    const fresh = [...seenRef.current].filter(id => !flushedRef.current.has(id))
    if (fresh.length === 0) return
    fresh.forEach(id => flushedRef.current.add(id))
    onSeen(fresh)
  }, [onSeen])

  const markSeen = useCallback((id: string) => { seenRef.current.add(id) }, [])

  // ─── portal lifecycle: body scroll lock + back-button history entry ─────
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    history.pushState({ storyViewer: true }, '')
    const onPop = () => onClose()
    window.addEventListener('popstate', onPop)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('popstate', onPop)
      flushSeen()
      if (history.state?.storyViewer) history.back()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── background/foreground: pause on hidden, resume from same elapsed ──
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { setPhase(p => (p === 'playing' ? 'paused' : p)); flushSeen() }
      else if (phase === 'paused') setPhase('playing')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ─── advance / retreat ───────────────────────────────────────────────
  const goTo = useCallback((next: number) => {
    // Restarting the current (already-loaded) story — no new media to wait
    // on, so go straight to 'playing' instead of 'loading' (an unchanged
    // <img src> won't re-fire onLoad to get it out of 'loading' itself).
    if (next < 0) { elapsedRef.current = 0; setProgress(0); setPhase('playing'); return }
    if (next >= total) { onClose(); return }
    if (current) markSeen(current.id)
    genRef.current++
    elapsedRef.current = 0
    setProgress(0)
    setPhase('loading')
    setIndex(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, current, markSeen, onClose])

  // ─── media load / error (generation-guarded — a late load for a story
  // the user has already tapped past must not start its timer) ──────────
  const onMediaLoad = useCallback((gen: number) => {
    if (gen !== genRef.current) return
    failCountRef.current = 0
    setPhase('playing')
  }, [])
  const onMediaError = useCallback((gen: number) => {
    if (gen !== genRef.current) return
    failCountRef.current++
    if (failCountRef.current >= total) { setAllFailed(true); setPhase('errored'); return }
    goTo(index + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, index])

  // load timeout — a story stuck loading longer than LOAD_TIMEOUT_MS is
  // treated as failed rather than hanging forever
  useEffect(() => {
    if (phase !== 'loading') return
    const gen = genRef.current
    const t = setTimeout(() => onMediaError(gen), LOAD_TIMEOUT_MS)
    return () => clearTimeout(t)
  }, [phase, index, onMediaError])

  // ─── the timer: rAF loop, only ticks while phase === 'playing' ─────────
  useEffect(() => {
    if (phase !== 'playing') { lastTsRef.current = 0; return }
    function tick(ts: number) {
      if (!lastTsRef.current) lastTsRef.current = ts
      const dt = ts - lastTsRef.current
      lastTsRef.current = ts
      elapsedRef.current += dt
      const p = Math.min(1, elapsedRef.current / STORY_IMAGE_DURATION_MS)
      setProgress(p)
      if (p >= 1) { goTo(index + 1); return }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index])

  // ─── one pointer state machine — pause-on-down, tap-if-fast, drag-to-
  // dismiss, hold-to-pause, all resolved by timing/distance, not separate
  // competing handlers (docs/37 §4.3) ─────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    pointerRef.current = { x0: e.clientX, y0: e.clientY, t0: Date.now(), dragging: false }
    if (phase === 'playing') setPhase('paused')
  }
  function onPointerMove(e: React.PointerEvent) {
    const p = pointerRef.current
    const dx = e.clientX - p.x0, dy = e.clientY - p.y0
    // Only a vertical, downward-dominant move is a drag-to-dismiss — the only
    // drag gesture this viewer has. A real thumb tap on a touchscreen almost
    // always drifts a few px sideways; flagging that as "dragging" here used
    // to swallow the tap entirely (onPointerUp's drag branch never calls
    // goTo), so back/next silently no-op'd on real devices even though a
    // zero-jitter synthetic click always worked. Requiring |dy| to dominate
    // |dx| lets horizontal jitter resolve as the tap it was meant to be.
    if (!p.dragging && dy > DRAG_THRESHOLD_PX && dy > Math.abs(dx)) p.dragging = true
    if (p.dragging && dy > 0) setDragY(dy)
  }
  function onPointerUp(e: React.PointerEvent) {
    const p = pointerRef.current
    const dy = e.clientY - p.y0
    const dt = Date.now() - p.t0
    if (p.dragging) {
      setDragY(0)
      if (dy > CLOSE_DRAG_PX) { onClose(); return }
      if (phase === 'paused') setPhase('playing')
      return
    }
    if (dt < TAP_MAX_MS) {
      // zone computed from the live rect, not a size captured on mount —
      // survives rotation/resize (docs/37 §4.3)
      const rect = containerRef.current?.getBoundingClientRect()
      const w = rect?.width ?? window.innerWidth
      const xInBox = e.clientX - (rect?.left ?? 0)
      if (xInBox < w * 0.3) goTo(index - 1)
      else goTo(index + 1)
      return
    }
    // held past TAP_MAX_MS without dragging → resume from where it paused
    if (phase === 'paused') setPhase('playing')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!current) return null

  return createPortal(
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'fixed', inset: 0, zIndex: 120, background: '#000',
        touchAction: 'none', userSelect: 'none',
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        opacity: dragY ? Math.max(0.4, 1 - dragY / 400) : 1,
        transition: dragY ? 'none' : 'transform .18s ease-out, opacity .18s ease-out',
      }}>
      {/* progress bar */}
      <div style={{ position: 'absolute', top: 'calc(8px + env(safe-area-inset-top))', insetInlineStart: 8, insetInlineEnd: 8, display: 'flex', gap: 4, direction: 'ltr', zIndex: 2 }}>
        {stories.map((s, i) => (
          <span key={s.id} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,.3)', overflow: 'hidden' }}>
            <span style={{
              display: 'block', height: '100%', background: '#fff',
              width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
            }} />
          </span>
        ))}
      </div>

      {/* close — its own pointerdown layer above the tap zones, so a tap
          meant for ✕ never reaches the advance/retreat handler underneath */}
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onClick={onClose}
        aria-label="بستن"
        style={{
          all: 'unset', position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', insetInlineEnd: 12, zIndex: 3,
          width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(11,10,8,.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,.25)', cursor: 'pointer',
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>

      {/* media */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* blurred fill so a non-9:16 image never gets cropped or letterboxed
            with an ugly bar (docs/37 §5.1) */}
        <img aria-hidden src={`/api/story-media/${current.id}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(24px) brightness(.5)', transform: 'scale(1.15)' }} />
        <img
          key={current.id}
          src={`/api/story-media/${current.id}`}
          alt=""
          onLoad={() => onMediaLoad(genRef.current)}
          onError={() => onMediaError(genRef.current)}
          style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
        {phase === 'loading' && (
          <span style={{ position: 'absolute', width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'storySpin .8s linear infinite' }} />
        )}
      </div>

      {allFailed && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ color: '#fff', fontSize: 13.5 }}>بارگذاری نشد</span>
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={onClose}
            style={{ all: 'unset', cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 700, padding: '8px 16px', border: `1px solid ${C.accent}`, borderRadius: 10 }}>
            بستن
          </button>
        </div>
      )}

      {/* preload the next story's media so advancing never shows a blank
          flash — only current + next are mounted, not the whole list */}
      {index + 1 < total && <link rel="preload" as="image" href={`/api/story-media/${stories[index + 1].id}`} />}

      <style>{'@keyframes storySpin { to { transform: rotate(360deg) } }'}</style>
    </div>,
    document.body,
  )
}
