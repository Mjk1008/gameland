'use client'
import { useState } from 'react'
import { C } from '@/components/ui'
import { DISC } from '@/lib/mock-data'
import type { Disc } from '@/lib/mock-data'

interface Props {
  uid: string
  name: string
  tag: string
  city: string
  disc: Disc | null
  rank: number | null
  points: number
  total: number
  hasPhoto: boolean
}

// Render the gamer card on a canvas (1080×1350, IG-friendly) and share/download
// it. Pure client-side — no server work, no storage.
async function renderCard(p: Props): Promise<Blob> {
  const W = 1080, H = 1350
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const x = cv.getContext('2d')!

  await (document as any).fonts?.ready?.catch?.(() => {})

  // backdrop — broadcast dark with a soft accent glow
  x.fillStyle = '#14110D'
  x.fillRect(0, 0, W, H)
  const glow = x.createRadialGradient(W / 2, 340, 60, W / 2, 340, 700)
  glow.addColorStop(0, 'rgba(245,200,75,0.16)')
  glow.addColorStop(1, 'rgba(245,200,75,0)')
  x.fillStyle = glow
  x.fillRect(0, 0, W, H)

  // frame
  x.strokeStyle = 'rgba(245,200,75,0.35)'
  x.lineWidth = 6
  x.strokeRect(36, 36, W - 72, H - 72)

  // wordmark
  x.textAlign = 'center'
  x.fillStyle = '#F5C84B'
  x.font = `800 54px 'Saira Condensed', sans-serif`
  x.fillText('G A M E L A N D', W / 2, 150)
  x.fillStyle = 'rgba(255,255,255,0.55)'
  x.font = `600 30px Vazirmatn, sans-serif`
  x.fillText('رنکینگ ملی گیمرهای ایران', W / 2, 205)

  // avatar (photo or big initial), circular, gold ring
  const cx = W / 2, cy = 470, R = 170
  x.save()
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip()
  let drew = false
  if (p.hasPhoto) {
    try {
      const img = new Image()
      img.src = `/api/avatar/${p.uid}`
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no })
      x.drawImage(img, cx - R, cy - R, R * 2, R * 2)
      drew = true
    } catch {}
  }
  if (!drew) {
    x.fillStyle = '#2A241C'
    x.fillRect(cx - R, cy - R, R * 2, R * 2)
    x.fillStyle = '#F5C84B'
    x.font = `800 150px 'Saira Condensed', sans-serif`
    x.textBaseline = 'middle'
    x.fillText(p.tag[0]?.toUpperCase() ?? '؟', cx, cy)
    x.textBaseline = 'alphabetic'
  }
  x.restore()
  x.beginPath(); x.arc(cx, cy, R + 7, 0, Math.PI * 2)
  x.strokeStyle = '#F5C84B'; x.lineWidth = 8; x.stroke()

  // name + tag
  x.fillStyle = '#FFFFFF'
  x.font = `800 62px Vazirmatn, sans-serif`
  x.fillText(p.name, W / 2, 740)
  x.fillStyle = 'rgba(255,255,255,0.6)'
  x.font = `600 34px 'Saira Condensed', sans-serif`
  x.fillText(`@${p.tag}${p.city ? '  ·  ' + p.city : ''}`, W / 2, 795)

  // rank hero
  if (p.rank) {
    x.fillStyle = '#F5C84B'
    x.font = `800 170px 'Saira Condensed', sans-serif`
    x.fillText(`#${p.rank}`, W / 2, 990)
    x.fillStyle = 'rgba(255,255,255,0.6)'
    x.font = `600 32px Vazirmatn, sans-serif`
    x.fillText(`از ${p.total.toLocaleString('en-US')} گیمر در ایران`, W / 2, 1045)
  }

  // stats row: points + discipline
  const discName = p.disc ? DISC[p.disc]?.name ?? '' : ''
  x.fillStyle = 'rgba(255,255,255,0.85)'
  x.font = `700 40px 'Saira Condensed', sans-serif`
  x.fillText(`${p.points.toLocaleString('en-US')} PTS${discName ? '   ·   ' + discName : ''}`, W / 2, 1150)

  // footer
  x.fillStyle = 'rgba(255,255,255,0.45)'
  x.font = `600 28px 'Saira Condensed', sans-serif`
  x.fillText('gamelandteam.ir', W / 2, 1262)

  return await new Promise<Blob>((ok, no) => cv.toBlob(b => b ? ok(b) : no(new Error('render')), 'image/png'))
}

export default function ShareCard(props: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function share() {
    setErr(null); setBusy(true)
    try {
      const blob = await renderCard(props)
      const file = new File([blob], `gameland-${props.tag}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'کارت گیمر من — گیم‌لند' }).catch(() => {})
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = file.name; a.click()
        URL.revokeObjectURL(url)
      }
    } catch { setErr('ساخت کارت نشد — دوباره امتحان کن') } finally { setBusy(false) }
  }

  return (
    <div>
      <button onClick={share} disabled={busy} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: C.goldSoft, border: `1px solid ${C.gold}66`, borderRadius: 12, color: C.gold, fontWeight: 800, fontSize: 13.5, opacity: busy ? 0.6 : 1 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
        {busy ? 'در حال ساخت…' : 'کارتِ گیمرم رو بگیر و به‌اشتراک بذار'}
      </button>
      {err && <div style={{ fontSize: 11, color: C.live, marginTop: 6, textAlign: 'center' }}>{err}</div>}
    </div>
  )
}
