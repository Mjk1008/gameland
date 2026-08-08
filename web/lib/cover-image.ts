// Client-side cover compression — 16:9 banners for competition/event cards.
export function compressCoverImage(file: File, maxEdge = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('عکس خوانده نشد'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('فایل عکس معتبر نیست'))
      img.onload = () => {
        let { width: w, height: h } = img
        if (w > maxEdge || h > maxEdge) {
          const r = Math.min(maxEdge / w, maxEdge / h)
          w = Math.round(w * r)
          h = Math.round(h * r)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('پردازش عکس ناموفق بود'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
