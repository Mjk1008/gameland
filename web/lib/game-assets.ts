// Bundled 16:9 discipline banners — safe for client + server imports.
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
