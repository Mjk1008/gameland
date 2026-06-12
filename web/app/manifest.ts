import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'گیم‌لند — خانهٔ گیمرهای ایران',
    short_name: 'گیم‌لند',
    description: 'مسابقات حرفه‌ای، رنکینگ ملی پایدار، پروفایل افتخارات هر بازیکن',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0f14',
    theme_color: '#0b0f14',
    orientation: 'portrait-primary',
    lang: 'fa',
    dir: 'rtl',
    categories: ['games', 'sports'],
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      // PNG icons for TWA — generate with: npm run icons
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
