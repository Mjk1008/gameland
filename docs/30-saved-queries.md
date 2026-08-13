# ۳۰ — کوئری‌های آمادهٔ آنالیتیکس (Phase 0)

> **برای:** بنیان‌گذار / PM · **اجرا:** فقط با نقش `gameland_readonly` (ببین [`scripts/setup-readonly-analytics-role.sql`](../scripts/setup-readonly-analytics-role.sql))  
> **منبع جدول‌ها:** `web/lib/db/schema.ts` + `ensureSchema` در `web/lib/db/persistence.ts`  
> **Phase 1:** MCP سرور این کوئری‌ها را wrap می‌کند — فعلاً دستی در `psql` یا ابزار SQL.

**نکتهٔ کلی:** همهٔ تاریخ‌ها با `Asia/Tehran` گزارش می‌شوند مگر خلافش نوشته شده باشد.  
**امنیت:** روی production با نقش read-only اجرا کنید؛ `data_url` / `image_data` / محتوای چت در scope این نقش نیست.

---

## ۱. ثبت‌نام‌ها بر اساس روز (پرت‌ترین روزها)

**سؤال:** کدام روزها بیشترین درخواست ثبت‌نام (رشته) داشتیم؟

```sql
SELECT
  (created_at AT TIME ZONE 'Asia/Tehran')::date AS day_tehran,
  COUNT(*) AS registrations
FROM app_registrations
GROUP BY 1
ORDER BY registrations DESC
LIMIT 30;
```

**تفسیر:** هر سطر = یک ردیف در `app_registrations` (یک کاربر × یک رشته). یک کاربر در سه رشته = سه سطر. برای «کاربر یکتا» به کوئری ۸ یا ۱۲ نگاه کنید.

---

## ۲. ثبت‌نام‌ها بر اساس ساعت (منطقهٔ تهران)

**سؤال:** کاربران بیشتر چه ساعتی ثبت‌نام می‌کنند؟

```sql
SELECT
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tehran')::int AS hour_tehran,
  COUNT(*) AS registrations
FROM app_registrations
GROUP BY 1
ORDER BY hour_tehran;
```

**تفسیر:** ساعت ۰–۲۳ بر اساس `created_at` ردیف ثبت‌نام، نه لزوماً زمان تأیید ادمین. برای الگوی «آپلود فیش» کوئری ۹ را ببینید.

---

## ۳. ثبت‌نام‌ها بر اساس شهر

**سؤال:** از کدام شهرها بیشتر ثبت‌نام داریم؟

```sql
SELECT
  COALESCE(NULLIF(TRIM(u.city), ''), '(خالی)') AS city,
  COUNT(*) AS registrations
FROM app_registrations r
JOIN app_users u ON u.id = r.user_id
WHERE u.deleted_at IS NULL
GROUP BY 1
ORDER BY registrations DESC;
```

**تفسیر:** شهر از پروفایل کاربر (`app_users.city`) است، نه محل رویداد. شهر خالی یعنی پروفایل ناقص یا قبل از تکمیل `/welcome`.

---

## ۴. بلیت فروخته‌شده (سهم تأییدشده) بر اساس روز

**سؤال:** هر روز چند سهم **تأییدشده** فروخته شده؟

```sql
SELECT
  (r.created_at AT TIME ZONE 'Asia/Tehran')::date AS day_tehran,
  SUM(COALESCE(r.paid_attempts, r.attempts)) AS approved_tickets,
  COUNT(*) AS approved_regs
FROM app_registrations r
WHERE r.status = 'approved'
GROUP BY 1
ORDER BY day_tehran DESC;
```

**تفسیر:** `paid_attempts` بعد از تأیید ادمین مقدار نهایی سهم پرداخت‌شده است؛ اگر null باشد از `attempts` استفاده می‌شود. تاریخ = زمان **ثبت درخواست**، نه زمان approve — برای روز تأیید واقعی از رویداد `reg_approved` در کوئری ۵ یا ۱۳ استفاده کنید.

