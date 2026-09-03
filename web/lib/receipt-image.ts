const MAX_CHARS = 3_000_000   // ~2.2MB decoded — a receipt photo

export function parseReceiptImage(imageData: string): { ok: true; data: string } | { ok: false; error: string; status: number } {
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(imageData)) {
    return { ok: false, error: 'عکس معتبر نیست', status: 400 }
  }
  if (imageData.length > MAX_CHARS) {
    return { ok: false, error: 'حجم عکس زیاده — یه عکس سبک‌تر بفرست', status: 413 }
  }
  return { ok: true, data: imageData }
}
