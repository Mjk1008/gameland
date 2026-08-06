import type { PlayMatchStatus } from './arena'

export function arenaStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'باز',
    matched: 'قبول شده',
    expired: 'منقضی',
    cancelled: 'لغو',
    pending_confirm: 'منتظر تأیید',
    agreed: 'بوک کنید',
    scheduled: 'زمان‌بندی شد',
    confirmed: 'تمام',
    lapsed: 'بسته شد',
  }
  return map[status] ?? status
}

export function timeAgoFa(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (sec < 60) return 'همین الان'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} دقیقه پیش`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ساعت پیش`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} روز پیش`
  return new Date(ts).toLocaleDateString('fa-IR')
}

export function canSubmitArenaResult(scheduledAt?: number): boolean {
  if (!scheduledAt) return false
  if (process.env.NODE_ENV === 'development') return true
  return Date.now() >= scheduledAt
}

export function matchPhaseIndex(status: PlayMatchStatus): number {
  if (status === 'pending_confirm') return 0
  if (status === 'agreed') return 1
  if (status === 'scheduled') return 2
  if (status === 'confirmed' || status === 'lapsed') return 3
  return -1
}

export const MATCH_PHASES = ['تأیید', 'بوک', 'بازی', 'نتیجه'] as const
