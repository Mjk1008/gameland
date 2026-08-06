export function isArenaEnabled(): boolean {
  return process.env.ARENA_ENABLED === 'true' || process.env.NEXT_PUBLIC_ARENA_ENABLED === 'true'
}
