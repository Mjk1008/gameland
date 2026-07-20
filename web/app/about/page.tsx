import Link from 'next/link'

export const metadata = { title: 'دربارهٔ گیم‌لند' }

export default function AboutPage() {
  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#1E1A14', border: '1px solid #262019', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89A88' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#F6EFE4' }}>دربارهٔ گیم‌لند</span>
      </div>

      <section style={section}>
        <h2 style={h2}>گیم‌لند چیه؟</h2>
        <p style={p}>گیم‌لند خونهٔ گیمرهای حرفه‌ای ایرانه. رنکینگ ملی، Gamer Bank، مسابقه‌های حرفه‌ای و شبکهٔ گیم‌نت‌ها، همه یه‌جا.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>چهار ستون اصلی</h2>
        <ul style={ul}>
          <li><b style={{color:'#A855F7'}}>Gamer Bank</b> — پروفایل حرفه‌ای هر بازیکن، همراه با صفحهٔ افتخارات</li>
          <li><b style={{color:'#A855F7'}}>رنکینگ ملی</b> — امتیازدهی پایدار و آفلاین‌محور</li>
          <li><b style={{color:'#A855F7'}}>مسابقات</b> — با ۱ تا ۶ بلیط، ۶ براکت مقدماتی و فینال ۱۲۸ نفره</li>
          <li><b style={{color:'#A855F7'}}>گیم‌نت‌ها</b> — دایرکتوری گیم‌نت‌ها و سرویس‌های مرتبط</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>چارچوب قانونی</h2>
        <p style={p}>جایزه‌ها رو برگزارکننده تأمین می‌کنه، نه ورودی بازیکن‌ها. ورودی هر مسابقه هزینهٔ سرویس مهارتیه، نه شرط‌بندی. کیف پول سکه‌ای هم قابل تبدیل به پول نیست. این مدل با چارچوبی که سازمان نظام صنفی رایانه‌ای (IRCG) برای جام‌های قهرمانی به کار می‌بره هماهنگه.</p>
      </section>

      <section style={section}>
        <h2 style={h2}>تماس</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ContactRow label="اینستاگرام" value="@gamelandteam" href="https://instagram.com/gamelandteam"/>
          <ContactRow label="پشتیبانی" value="support@gameland.ir" href="mailto:support@gameland.ir"/>
        </div>
      </section>

      <div style={{ fontSize: 10, color: '#6E6252', textAlign: 'center', marginTop: 18 }}>نسخهٔ ۱.۰ · ۱۴۰۵</div>
    </div>
  )
}

const section: React.CSSProperties = { background: '#1E1A14', border: '1px solid #262019', borderRadius: 14, padding: 14, marginBottom: 12 }
const h2: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#F6EFE4', margin: 0, marginBottom: 8 }
const p: React.CSSProperties = { fontSize: 12, color: '#A89A88', lineHeight: 1.8, margin: 0 }
const ul: React.CSSProperties = { fontSize: 12, color: '#A89A88', lineHeight: 2, margin: 0, paddingRight: 18 }

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a href={href} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#14110D', border: '1px solid #262019', borderRadius: 10 }}>
      <span style={{ fontSize: 12, color: '#A89A88' }}>{label}</span>
      <span dir="ltr" style={{ fontSize: 12, color: '#A855F7', fontFamily: 'Rajdhani, sans-serif' }}>{value}</span>
    </a>
  )
}
