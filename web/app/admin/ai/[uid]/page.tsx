import { notFound } from 'next/navigation'
import { getUserById } from '@/lib/store'
import { persist } from '@/lib/db/persistence'
import { C, DISP, BackHeader } from '@/components/ui'
import { toJalali, faDigits, J_MONTHS } from '@/lib/jalali'

export const dynamic = 'force-dynamic'

const jdt = (v: any) => {
  const d = new Date(v)
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${faDigits(j.jd)} ${J_MONTHS[j.jm - 1]} · ${faDigits(hm)}`
}

// Full conversation transcript for one user — admin monitoring view.
export default async function AiUserPage({ params }: { params: { uid: string } }) {
  const u = getUserById(params.uid)
  if (!u) return notFound()
  const rows: any[] = await persist.ai.forUser(params.uid, 300)

  return (
    <div className="animate-fade-up">
      <BackHeader title={`مکالماتِ ${u.name}`} href="/admin/ai" />
      <div style={{ padding: '14px 16px 28px' }}>
        <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11.5, color: C.tmut, textAlign: 'right', marginBottom: 14 }}>@{u.tag}{u.phone ? ` · ${u.phone}` : ''} · {faDigits(rows.filter(r => r.role === 'user').length)} سوال</div>

        {rows.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '30px 0' }}>مکالمه‌ای ثبت نشده.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {rows.map((r, i) => {
              const isUser = r.role === 'user'
              return (
                <div key={r.id ?? i} style={{ display: 'flex', justifyContent: isUser ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '86%', padding: '9px 13px', fontSize: 12.5, lineHeight: 1.95, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: isUser ? C.accentSoft : C.sf1, color: isUser ? C.thi : C.tbody, border: `1px solid ${isUser ? C.accent + '44' : C.line}`, borderRadius: isUser ? '13px 13px 4px 13px' : '13px 13px 13px 4px' }}>
                    {r.content}
                    <div style={{ fontSize: 9, color: C.tmut, marginTop: 5, display: 'flex', gap: 8 }}>
                      <span>{jdt(r.createdAt)}</span>
                      {!isUser && (r.promptTokens > 0 || r.completionTokens > 0) && <span dir="ltr" className="gl-num">{r.promptTokens}+{r.completionTokens} tok</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
