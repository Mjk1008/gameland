// Generate PWA icons from SVG — run: npm run icons
// Produces public/icons/icon-192.png and icon-512.png for TWA
import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

mkdirSync(join(root, 'public/icons'), { recursive: true })

const svg = readFileSync(join(root, 'public/icons/icon.svg'))

await sharp(svg).resize(192, 192).png().toFile(join(root, 'public/icons/icon-192.png'))
console.log('✅ icon-192.png')

await sharp(svg).resize(512, 512).png().toFile(join(root, 'public/icons/icon-512.png'))
console.log('✅ icon-512.png')
