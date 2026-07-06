import Link from 'next/link'

export const metadata = { title: 'قوانین مسابقات' }

export default function RulesPage() {
  return (
    <div className="animate-fade-up" style={{ padding: '14px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/" style={{ all: 'unset', cursor: 'pointer', width: 34, height: 34, borderRadius: 10, background: '#1E1A14', border: '1px solid #262019', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89A88' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#F6EFE4' }}>قوانین مسابقات</span>
      </div>

      <Section title="ساختار مسابقه">
        <ul style={ul}>
          <li>مسابقه می‌تونه <b>تک‌مرحله‌ای</b> یا <b>چندمرحله‌ای</b> باشه — مثل مدل فیفا: <b>مقدماتی توی شهرها → فینال ۱۲۸ نفره تهران</b></li>
          <li>هر مرحله تاریخ و محل برگزاری خودش رو داره</li>
          <li>همهٔ مسابقه‌ها <b>حذفی تک</b>ه: هر باخت یعنی حذف همون بلیط</li>
        </ul>
      </Section>

      <Section title="بلیط (۱ تا ۶)">
        <ul style={ul}>
          <li>هر بازیکن توی هر مقدماتی <b>۱ تا ۶ بلیط</b> می‌گیره — هر بلیط یه شانس جدا</li>
          <li>توی مقدماتی، بلیط‌های یه نفر توی <b>براکت‌های جدا</b> پخش می‌شن (با خودت روبه‌رو نمی‌شی)</li>
          <li>توی فینال این قاعده نیست — ممکنه بلیط‌هات به هم بخورن</li>
          <li>بلیط یعنی شانس دوباره؛ بلیط بیشتر یعنی شانس بیشتر برای رسوندن <b>۳ seed</b> به فینال</li>
        </ul>
      </Section>

      <Section title="صعود و قرعه‌کشی">
        <ul style={ul}>
          <li>سهمیهٔ صعود هر شهر رو <b>ادمین</b> تعیین می‌کنه (متناسب با تعداد شرکت‌کننده)</li>
          <li>تعداد صعودی‌های هر براکت از قبل مشخص و <b>قابل مشاهده</b>ست (سیت‌های سبز)</li>
          <li>از هر بازیکن حداکثر <b>۳ seed</b> به فینال ۱۲۸ نفره می‌ره (حتی با ۶ بلیط)</li>
          <li>قرعه‌کشی تا وقتی ادمین رونمایی نکنه <b>مخفی</b>ه — دستی یا تصادفی</li>
        </ul>
      </Section>

      <Section title="امتیازدهی رنکینگ ملی">
        <ul style={ul}>
          <li>قهرمان <b>۱۰۰۰</b> · دوم <b>۸۰۰</b> · سوم <b>۵۰۰</b> · چهارم <b>۴۰۰</b></li>
          <li>۵–۸: ۲۵۰ · ۹–۱۶: ۱۵۰ · ۱۷–۳۲: ۸۰ · ۳۳–۶۴: ۴۰ · ۶۵–۱۲۸: ۲۰</li>
          <li>ضریب تایر: ماژور ×۱.۰ · گیم‌لند ×۰.۸ · آل‌استار ×۰.۵ · محلی ×۰.۳</li>
          <li>امتیازها توی بازهٔ <b>۵۲ هفتهٔ اخیر</b> حساب می‌شن؛ ولی عنوان‌های قهرمانی هیچ‌وقت منقضی نمی‌شن</li>
        </ul>
      </Section>

      <Section title="رفع تساوی">
        <ol style={ol}>
          <li>امتیاز بیشتر</li>
          <li>تعداد مسابقهٔ بیشتر</li>
          <li>بهترین مقام تاریخی</li>
          <li>تازه‌ترین مسابقه</li>
        </ol>
      </Section>

      <Section title="چارچوب مالی">
        <p style={p}>جایزه‌ها صرفاً از طرف <Link href="/sponsors" style={{ color: '#F5A623' }}>حامیان مالی</Link> تأمین می‌شه. هیچ بخشی از ورودی بازیکنان به جایزه نمی‌ره. ورودی = هزینهٔ سرویس مهارتی (organizing fee). این چارچوب با ماده ۷۰۵ قانون مجازات اسلامی منافات نداره، چون عناصر تعریف قمار (شرط‌بندی مالی + شانس) برقرار نیستن.</p>
      </Section>

      <Section title="رفتار حرفه‌ای">
        <ul style={ul}>
          <li>توهین، تهدید یا تخریب حریف → اخطار؛ در صورت تکرار، حذف از مسابقه</li>
          <li>استفاده از چیت یا هک → حذف دائمی و صفرشدن امتیاز رنکینگ تاریخی</li>
          <li>داشتن چند حساب → ادغام حساب‌ها و کسر امتیاز</li>
          <li>اینترنت ضعیف یا قطع عمدی اتصال → باخت فنی</li>
          <li>دیرکردن بیش از حد مجاز برای بازی → باخت فنی (no-show)</li>
        </ul>
      </Section>

      <Section title="قوانین اختصاصی هر بازی">
        <p style={p}>هر مسابقه علاوه بر این قوانین عمومی، قوانین اختصاصی بازی خودش (مدت بازی، تنظیمات، محدودیت‌ها) رو داره که موقع برگزاری همون مسابقه اعلام می‌شه.</p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#1E1A14', border: '1px solid #262019', borderRadius: 14, padding: 14, marginBottom: 12 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#F6EFE4', margin: 0, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  )
}

const ul: React.CSSProperties = { fontSize: 12, color: '#A89A88', lineHeight: 2, margin: 0, paddingRight: 18 }
const ol: React.CSSProperties = { ...ul }
const p: React.CSSProperties = { fontSize: 12, color: '#A89A88', lineHeight: 1.8, margin: 0 }