---

## ۵. قیف رفتاری از `app_track_events`

**سؤال:** در هر مرحلهٔ قیف ثبت‌نام چند نفر (یا سشن) رسیده‌اند؟

```sql
WITH funnel AS (
  SELECT
    CASE e.name
      WHEN 'signup_start'     THEN 1
      WHEN 'signup_complete'  THEN 2
      WHEN 'profile_complete' THEN 3
      WHEN 'ticket_select'    THEN 4
      WHEN 'pay_page_view'    THEN 5
      WHEN 'receipt_submit'   THEN 6
      WHEN 'reg_approved'     THEN 7
      WHEN 'reg_rejected'     THEN 8
    END AS step_order,
    e.name,
    COUNT(DISTINCT COALESCE(e.user_id, e.session_id)) AS reach
  FROM app_track_events e
  WHERE e.name IN (
    'signup_start', 'signup_complete', 'profile_complete',
    'ticket_select', 'pay_page_view', 'receipt_submit',
    'reg_approved', 'reg_rejected'
  )
  GROUP BY e.name
)
SELECT step_order, name, reach
FROM funnel
WHERE step_order IS NOT NULL
ORDER BY step_order;
```

**تفسیر:** مراحل اول (`signup_start`) ممکن است `user_id` نداشته باشند — از `session_id` شمرده می‌شود. مراحل بعدی ترجیحاً با `user_id`. `reg_approved` / `reg_rejected` سرور-side هستند (`web/lib/track-events.ts`). برای درصد تبدیل بین دو مرحلهٔ متوالی: `reach_step_n / reach_step_{n-1}`.

---

## ۶. ارجاع (referral) در مقابل ارگانیک

**سؤال:** چند کاربر با کد دعوت (`referred_by`) آمده‌اند و چند نفر ارگانیک؟

```sql
SELECT
  CASE
    WHEN referred_by IS NOT NULL AND referred_by <> '' THEN 'referral'
    ELSE 'organic'
  END AS channel,
  COUNT(*) AS users
FROM app_users
WHERE deleted_at IS NULL
  AND role = 'gamer'
GROUP BY 1
ORDER BY users DESC;
```

**تفسیر:** `referred_by` = `user_id` معرف، یک‌بار در ثبت‌نام ست می‌شود. این **کانال اکتساب** است، نه «استفاده از کد تخفیف در خرید بلیت» — آن را در کوئری ۷ ببینید.

---

## ۷. تبدیل کد پروموتر (`app_promoter_codes`)

**سؤال:** هر کد affiliate چند بار استفاده شده و چند ثبت‌نام تأییدشده دارد؟

```sql
SELECT
  pc.code,
  pc.use_count,
  pc.max_uses,
  pc.active,
  COUNT(r.id) AS total_regs,
  COUNT(r.id) FILTER (WHERE r.status = 'approved') AS approved_regs,
  COUNT(r.id) FILTER (WHERE r.status = 'pending') AS pending_regs,
  COUNT(r.id) FILTER (WHERE r.status = 'rejected') AS rejected_regs
FROM app_promoter_codes pc
LEFT JOIN app_registrations r ON r.promoter_code_id = pc.id
GROUP BY pc.id, pc.code, pc.use_count, pc.max_uses, pc.active
ORDER BY total_regs DESC;
```

**تفسیر:** `use_count` روی خود کد ممکن است با تعداد `registrations` فرق کند اگر reg هنوز pending باشد یا sync نشده باشد. ستون‌های جدول: `discount_percent`, `commission_percent`, `comp_id`, `expires_at` — جزئیات در `ensureSchema`.

---

## ۸. کاربران جدید (signup) بر اساس روز

**سؤال:** هر روز چند حساب جدید ساخته شده؟

