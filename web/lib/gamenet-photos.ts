export const GAMENET_PHOTO_MAX = 6
export const GAMENET_PHOTO_MAX_CHARS = 2_000_000 // ~1.5MB decoded; client compresses first

export function isValidPhotoDataUrl(s: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s) && s.length <= GAMENET_PHOTO_MAX_CHARS
}

// Downscale + re-encode to a light JPEG before upload.
export function compressGamenetPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        const W = Math.min(1280, img.width)
        const H = Math.round((img.height / img.width) * W)
        const cv = document.createElement('canvas')
        cv.width = W; cv.height = H
        cv.getContext('2d')!.drawImage(img, 0, 0, W, H)
        resolve(cv.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = fr.result as string
    }
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}
