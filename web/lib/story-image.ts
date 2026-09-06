// Client-only: turn a picked file into the two data URLs a story needs — a
// full-size version (contain-displayed in the viewer, never cropped) and a
// small square thumbnail (for the ring, where cropping to a circle is
// expected and fine). Mirrors lib/receipt-image.ts's downscale approach.
const FULL_MAX = 1400
const THUMB_SIZE = 160

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('عکس خوانده نشد'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('فایل عکس معتبر نیست'))
      img.onload = () => resolve(img)
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export async function fileToStoryImages(file: File): Promise<{ full: string; thumb: string }> {
  const img = await loadImage(file)

  // Full — contain within FULL_MAX, no crop (§10 decision: never cut a
  // poster's text off).
  let { width: w, height: h } = img
  if (w > FULL_MAX || h > FULL_MAX) {
    const r = Math.min(FULL_MAX / w, FULL_MAX / h)
    w = Math.round(w * r); h = Math.round(h * r)
  }
  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = w; fullCanvas.height = h
  const fullCtx = fullCanvas.getContext('2d')
  if (!fullCtx) throw new Error('پردازش عکس ناموفق بود')
  fullCtx.drawImage(img, 0, 0, w, h)
  const full = fullCanvas.toDataURL('image/jpeg', 0.8)

  // Thumb — center-crop to a square, then downscale. Cropping here is fine:
  // it's a 56px ring preview, not the full-screen viewer.
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = THUMB_SIZE; thumbCanvas.height = THUMB_SIZE
  const thumbCtx = thumbCanvas.getContext('2d')
  if (!thumbCtx) throw new Error('پردازش عکس ناموفق بود')
  thumbCtx.drawImage(img, sx, sy, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE)
  const thumb = thumbCanvas.toDataURL('image/jpeg', 0.8)

  return { full, thumb }
}
