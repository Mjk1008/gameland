// Email sender. Uses SMTP (Liara Mail) when configured; otherwise logs the
// message (dev/interim until the mail server + domain are live).
import nodemailer from 'nodemailer'

const cfg = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || 'گیم‌لند <no-reply@gamelandteam.ir>',
}

export const mailerReady = () => !!(cfg.host && cfg.user && cfg.pass)

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!mailerReady()) {
    console.log(`[mail:DEV] to=${to} subject=${subject}\n${html}`)
    return
  }
  const transport = nodemailer.createTransport({
    host: cfg.host, port: cfg.port, secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  })
  await transport.sendMail({ from: cfg.from, to, subject, html })
}
