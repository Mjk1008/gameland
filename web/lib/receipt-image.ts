// Client-only: downscale a receipt photo to a compact JPEG data URL before
// upload. Shared by the register form (receipt attached at checkout) and the
// /pay page (legacy/standalone upload for a registration that already exists).
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('عکس خوانده نشد'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('فایل عکس معتبر نیست'))
      img.onload = () => {
        const MAX = 1400
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r) }
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d'); if (!ctx) return reject(new Error('پردازش عکس ناموفق بود'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
