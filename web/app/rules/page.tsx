import Link from 'next/link'

export const metadata = { title: 'قوانین مسابقات' }

export default function RulesPage() {
  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>قوانین مسابقات</span>
      </div>

      <Section title="ساختار مسابقه">
        <ul style={ul}>
          <li>هر بازیکن می‌تونه <b>۱ تا ۶ شانس</b> بخره</li>
          <li>هر شانس = یک ورود به یکی از ۶ <b>براکت مقدماتی</b></li>
          <li>قهرمان هر براکت → <b>فاینال ۱۲۸ نفره</b></li>
          <li>حداکثر <b>۳ seed</b> از مقدماتی به فاینال (حتی با ۶ شانس)</li>
        </ul>
      </Section>

      <Section title="امتیازدهی رنکینگ ملی">
        <ul style={ul}>
          <li>قهرمان مسابقه: <b>۱۰۰۰</b> امتیاز</li>
          <li>نایب‌قهرمان: <b>۸۰۰</b> امتیاز</li>
          <li>سوم: <b>۵۰۰</b> امتیاز</li>
          <li>تیم منتخب (آل‌استار): ۵۰۰ / ۳۰۰ / ۱۵۰</li>
          <li>۳۲ نفر برتر: <b>۳۰</b> امتیاز</li>
          <li>ضریب رویداد در امتیاز ضرب می‌شه (تورنمنت محلی × ۰.۵، ملی × ۱، بین‌المللی × ۲)</li>
        </ul>
      </Section>

      <Section title="رفع تساوی">
        <ol style={ol}>
          <li>تعداد مسابقات بیشتر</li>
          <li>بهترین مقام تاریخی</li>
          <li>تازه‌ترین قهرمانی</li>
        </ol>
      </Section>

      <Section title="چارچوب مالی">
        <p style={p}>جایزه‌ها صرفاً از طرف <Link href="/sponsors" style={{ color: '#f5c84b' }}>حامیان مالی</Link> تأمین می‌شه. هیچ بخشی از ورودی بازیکنان به جایزه نمی‌ره. ورودی = هزینهٔ سرویس مهارتی (organizing fee). این چارچوب با ماده ۷۰۵ قانون مجازات اسلامی منافات نداره، چون عناصر تعریف قمار (شرط‌بندی مالی + شانس) برقرار نیستن.</p>
      </Section>

      <Section title="رفتار حرفه‌ای">
        <ul style={ul}>
          <li>توهین، تهدید یا تخریب حریف → اخطار، در تکرار حذف از مسابقه</li>
          <li>استفاده از چیت/هک → حذف دائم و حذف امتیاز رنکینگ تاریخی</li>
          <li>چندحسابی → ادغام حساب‌ها و کسر امتیاز</li>
          <li>اتصال ضعیف یا قطع تماس عمدی → باخت تکنیکی</li>
        </ul>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: 0, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  )
}

const ul: React.CSSProperties = { fontSize: 12, color: '#94a3b8', lineHeight: 2, margin: 0, paddingRight: 18 }
const ol: React.CSSProperties = { ...ul }
const p: React.CSSProperties = { fontSize: 12, color: '#94a3b8', lineHeight: 1.8, margin: 0 }