```sql
SELECT
  (created_at AT TIME ZONE 'Asia/Tehran')::date AS day_tehran,
  COUNT(*) AS signups
FROM app_users
WHERE deleted_at IS NULL
GROUP BY 1
ORDER BY day_tehran DESC;
```

**تفسیر:** بر اساس `app_users.created_at` — با `signup_complete` در track ممکن است اختلاف چند دقیقه‌ای داشته باشد. برای رفتار قبل از لاگین، کوئری ۵ را ترکیب کنید.

---

## ۹. آپلود فیش (receipt) بر اساس ساعت

**سؤال:** کاربران بیشتر چه ساعتی فیش پرداخت آپلود می‌کنند؟

```sql
SELECT
  EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tehran')::int AS hour_tehran,
  COUNT(*) AS receipt_uploads
FROM app_receipts
GROUP BY 1
ORDER BY hour_tehran;
```

**تفسیر:** فقط **metadata** (`reg_id`, `created_at`) — بدنهٔ تصویر در scope read-only نیست. هر `reg_id` حداکثر یک فیش دارد (PK). رویداد `receipt_submit` در track برای cross-check با کوئری ۵.

---

## ۱۰. جمعیت‌شناسی `experience_years` (بدون فیلد سن)

**سؤال:** توزیع «سال‌های تجربه بازی» در پروفایل چگونه است؟

```sql
SELECT
  experience_years,
  COUNT(*) AS users,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM app_users
WHERE deleted_at IS NULL
  AND experience_years IS NOT NULL
GROUP BY experience_years
ORDER BY experience_years;
```

**تفسیر:** فیلد `age` در schema وجود ندارد — `experience_years` (INTEGER، اختیاری) نزدیک‌ترین proxy دموگرافیک است. `NULL` = پروفایل تکمیل‌نشده یا رد شده در فرم.

---

## ۱۱. DAU از رویدادهای track

**سؤال:** هر روز چند کاربر (یا سشن ناشناس) فعال بوده‌اند؟

```sql
SELECT
  (created_at AT TIME ZONE 'Asia/Tehran')::date AS day_tehran,
  COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS logged_in_dau,
  COUNT(DISTINCT session_id) AS session_dau
FROM app_track_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY day_tehran DESC;
```

**تفسیر:** `session_dau` شامل مهمان pre-auth است؛ `logged_in_dau` فقط ردیف‌های با `user_id`. برای WAU همان aggregate با `date_trunc('week', ...)` یا بازهٔ ۷ روزه.

---

## ۱۲. وضعیت ثبت‌نام‌ها (pending / approved / rejected)

**سؤال:** الان چند درخواست در هر وضعیت داریم؟

```sql
SELECT
  status,
  COUNT(*) AS regs,
  SUM(COALESCE(attempts, 0)) AS total_attempts_requested
FROM app_registrations
GROUP BY status
ORDER BY regs DESC;
```

**تفسیر:** `pending` = منتظر بررسی ادمین. `rejected` با `reject_reason` قابل drill-down است. بعد از قرعه‌کشی، تغییر وضعیت قفل می‌شود (قانون محصول).

---

## ۱۳. تأیید ثبت‌نام بر اساس روز (رویداد `reg_approved`)

**سؤال:** ادمین هر روز چند نفر را تأیید کرده؟

```sql
SELECT
  (created_at AT TIME ZONE 'Asia/Tehran')::date AS day_tehran,
  COUNT(DISTINCT user_id) AS users_approved,
  COUNT(*) AS approve_events
FROM app_track_events
WHERE name = 'reg_approved'
  AND user_id IS NOT NULL
GROUP BY 1
ORDER BY day_tehran DESC;
```

**تفسیر:** یک کاربر چند رشته می‌تواند داشته باشد — `approve_events` ممکن است از `users_approved` بیشتر باشد. برای SLA فیش، فاصلهٔ `receipt_submit` تا `reg_approved` را با join روی `user_id` + window می‌توان ساخت (پیشرفته).

