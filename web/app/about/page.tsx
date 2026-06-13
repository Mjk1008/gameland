import Link from 'next/link'

export const metadata = { title: 'دربارهٔ گیم‌لند' }

export default function AboutPage() {
  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>دربارهٔ گیم‌لند</span>
      </div>

      <section style={section}>
        <h2 style={h2}>چه چیزی هستیم</h2>
        <p style={p}>گیم‌لند، خانهٔ گیمرهای حرفه‌ای ایرانه. اینجا رنکینگ ملی، Gamer Bank، مسابقات حرفه‌ای، و یک شبکهٔ گیم‌نت رو زیر یک سقف می‌بینی.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>چهار ستون اصلی</h2>
        <ul style={ul}>
          <li><b style={{color:'#22d3ee'}}>Gamer Bank</b> — پروفایل حرفه‌ای هر بازیکن با صفحهٔ افتخارات</li>
          <li><b style={{color:'#22d3ee'}}>رنکینگ ملی</b> — امتیازدهی پایدار آفلاین‌محور</li>
          <li><b style={{color:'#22d3ee'}}>مسابقات</b> — مدل ۱-۶ شانس و ۶ براکت مقدماتی → فاینال ۱۲۸ نفره</li>
          <li><b style={{color:'#22d3ee'}}>گیم‌نت‌ها</b> — دایرکتوری و سرویس‌های مرتبط</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>چارچوب قانونی</h2>
        <p style={p}>جایزه‌ها از طرف <Link href="/sponsors" style={{ color: '#f5c84b' }}>حامیان مالی</Link> تأمین می‌شه (نه از ورودی بازیکن‌ها). ورودی هر مسابقه = هزینهٔ سرویس مهارتی، نه شرط‌بندی. کیف پول سکه‌ای غیرقابل تبدیل به پوله. این مدل با چارچوبی که IRCG (سازمان نظام صنفی رایانه‌ای) برای جام‌های قهرمانی به کار می‌بره منطبقه.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>تماس</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ContactRow label="اینستاگرام" value="@gamelandteam" href="https://instagram.com/gamelandteam"/>
          <ContactRow label="پشتیبانی" value="support@gameland.ir" href="mailto:support@gameland.ir"/>
        </div>
      </section>

      <div style={{ fontSize: 10, color: '#475569', textAlign: 'center', marginTop: 18 }}>نسخهٔ ۱.۰ · ۱۴۰۵</div>
    </div>
  )
}

const section: React.CSSProperties = { background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: 14, marginBottom: 12 }
const h2: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: 0, marginBottom: 8 }
const p: React.CSSProperties = { fontSize: 12, color: '#94a3b8', lineHeight: 1.8, margin: 0 }
const ul: React.CSSProperties = { fontSize: 12, color: '#94a3b8', lineHeight: 2, margin: 0, paddingRight: 18 }

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a href={href} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 10 }}>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
      <span dir="ltr" style={{ fontSize: 12, color: '#22d3ee', fontFamily: 'Rajdhani, sans-serif' }}>{value}</span>
    </a>
  )
}
