// SMS adapter — Kavenegar in production, console-log in dev.
// Triggered alongside in-app notifications for high-importance events
// (registration confirmed, draw published, match ready, advance to final).

export interface SmsMessage {
  to: string         // 09xxxxxxxxx
  template?: string  // Kavenegar verify-lookup template name
  tokens?: string[]  // tokens for the template
  text?: string      // for general (non-template) SMS
}

export async function sendSms(msg: SmsMessage): Promise<{ ok: boolean; provider: 'kavenegar' | 'stub'; messageId?: string }> {
  const apiKey = process.env.KAVENEGAR_API_KEY
  if (!apiKey) {
    console.log(`[SMS stub] → ${msg.to}: ${msg.text ?? `${msg.template}(${msg.tokens?.join(',')})`}`)
    return { ok: true, provider: 'stub' }
  }
  try {
    // Kavenegar verify-lookup is the standard for transactional SMS
    if (msg.template) {
      const url = new URL(`https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`)
      url.searchParams.set('receptor', msg.to)
      url.searchParams.set('template', msg.template)
      // Kavenegar verify/lookup: first placeholder param is `token` (not token1),
      // then token2, token3, … for %token, %token2, %token3.
      msg.tokens?.forEach((t, i) => url.searchParams.set(i === 0 ? 'token' : `token${i + 1}`, t))
      const r = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
      const j = await r.json()
      const ok = r.ok && j?.return?.status === 200
      const rc = j?.return?.status
      const rmsg = j?.return?.message
      const mid = j?.entries?.[0]?.messageid
      const dstatus = j?.entries?.[0]?.statustext   // per-message delivery text
      // Always log the Kavenegar outcome — silent success hides trial/credit issues.
      console.log(`[SMS] kavenegar verify → ${msg.to} tpl=${msg.template} return=${rc}(${rmsg}) msgid=${mid ?? '-'} delivery=${dstatus ?? '-'}`)
      if (!ok) console.error('[SMS] kavenegar verify FAILED:', JSON.stringify(j?.return || j))
      return { ok, provider: 'kavenegar', messageId: mid?.toString() }
    } else {
      const sender = process.env.KAVENEGAR_SENDER || ''
      const url = new URL(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json`)
      url.searchParams.set('receptor', msg.to)
      url.searchParams.set('message', msg.text ?? '')
      if (sender) url.searchParams.set('sender', sender)
      const r = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
      const j = await r.json()
      return { ok: r.ok, provider: 'kavenegar', messageId: j?.entries?.[0]?.messageid?.toString() }
    }
  } catch (err) {
    console.error('[SMS] send failed:', err)
    return { ok: false, provider: 'kavenegar' }
  }
}
