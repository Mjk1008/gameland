import fs from 'fs'
import path from 'path'

// Bundled 16:9 discipline banners — source of truth for default covers.
// Admin-uploaded covers in Postgres replace these per event/competition.
export const GAME_BANNER: Record<string, string> = {
  fc26: '/games/fc26-banner.jpg',
  pes21: '/games/pes21-banner.jpg',
  efootball: '/games/efootball-banner.jpg',
  ufc6: '/games/ufc6-banner.jpg',
  nba2k26: '/games/nba2k26-banner.jpg',
}

export function defaultDiscBanner(disc: string): string | undefined {
  return GAME_BANNER[disc]
}

/** Read a bundled banner from public/ as a data URL (server-only, for one-time seeding). */
export function bundledBannerDataUrl(disc: string): string | null {
  const rel = GAME_BANNER[disc]
  if (!rel) return null
  const filePath = path.join(process.cwd(), 'public', rel.replace(/^\//, ''))
  if (!fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
}
