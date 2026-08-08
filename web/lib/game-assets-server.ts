import fs from 'fs'
import path from 'path'
import { GAME_BANNER } from './game-assets'

/** Read a bundled banner from public/ as a data URL (server-only boot seed). */
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
