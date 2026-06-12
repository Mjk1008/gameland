// Notifications dispatch — per docs/15 Part B.
// SMS-first via domestic provider (e.g. Kavenegar). In-app + optional Telegram bot.
// Implementation here is a STUB: real providers wired in build phase.

import type { Notification } from './schema'

type Channel = 'sms' | 'in-app' | 'telegram'

export const TEMPLATES = {
  registration_ok: (data: { compName: string }) =>
    `ثبت‌نام شما در «${data.compName}» تایید شد. جزئیات در اپ گیم‌لند.`,
  match_ready: (data: { opponent: string; time: string; venue: string }) =>
    `بازی بعدی شما: مقابل ${data.opponent}، ساعت ${data.time}، در ${data.venue}.`,
  result_recorded: (data: { result: string }) =>
    `نتیجه ثبت شد: ${data.result}. روندنمای خود را در اپ ببینید.`,
  seed_earned: (data: { compName: string; seeds: number }) =>
    `🎟️ سهمیهٔ فینال «${data.compName}» را گرفتید (${data.seeds}/۳).`,
  qualified_final: (data: { compName: string }) =>
    `✅ راهی فینال «${data.compName}» شدید. تاریخ فینال به‌زودی اعلام می‌شود.`,
  schedule_change: (data: { compName: string; newTime: string }) =>
    `⚠️ زمان «${data.compName}» تغییر کرد: ${data.newTime}.`,
} as const

export type TemplateKey = keyof typeof TEMPLATES

export function buildNotification(
  playerId: string,
  template: TemplateKey,
  payload: Record<string, string | number>,
  channel: Channel = 'sms',
): Omit<Notification, 'id' | 'createdAt'> {
  return { playerId, channel, template, payload, status: 'queued' }
}

// Provider stub — swap with Kavenegar HTTP client in real build.
export async function sendSms(_phone: string, _text: string) {
  return { ok: true as const }
}
