import { BackHeader, C } from '@/components/ui'
import { supportChannels, SUPPORT } from '@/lib/support'

export const dynamic = 'force-dynamic'

const FAQ: { q: string; a: string }[] = [
  { q: 'چطور ثبت‌نام کنم؟', a: 'وارد شو (با کد پیامکی)، پروفایلت رو کامل کن، بعد از صفحهٔ مسابقه روی «ثبت‌نام» بزن و تعداد بلیط رو انتخاب کن.' },
  { q: 'بعد از ثبت‌نام چیکار کنم؟', a: 'بعد از واریز و ارسال رسید، ثبت‌نامت توسط ادمین تأیید می‌شه و توی «مسیر من» وضعیتت رو می‌بینی.' },
  { q: 'قوانین هر بازی کجاست؟', a: 'توی صفحهٔ هر مسابقه، بخشِ «قوانین رشته» همهٔ تنظیمات و شرایط اون بازی رو داره.' },
  { q: 'جدول و حریفم رو کجا ببینم؟', a: 'بعد از قرعه‌کشی، توی صفحهٔ مسابقه → «جدول و براکت» بازی‌ها و حریفت مشخص می‌شه.' },
]

export default function SupportPage() {
  const channels = supportChannels()
  return (
    <div className="animate-fade-up">
      <BackHeader title="پشتیبانی" href="/me" />
      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.thi }}>کمک می‌خوای؟</div>
          <div style={{ fontSize: 13, color: C.tbody, marginTop: 6, lineHeight: 1.8 }}>
            سؤال یا مشکلی داری؟ از راه‌های زیر مستقیم با تیم گیم‌لند در تماس باش. <span style={{ color: C.tmut }}>({SUPPORT.hours})</span>
          </div>
        </div>

        {channels.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {channels.map(ch => (
              <a key={ch.key} href={ch.href} target="_blank" rel="noopener noreferrer"
                style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, minHeight: 56, padding: '0 16px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: C.accentSoft, color: C.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 13 }}>{ch.label[0]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.thi }}>{ch.label}</div>
                  <div dir="ltr" style={{ fontSize: 12, color: C.tmut, marginTop: 2, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.value}</div>
                </div>
                <span style={{ color: C.tmut }}>›</span>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.tbody, background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, lineHeight: 1.9 }}>
            راه‌های تماس به‌زودی اینجا اضافه می‌شه. فعلاً از طریق پیج اینستاگرام گیم‌لند در تماس باش.
          </div>
        )}

        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.thi, marginBottom: 10 }}>سؤال‌های پرتکرار</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQ.map((f, i) => (
              <div key={i} style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 15px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.thi, marginBottom: 6 }}>{f.q}</div>
                <div style={{ fontSize: 12.5, color: C.tbody, lineHeight: 1.9 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
