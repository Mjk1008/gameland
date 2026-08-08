// Narrative helpers for /admin/behavior — short Persian copy from funnel counts.

export type FunnelStep = { name: string; label: string; n: number }

export function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : null
}

export function deltaPct(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export function buildBehaviorStory(funnel: FunnelStep[], days: number, prevApproved?: number) {
  const by = (name: string) => funnel.find(s => s.name === name)?.n ?? 0
  const signup = by('signup_complete')
  const approved = by('reg_approved')
  const receipt = by('receipt_submit')
  const conv = pct(approved, receipt)
  const prevConv = prevApproved != null && receipt > 0 ? pct(prevApproved, receipt) : null
  const convDelta = conv != null && prevConv != null ? conv - prevConv : null

  const period = days > 0 ? `${days} روز` : 'کل دوره'
  let body = `تو ${period}، ${signup} نفر ثبت‌نام کردن و ${approved} سهم تأیید شد`
  if (conv != null && receipt > 0) body += ` (${conv}٪ فیش‌ها).`
  else body += '.'

  if (convDelta != null && convDelta < 0) {
    body += ` گلوگاه: بعد از فیش — ${Math.abs(convDelta)}٪ کمتر از دوره قبل.`
  } else if (convDelta != null && convDelta > 0) {
    body += ` تبدیل فیش بهتر از دوره قبل (+${convDelta}٪).`
  } else if (receipt > 0 && approved === 0) {
    body += ' فیش می‌رسه ولی تأیید نمی‌شه — صف ادمین رو چک کن.'
  }

  return body
}

export type FunnelInsight = { tone: 'warn' | 'good' | 'neutral'; title: string; text: string }

export function buildFunnelInsights(funnel: FunnelStep[]): FunnelInsight[] {
  const by = (name: string) => funnel.find(s => s.name === name)?.n ?? 0
  const signup = by('signup_complete')
  const ticket = by('ticket_select')
  const pay = by('pay_page_view')
  const receipt = by('receipt_submit')
  const approved = by('reg_approved')
  const rejected = by('reg_rejected')
  const receiptConv = pct(approved, receipt)
  const payReach = pct(receipt, signup)
  const ticketReach = pct(ticket, signup)

  const out: FunnelInsight[] = []

  if (receipt > 0) {
    out.push({
      tone: receiptConv != null && receiptConv < 70 ? 'warn' : 'good',
      title: 'فیش → تأیید',
      text: receiptConv != null
        ? `${receiptConv}٪ · ${receiptConv < 70 ? 'ادمین کند شده یا یادآوری لازمه' : 'اوضاع خوبه'}`
        : '—',
    })
  }

  if (signup > 0) {
    out.push({
      tone: payReach != null && payReach < 45 ? 'warn' : 'neutral',
      title: 'ثبت‌نام → فیش',
      text: `${payReach ?? '—'}٪ تا فیش${payReach != null && payReach < 45 ? ' — اینجا می‌ریزه' : ''}`,
    })
  }

  if (ticket > 0 && signup > 0 && ticketReach != null && ticketReach < 60) {
    out.push({
      tone: 'neutral',
      title: 'ثبت‌نام → سهم',
      text: `${ticketReach}٪ می‌رن صفحه سهم`,
    })
  }

  if (rejected > 0) {
    out.push({
      tone: 'warn',
      title: 'رد شده',
      text: `${rejected} نفر · دلیل رو تو history ببین`,
    })
  }

  if (pay > receipt && pay - receipt >= 3) {
    out.push({
      tone: 'warn',
      title: 'صفحه پرداخت',
      text: `${pay - receipt} نفر رفتن ولی فیش نفرستادن`,
    })
  }

  return out.slice(0, 4)
}
