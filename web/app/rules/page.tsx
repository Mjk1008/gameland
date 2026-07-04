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
          <li>مسابقه می‌تونه <b>تک‌مرحله‌ای</b> یا <b>چندمرحله‌ای</b> باشه — ساختار فیفا: <b>مقدماتی در شهرها → فینال ۱۲۸ نفره تهران</b></li>
          <li>هر مرحله تاریخ و محل برگزاری مستقل داره</li>
          <li>همه مسابقات <b>حذفی تک</b>ه: باخت = حذف اون بلیط</li>
        </ul>
      </Section>

      <Section title="بلیط / سهم (۱ تا ۶)">
        <ul style={ul}>
          <li>هر بازیکن در هر مقدماتی <b>۱ تا ۶ بلیط</b> می‌گیره — هر بلیط یک شانس مستقل</li>
          <li>در مقدماتی، بلیط‌های یک نفر در <b>براکت‌های متفاوت</b> پخش می‌شن (با خودت روبه‌رو نمی‌شی)</li>
          <li>در فینال این استثنا نیست — بلیط‌هات ممکنه به هم بخورن</li>
          <li>بلیط = شانس دوباره؛ بلیط بیشتر = شانس بیشتر برای رسوندن <b>۳ seed</b> به فینال</li>
        </ul>
      </Section>

      <Section title="صعود و قرعه‌کشی">
        <ul style={ul}>
          <li>سهمیه صعود هر شهر رو <b>ادمین</b> تعیین می‌کنه (متناسب با تعداد شرکت‌کننده)</li>
          <li>تعداد صعود هر براکت از قبل مشخص و <b>قابل‌نمایش</b>ه (سیت‌های سبز)</li>
          <li>سقف <b>۳ seed</b> از هر بازیکن به فینال ۱۲۸ (حتی با ۶ بلیط)</li>
          <li>قرعه‌کشی <b>مخفی</b>ه تا وقتی ادمین رونمایی کنه — دستی یا تصادفی</li>
        </ul>
      </Section>

      <Section title="امتیازدهی رنکینگ ملی">
        <ul style={ul}>
          <li>قهرمان <b>۱۰۰۰</b> · دوم <b>۸۰۰</b> · سوم <b>۵۰۰</b> · چهارم <b>۴۰۰</b></li>
          <li>۵–۸: ۲۵۰ · ۹–۱۶: ۱۵۰ · ۱۷–۳۲: ۸۰ · ۳۳–۶۴: ۴۰ · ۶۵–۱۲۸: ۲۰</li>
          <li>ضریب تایر: ماژور ×۱.۰ · گیم‌لند ×۰.۸ · آل‌استار ×۰.۵ · محلی ×۰.۳</li>
          <li>پنجرهٔ <b>۵۲ هفتهٔ اخیر</b>؛ عناوین قهرمانی هیچ‌وقت منقضی نمی‌شن</li>
        </ul>
      </Section>

      <Section title="رفع تساوی">
        <ol style={ol}>
          <li>امتیاز بیشتر</li>
          <li>تعداد مسابقات بیشتر</li>
          <li>بهترین مقام تاریخی</li>
          <li>تازه‌ترین رویداد</li>
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
          <li>تأخیر بیش از حد مجاز برای بازی → باخت تکنیکی (no-show)</li>
        </ul>
      </Section>

      <Section title="قوانین اختصاصی هر بازی">
        <p style={p}>هر مسابقه علاوه بر این قوانین عمومی، قوانین اختصاصی بازی خودش (مدت بازی، تنظیمات، محدودیت‌ها) رو داره که موقع برگزاری همون ایونت اعلام می‌شه.</p>
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
