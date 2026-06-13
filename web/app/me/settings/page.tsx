import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById } from '@/lib/store'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  const u = uid ? getUserById(uid) : null
  if (!u) redirect('/login?callbackUrl=/me/settings')

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>تنظیمات</span>
      </div>

      <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Section title="حساب">
          <Row href="/me/edit"     label="ویرایش پروفایل"/>
          <Row href="/me/wallet"   label="کیف پول"/>
          <Row href="/me/competitions" label="مسابقات من"/>
          <Row href="/me/notifications" label="اعلان‌ها"/>
        </Section>

        <Section title="گیم‌نت">
          <Row href="/gamenets/new" label="ثبت گیم‌نت جدید"/>
          <Row href="/gamenets"     label="دایرکتوری گیم‌نت‌ها"/>
        </Section>

        <Section title="درباره">
          <Row href="/about"    label="دربارهٔ گیم‌لند"/>
          <Row href="/rules"    label="قوانین مسابقات"/>
          <Row href="/sponsors" label="حامیان مالی"/>
        </Section>

        <form action="/api/auth/signout" method="POST">
          <input type="hidden" name="callbackUrl" value="/"/>
          <button type="submit" style={{ all: 'unset', cursor: 'pointer', width: '100%', textAlign: 'center', padding: '12px 0', fontSize: 13, fontWeight: 700, color: '#fb7185', border: '1px solid #fb718533', borderRadius: 11, background: '#fb71850a' }}>
            خروج از حساب
          </button>
        </form>

        <div style={{ fontSize: 10, color: '#475569', textAlign: 'center', marginTop: 4 }}>
          نسخهٔ ۱.۰ · ۱۴۰۵ · <Link href="/about" style={{ color: '#64748b' }}>درباره</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 7, paddingRight: 4 }}>{title}</div>
      <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}
function Row({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderBottom: '1px solid #1e293b' }}>
      <span style={{ fontSize: 13, color: '#e2e8f0' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#475569' }}>›</span>
    </Link>
  )
}
