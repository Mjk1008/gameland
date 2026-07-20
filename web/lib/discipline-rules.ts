// Per-discipline match rules (shown on each competition's page). Keyed by the
// discipline id used across the app (fc26, pes21, efootball, nba2k26, ufc6).
// Provided by the tournament organizer — keep in sync with the printed rulebook.

export const DISCIPLINE_RULES: Record<string, { title: string; rules: string[] }> = {
  fc26: {
    title: 'EA SPORTS FC 26',
    rules: [
      'سرعت بازی: ۰',
      'حالت مسابقات: Kick-Off',
      'انتخاب تمامی تیم‌ها آزاد است.',
      'تیم Zlatan All-Star مجاز نیست.',
      'Visual Precision Shot: OFF',
      'Precision Pass: OFF',
      'در صورت قطع شدن مسابقه، بازیکن ۱۰ دقیقه فرصت بازگشت دارد.',
      'در صورت عدم بازگشت، نتیجهٔ مسابقه ۳-۰ به نفع حریف ثبت می‌شود.',
      'مسابقات به صورت حذفی (دو برد از سه بازی) برگزار می‌شود.',
    ],
  },
  pes21: {
    title: 'PES 2021',
    rules: [
      'سرعت بازی: ۰',
      'جهت حمله: راست (→)',
      'دوربین: Dynamic Wide (2-2)',
      'انتخاب تمامی تیم‌های ملی و باشگاهی آزاد است.',
      'تیم‌های منتخب (Selection Teams) مجاز نیستند.',
      'مسابقات به صورت حذفی (دو برد از سه بازی) برگزار می‌شود.',
    ],
  },
  efootball: {
    title: 'eFootball',
    rules: [
      'سرعت بازی: ۰',
      'دوربین: Dynamic Wide',
      'مسابقات به صورت Overall برگزار می‌شود.',
      'فقط تیم‌های باشگاهی لایسنس‌شدهٔ رسمی eFootball مجاز هستند.',
      'استادیوم انتخابی اهمیتی ندارد.',
      'مسابقات به صورت حذفی (دو برد از سه بازی) برگزار می‌شود.',
    ],
  },
  nba2k26: {
    title: 'NBA 2K26',
    rules: [
      'سرعت بازی: ۵۰',
      'سطح بازی: Hall of Fame',
      'دوربین: Broadcast (توافقی)',
      'انتخاب تمامی تیم‌ها آزاد است.',
      'مدت هر مسابقه: ۱۰ دقیقه',
      'مسابقات به صورت تک‌بازی برگزار می‌شود.',
      'Energy: ON',
      'Injuries: OFF',
    ],
  },
  ufc6: {
    title: 'UFC 6',
    rules: [
      'سطح بازی: Pro',
      'مسابقات در ۳ راند ۵ دقیقه‌ای برگزار می‌شود.',
      'انتخاب تمامی مبارزان رسمی بازی آزاد است.',
      'استفاده از مبارزان ساخته‌شده (Created Fighters) مجاز نیست.',
      'انتخاب وزن مسابقه با توافق دو بازیکن انجام می‌شود.',
      'در صورت عدم توافق، داور وزن مسابقه را تعیین می‌کند.',
      'مسابقات به صورت تک‌بازی و حذفی برگزار می‌شود.',
    ],
  },
}

export function rulesForDisc(disc: string) {
  return DISCIPLINE_RULES[disc]
}
