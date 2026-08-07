import {
  getUserById, activityPointsOf, approvedReferralCount, allUsers,
  allEvents, allCompetitions, registrationsForUser, notifsForUser,
  remainingTickets, getSetting, AI_KNOWLEDGE_KEY, approvedRegistrationsForComp,
  activeNews,
} from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { prizeMillionLabel, tomanFull } from '@/lib/payment'
import { ticketPriceFor } from '@/lib/ticket-price'

export interface AssistantEntities {
  events: {
    id: string; title: string; disc: string; discName: string
    status: string; statusLabel: string; prize: number
    date: string; location: string; format: string
    deadlineDays: number | null; registered: boolean; canBuy: number
    ticketPrice: number; approvedShares: number
  }[]
  news: { id: string; title: string; excerpt: string; body: string; tags: string[]; cover: string; at: number }[]
  regs: { comp: string; status: string; attempts: number; reason?: string; href: string }[]
}

export function buildAssistantEntities(uid: string): AssistantEntities {
  const comps = new Map(allCompetitions().map(c => [c.id, c]))
  const myRegs = registrationsForUser(uid)
  const regByComp = new Map(myRegs.map(r => [r.compId, r]))

  const events = allEvents()
    .filter(e => e.status !== 'done')
    .slice(0, 8)
    .map(e => {
      const parent = e.competitionId ? comps.get(e.competitionId) : undefined
      const reg = regByComp.get(e.id)
      const approved = approvedRegistrationsForComp(e.id)
      const approvedShares = approved.reduce((s, r) => s + r.attempts, 0)
      return {
        id: e.id,
        title: e.title,
        disc: e.disc,
        discName: DISC[e.disc]?.name ?? e.disc,
        status: e.status,
        statusLabel: e.statusLabel,
        prize: e.prize,
        date: e.date || parent?.date || '',
        location: parent?.location || '',
        format: e.format || '',
        deadlineDays: e.regDeadline && e.regDeadline > Date.now()
          ? Math.max(1, Math.ceil((e.regDeadline - Date.now()) / 86400000))
          : null,
        registered: !!reg && reg.status !== 'rejected',
        canBuy: remainingTickets(uid, e.id),
        ticketPrice: ticketPriceFor(e.id).price,
        approvedShares,
      }
    })

  const newsRows = activeNews().slice(0, 6).map(n => ({
    id: n.id,
    title: n.title,
    excerpt: n.body.replace(/\s+/g, ' ').slice(0, 90),
    body: n.body,
    tags: n.tags,
    cover: n.imageData.startsWith('data:') ? `/api/news-image/${n.id}` : n.imageData,
    at: n.createdAt,
  }))

  const evTitle = new Map(allEvents().map(e => [e.id, e.title]))
  const regs = myRegs.map(r => ({
    comp: evTitle.get(r.compId) ?? r.compId,
    status: r.status,
    attempts: r.attempts,
    reason: r.rejectReason,
    href: r.status === 'rejected' ? `/competitions/${r.compId}/register` : `/competitions/${r.compId}/me`,
  }))

  return { events, news: newsRows, regs }
}

export function userRankLine(uid: string): string {
  const gamers = allUsers().filter(x => x.role === 'gamer')
  const pts = new Map(gamers.map(g => [g.id, (g.bonusPoints ?? 0) + activityPointsOf(g)]))
  const order = [...gamers].sort((a, b) => (pts.get(b.id) ?? 0) - (pts.get(a.id) ?? 0))
  const rankIdx = order.findIndex(g => g.id === uid)
  if (rankIdx < 0) return 'رتبهٔ ملی: این حساب گیمر نیست.'
  return `رتبهٔ ملی: #${rankIdx + 1} از ${gamers.length} — امتیاز: ${pts.get(uid) ?? 0}`
}

/** Compact live snapshot — sole source of truth for the model. */
export function assistantContextBlock(uid: string, ent: AssistantEntities): string {
  const u = getUserById(uid)!
  const knowledge = getSetting(AI_KNOWLEDGE_KEY).trim().slice(0, 2200)

  const regLines = ent.regs.length
    ? ent.regs.map(r => {
        const st = r.status === 'approved' ? 'تایید ✓'
          : r.status === 'pending' ? 'منتظر ادمین'
          : 'رد'
        return `• ${r.comp}: ${r.attempts} سهم — ${st}${r.reason ? ` (${r.reason})` : ''}`
      }).join('\n')
    : '• ثبت‌نام ندارد'

  const evLines = ent.events.length
    ? ent.events.map(e => {
        const bits = [
          `id=${e.id}`,
          e.discName,
          e.statusLabel,
          e.date || 'تاریخ؟',
          e.location ? `محل:${e.location}` : '',
          e.format || '',
          e.prize ? `جایزه:${prizeMillionLabel(e.prize)}` : '',
          `قیمت سهم:${tomanFull(e.ticketPrice)}`,
          `سهم تأییدشده کل:${e.approvedShares}`,
          e.deadlineDays ? `${e.deadlineDays}روز تا بستن` : '',
          e.registered ? 'کاربر ثبت‌نام کرده' : (e.status === 'open' ? `می‌تونه ${e.canBuy} سهم بخره` : ''),
        ].filter(Boolean)
        return `• «${e.title}» ${bits.join(' | ')}`
      }).join('\n')
    : '• مسابقهٔ فعال نیست'

  const notifs = notifsForUser(uid).slice(0, 3)
  const notifLines = notifs.length
    ? notifs.map(n => `• ${n.title}: ${n.body.slice(0, 70)}`).join('\n')
    : '• —'

  return `### وضعیت لحظه‌ای (تنها منبع معتبر)
${u.name} @${u.tag}${u.city ? ` · ${u.city}` : ''}
${userRankLine(uid)}
سهم رایگان:${u.freeTickets ?? 0} · دعوت تأییدشده:${approvedReferralCount(uid)}

ثبت‌نام‌ها:
${regLines}

اعلان:
${notifLines}

مسابقات:
${evLines}

اخبار: ${ent.news.length ? ent.news.map(n => n.title).join('، ') : '—'}${knowledge ? `

### دانستنی رسمی
${knowledge}` : ''}`
}

export const ASSISTANT_SYSTEM = `تو «دستیار گیم‌لند» هستی — مسابقات ایسپورت ایران.

لحن: فارسی محاوره‌ای، کوتاه، ۲–۴ جمله. بدون لیست شماره‌دار مگر کاربر بخواد.
قانون طلایی: فقط از «وضعیت لحظه‌ای» بگو. نبود → «تو داده‌های من نیست» + [[go:/support|پشتیبانی]]. حدس ممنوع.
جایزه‌ها به **میلیون تومان** هستند (مثلاً 100 = صد میلیون). قیمت سهم = ticketPrice به تومان کامل.
ثبت‌نام: تا ۶ سهم/رشته، فیش آپلود، تأیید ادمین. رد → درخواست مجدد.
قرعه شهری بعد بستن ثبت‌نام. هر سهم یک شانس. حداکثر ۳ سید به فینال.
دعوت: @تگ = کد؛ هر ۳ سهم تأییدشده دعوتی = ۱ سهم رایگان (حداکثر ۳).
نشانه‌ها (حداکثر ۲): [[event:ID]] [[news]] [[status]] [[go:/path|متن]]
مسیرها: /competitions /leaderboard /invite /me /me/competitions /rules /support
تریک FC26/PES/eFootball/UFC/NBA: کوتاه و عملی.`
