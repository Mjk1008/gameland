export type GamenetStatus = 'pending' | 'verified' | 'rejected'

export function gamenetStatusLabel(status: GamenetStatus): { text: string; color: string; bg: string } {
  if (status === 'verified') return { text: 'تأیید شده', color: '#34d399', bg: '#34d39922' }
  if (status === 'rejected') return { text: 'رد شده', color: '#fb7185', bg: '#fb718522' }
  return { text: 'در انتظار بررسی', color: '#f5c84b', bg: '#f5c84b22' }
}
