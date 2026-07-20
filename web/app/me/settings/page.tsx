import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById } from '@/lib/store'
import { C, BackHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!u) redirect('/login?callbackUrl=/me/settings')

  return (
    <div className="animate-fade-up">
      <BackHeader title="تنظیمات" href="/me" />
      <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section title="حساب">
          <Row href="/me/edit" label="ویرایش پروفایل" />
          <Row href="/me/competitions" label="مسابقات من" />
          <Row href="/me/notifications" label="اعلان‌ها" last />
        </Section>

        <Section title="درباره">
          <Row href="/support" label="پشتیبانی و راهنما" />
          <Row href="/about" label="دربارهٔ گیم‌لند" />
          <Row href="/rules" label="قوانین مسابقات" last />
        </Section>

        <form action="/api/auth/signout" method="POST">
          <input type="hidden" name="callbackUrl" value="/" />
          <button type="submit" style={{ all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '12px 0', fontSize: 13, fontWeight: 700, color: C.live, border: `1px solid ${C.live}44`, borderRadius: 11, background: C.liveSoft }}>
            خروج از حساب
          </button>
        </form>

        <div style={{ fontSize: 10, color: C.tmut, textAlign: 'center', marginTop: 4 }}>نسخهٔ ۱.۰ · ۱۴۰۵</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.tmut, marginBottom: 7, paddingRight: 4 }}>{title}</div>
      <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}
function Row({ href, label, last }: { href: string; label: string; last?: boolean }) {
  return (
    <Link href={href} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderBottom: last ? 'none' : `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13, color: C.thi }}>{label}</span>
      <span style={{ fontSize: 13, color: C.tmut }}>›</span>
    </Link>
  )
}
