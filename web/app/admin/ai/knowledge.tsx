'use client'
import { useState } from 'react'
import { C } from '@/components/ui'

const PLACEHOLDER = `هرچی می‌خوای دستیار مطمئن بدونه رو اینجا بنویس. مثال:

• فینالِ جامِ تهران حضوریه — سالن ایسپورت تهران، خیابان ...، ساعت ۱۶
• مرحلهٔ مقدماتی آنلاین برگزار می‌شه، فینال حضوریه
• پشتیبانی: تلگرام @gamelandsupport
• جوایز نقدی تا دو هفته بعد از فینال واریز می‌شه`

// Free-text facts injected into every assistant answer. This is how the
// assistant learns things the data model doesn't hold (venue, schedule, policy).
export default function KnowledgeEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true); setSaved(false)
    try {
      const res = await fetch('/api/admin/ai-knowledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'ذخیره نشد'); return }
      setSaved(true); setTimeout(() => setSaved(false), 2200)
    } finally { setBusy(false) }
  }

  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 15, padding: '15px 14px' }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: C.thi }}>دانشِ دستیار</div>
      <div style={{ fontSize: 11, color: C.tmut, marginTop: 4, marginBottom: 11, lineHeight: 1.9 }}>
        هر چیزی که اینجا بنویسی، دستیار به‌عنوان حقیقتِ رسمی به کاربرها می‌گه. چیزهایی که تو دیتای اپ نیست (حضوری/آنلاین بودن، آدرس، ساعت، سیاست‌ها) رو حتماً اینجا بنویس — وگرنه دستیار می‌گه «نمی‌دونم».
      </div>
      <textarea value={text} onChange={e => setText(e.target.value.slice(0, 3000))} rows={9} placeholder={PLACEHOLDER}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: C.sf2, border: `1px solid ${C.line}`, borderRadius: 11, padding: '12px 13px', color: C.thi, fontSize: 13, outline: 'none', fontFamily: 'inherit', lineHeight: 2 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button onClick={save} disabled={busy}
          style={{ all: 'unset', cursor: 'pointer', minHeight: 44, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: C.accent, color: C.ink, fontWeight: 800, fontSize: 13.5, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'ذخیره…' : 'ذخیرهٔ دانش'}
        </button>
        {saved && <span style={{ fontSize: 12, fontWeight: 700, color: C.win }}>✓ ذخیره شد — از همین الان تو جواب‌ها استفاده می‌شه</span>}
        <span style={{ flex: 1 }} />
        <span className="gl-num" style={{ fontSize: 10.5, color: C.tmut }}>{text.length}/3000</span>
      </div>
    </div>
  )
}
