import { allSponsors } from '@/lib/store'
import { C, DISP, BackHeader } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function SponsorsPage() {
  const list = allSponsors()
  return (
    <div className="animate-fade-up">
      <BackHeader title="حامیان مالی" href="/" />

      <div style={{ padding: '16px 16px 28px' }}>
        <div style={{ background: `linear-gradient(135deg, ${C.goldSoft}, ${C.sf1})`, border: `1px solid ${C.gold}39`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 6 }}>جایزه‌ها از کجا می‌آد؟</div>
          <p style={{ fontSize: 12.5, color: C.tbody, lineHeight: 1.7, margin: 0 }}>
            همهٔ جایزه‌های مسابقات گیم‌لند رو برندهای زیر تأمین می‌کنن. هیچ بخشی از ورودی شرکت‌کننده‌ها به جایزه‌ها اضافه نمی‌شه.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {list.map(s => (
            <a key={s.id} href={s.website || '#'} target={s.website ? '_blank' : undefined} rel="noopener noreferrer" style={{ all: 'unset', cursor: s.website ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 12px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: C.goldSoft, border: `1px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: C.gold }}>{s.name[0]}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.thi, textAlign: 'center' }}>{s.name}</span>
              {s.website && <span dir="ltr" style={{ fontSize: 11, color: C.accent, fontFamily: DISP }}>{s.website.replace(/^https?:\/\//, '')}</span>}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