---

## ۱۴. ثبت‌نام بر اساس رشته (discipline)

**سؤال:** کدام بازی / رشته بیشترین تقاضا را دارد؟

```sql
SELECT
  e.title AS event_title,
  e.disc AS discipline_id,
  COUNT(*) AS registrations,
  COUNT(*) FILTER (WHERE r.status = 'approved') AS approved
FROM app_registrations r
JOIN app_events e ON e.id = r.comp_id
GROUP BY e.id, e.title, e.disc
ORDER BY registrations DESC;
```

**تفسیر:** `comp_id` در registrations به `app_events.id` (رشته) اشاره می‌کند، نه رویداد مادر. برای گروه‌بندی روی رویداد مادر: join به `app_competitions` از طریق `e.competition_id`.

---

## ۱۵. همبستگی چت دستیار و رسیدن به پرداخت

**سؤال:** کاربرانی که با AI چت کرده‌اند بیشتر به مرحلهٔ پرداخت می‌رسند؟

```sql
WITH signed AS (
  SELECT DISTINCT user_id
  FROM app_track_events
  WHERE name = 'signup_complete' AND user_id IS NOT NULL
),
chatters AS (
  SELECT DISTINCT user_id FROM app_ai_messages
),
reached AS (
  SELECT DISTINCT user_id
  FROM app_track_events
  WHERE name IN ('ticket_select', 'pay_page_view') AND user_id IS NOT NULL
),
approved AS (
  SELECT DISTINCT user_id
  FROM app_track_events
  WHERE name = 'reg_approved' AND user_id IS NOT NULL
)
SELECT
  COUNT(*) FILTER (WHERE s.user_id IN (SELECT user_id FROM chatters)) AS signed_with_chat,
  COUNT(*) FILTER (WHERE s.user_id NOT IN (SELECT user_id FROM chatters)) AS signed_no_chat,
  COUNT(*) FILTER (WHERE s.user_id IN (SELECT user_id FROM chatters) AND s.user_id IN (SELECT user_id FROM reached)) AS chatters_reached_pay,
  COUNT(*) FILTER (WHERE s.user_id NOT IN (SELECT user_id FROM chatters) AND s.user_id IN (SELECT user_id FROM reached)) AS nonchatters_reached_pay,
  COUNT(*) FILTER (WHERE s.user_id IN (SELECT user_id FROM chatters) AND s.user_id IN (SELECT user_id FROM approved)) AS chatters_approved,
  COUNT(*) FILTER (WHERE s.user_id NOT IN (SELECT user_id FROM chatters) AND s.user_id IN (SELECT user_id FROM approved)) AS nonchatters_approved
FROM signed s;
```

**تفسیر:** منطق mirror `persist.track.chatCorrelation()` در `persistence.ts`. `app_ai_messages.content` در نقش read-only در دسترس نیست — فقط شمارش user_id. برای فیلتر شهر/رشته، join به `app_users` اضافه کنید.

---

## فیلتر زمانی (الگو)

برای محدود کردن هر کوئری به ۷ یا ۳۰ روز اخیر:

```sql
-- مثال: فقط ۳۰ روز اخیر روی registrations
AND created_at >= NOW() - INTERVAL '30 days'
```

---

## جدول‌های مرجع

| جدول | نقش در آنالیتیکس |
|------|-------------------|
| `app_registrations` | درخواست بلیت، وضعیت، attempts |
| `app_users` | شهر، referral، experience_years |
| `app_track_events` | قیف رفتاری، DAU |
| `app_receipts` | زمان آپلود فیش (بدون تصویر) |
| `app_promoter_codes` | کدهای affiliate |
| `app_events` | عنوان رشته، discipline |

**Phase 1:** MCP server این سند را index می‌کند — کد سرور فعلاً ساخته نشده.
