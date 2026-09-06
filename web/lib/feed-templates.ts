// Live-feed result sentences — client-safe (no store/persistence import), so
// it's safe in both the server snapshot builder and the client feed view.
// Templates share one register/length so swapping between them never reads
// as glitchy; the pick is a deterministic hash of matchId (not Math.random)
// so a given feed row keeps the same sentence across every 8s poll instead
// of flickering to a different phrasing each time.
const TEMPLATES: ((w: string, l: string) => string)[] = [
  (w, l) => `${w} از رقیبش ${l} برد`,
  (w, l) => `${w} از رقابت با ${l} برنده بیرون اومد`,
  (w, l) => `${w} ${l} رو شکست داد`,
  (w, l) => `${w} برنده‌ی جدال حساس با ${l}`,
  (w, l) => `${w} مقابل ${l} به برتری رسید`,
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function feedSentence(matchId: string, winnerName: string, loserName: string): string {
  const tpl = TEMPLATES[hash(matchId) % TEMPLATES.length]
  return tpl(winnerName, loserName)
}
