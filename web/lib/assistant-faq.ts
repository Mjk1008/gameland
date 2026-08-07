import type { AssistantEntities } from './assistant-context'
import { userRankLine } from './assistant-context'
import { prizeMillionLabel, tomanFull } from './payment'
import { DISC } from './mock-data'

export function normalizeAssistantQuery(raw: string): string {
  return raw
    .replace(/[\u200c\u00a0]/g, ' ')
    .replace(/[؟?!.،,:;]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function openEvents(ent: AssistantEntities) {
  return ent.events.filter(e => e.status === 'open' || e.status === 'live')
}

/** Deterministic answers for high-volume intents — no LLM, no quota burn. */
export function tryAssistantFaq(
  uid: string,
  message: string,
  ent: AssistantEntities,
): string | null {
  const q = normalizeAssistantQuery(message)
  if (!q) return null

  if (/^(سلام|سلام وقت|درود|hi|hello)( |$)/.test(q) || q === 'سلام') {
    const hint = ent.regs.length ? '' : ' اگه می‌خوای تو مسابقه ثبت‌نام کنی بگو.'
    return `سلام 👋 چطور می‌تونم کمکت کنم؟${hint}`
  }

  if (/چه مسابق|مسابقات.*باز|کدوم مسابق|چه رشته/.test(q)) {
    const open = openEvents(ent)
    if (!open.length) return 'الان مسابقهٔ باز تو داده‌هام نیست — بعداً دوباره بپرس.'
    const names = open.map(e => e.discName).join('، ')
    return `فعلاً این رشته‌ها بازن: ${names}. جزئیات و ثبت‌نام از همین کارت. [[event:${open[0].id}]]`
  }

  if (/چه خبر|اخبار|خبر/.test(q)) {
    if (!ent.news.length) return 'خبر فعالی تو داده‌هام نیست.'
    return 'آخرین خبرهای گیم‌لند — بزن روشون باز می‌شن. [[news]]'
  }

  if (/رتبه|رنکینگ|امتیاز.*من|امتیازم/.test(q) && !/چط|چگ|چج/.test(q)) {
    return `${userRankLine(uid)} — لیست کامل اینجاست. [[go:/leaderboard|رنکینگ ملی]]`
  }

  if (/چرا.*تایید|تایید نشد|تایید نشده|رد شد|فیش|ناقص|پرداخت.*تایید/.test(q)) {
    if (!ent.regs.length) return 'ثبت‌نامی تو داده‌هام نیست — اول از صفحهٔ مسابقه ثبت‌نام کن. [[go:/competitions|مسابقات]]'
    const pending = ent.regs.filter(r => r.status === 'pending')
    const rejected = ent.regs.filter(r => r.status === 'rejected')
    if (pending.length) {
      return 'ثبت‌نامت رسیده و منتظر تأیید ادمینه — معمولاً بعد بررسی فیش. [[status]]'
    }
    if (rejected.length) {
      const why = rejected[0].reason ? ` دلیل: ${rejected[0].reason}.` : ''
      return `ثبت‌نامت رد شده.${why} با فیش جدید «درخواست مجدد» بده. [[status]]`
    }
    return 'ثبت‌نامت تأیید شده — تو قرعه‌ای. [[status]]'
  }

  if (/قرعه|شهری|128|صعود|مقدمات/.test(q)) {
    return 'بعد بستن ثبت‌نام قرعه می‌شه و گروه شهری مشخص می‌شه. هر سهم یک شانس جداست. مسیر شخصی: [[go:/me/competitions|مسیر من]]'
  }

  if (/مسیر.*فینال|تا فینال|براکت/.test(q)) {
    return 'مسیر شخصی‌ات بعد قرعه تو صفحهٔ همون مسابقه دیده می‌شه. [[go:/me/competitions|مسیر من]]'
  }

  if (/چط.*ثبت.?نام|چگ.*ثبت.?نام|چج.*ثبت.?نام|ثبت.?نام کن/.test(q)) {
    const open = openEvents(ent)
    if (!open.length) return 'الان ثبت‌نام باز نیست.'
    return `مسابقه رو انتخاب کن، سهم بخر، فیش آپلود کن — بعد ادمین تأیید می‌کنه. [[event:${open[0].id}]]`
  }

  if (/دعوت|ریفرال|سهم رایگان|کد دعوت|referral/.test(q)) {
    return 'کد دعوت = @تگ خودت. هر ۳ سهم تأییدشده از دعوتی‌ها = ۱ سهم رایگان (تا ۳). [[go:/invite|صفحهٔ دعوت]]'
  }

  if (/چند سهم|سقف سهم|حداکثر سهم/.test(q)) {
    return 'تا ۶ سهم در هر رشته — هر سهم یک شانس جدا تو قرعه.'
  }

  if (/ظرفیت|چند نفر|پر شد|تعداد ثبت/.test(q)) {
    const lines = ent.events
      .filter(e => e.status === 'open' || e.status === 'live')
      .map(e => `${DISC[e.disc as keyof typeof DISC]?.short ?? e.disc}: ${e.approvedShares} سهم تأییدشده`)
    if (!lines.length) return 'الان مسابقهٔ باز برای آمار ثبت‌نام ندارم.'
    return `سهم‌های تأییدشده الان: ${lines.join(' · ')}. سقف کل ظرفیت تو داده‌هام نیست.`
  }

  if (/جایزه|میلیون|تومان.*جایز/.test(q)) {
    const lines = ent.events.map(e => e.prize ? `${e.discName}: ${prizeMillionLabel(e.prize)}` : null).filter(Boolean)
    if (!lines.length) return 'جایزه‌ای تو دادهٔ مسابقات فعال نیست.'
    return `جایزهٔ کل هر رشته: ${lines.join(' · ')}`
  }

  if (/قیمت|ورودی|بلیط|تیکت|500|پانصد/.test(q)) {
    const lines = ent.events
      .filter(e => e.status === 'open' || e.status === 'live')
      .map(e => `${e.discName}: ${tomanFull(e.ticketPrice)}`)
    if (!lines.length) return 'مسابقهٔ باز برای قیمت سهم ندارم.'
    return `قیمت هر سهم: ${lines.join(' · ')} — بعد خرید فیش آپلود کن.`
  }

  if (/آنلاین|حضوری|offline|online/.test(q)) {
    return 'مسابقات گیم‌لند حضوری برگزار می‌شن — نه آنلاین. آدرس دقیق نزدیک زمان مسابقه اعلام می‌شه.'
  }

  if (/پشتیبانی|تماس|شماره|واتس|اینستا/.test(q)) {
    return 'برای پیگیری دستی از پشتیبانی اپ استفاده کن. [[go:/support|صفحهٔ پشتیبانی]]'
  }

  return null
}

/** Attach widget markers when the model (or FAQ) forgot them. */
export function assistantWidgetFallback(message: string, ent: AssistantEntities, text: string): string {
  if (/\[\[/.test(text)) return text
  const asked = normalizeAssistantQuery(message)
  const fallback =
    /خبر|اخبار|چه خبر/.test(asked) && ent.news.length ? '[[news]]'
    : /ثبت.?نام|تایید|رد|وضعیت|فیش|پرداخت/.test(asked) && ent.regs.length ? '[[status]]'
    : /رتبه|رنکینگ|امتیاز/.test(asked) ? '[[go:/leaderboard|رنکینگ ملی]]'
    : /دعوت|ریفرال|رایگان/.test(asked) ? '[[go:/invite|صفحهٔ دعوت]]'
    : /مسابق|تورن|شرکت|رشته/.test(asked) && ent.events.length ? `[[event:${ent.events[0].id}]]`
    : ''
  return fallback ? `${text}\n${fallback}` : text
}
