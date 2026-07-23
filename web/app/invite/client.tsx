'use client'
import { useState } from 'react'
import { C, DISP, GamerAvatar } from '@/components/ui'
import { faDigits } from '@/lib/jalali'

interface BoardRow { uid: string; name: string; tag: string; count: number; hasPhoto: boolean; isMe: boolean }
interface Props { tag: string; approved: number; invited: number; freeTickets: number; milestone: number; board: BoardRow[] }

// Reward ladder — keep in sync with grantReferralRewards in lib/store.ts
const LADDER = [
  { at: 2, label: '۲ دعوتِ تاییدشده', reward: '۱ سهمِ رایگان' },
  { at: 5, label: '۵ دعوتِ تاییدشده', reward: '۲ سهمِ دیگه + نشانِ سفیر' },
]

export default function InviteClient({ tag, approved, invited, freeTickets, board }: Props) {
  const [copied, setCopied] = useState(false)
  const link = `https://gamelandteam.ir/?ref=${tag}`

  async function share() {
    const text = `با کدِ من بیا گیم‌لند — تو مسابقات ایسپورت ایران بازی کن و رنکِ ملی بگیر 🎮\nکد دعوت: @${tag}\n${link}`
    if (navigator.share) { await navigator.share({ text }).catch(() => {}) }
    else { await copy(text) }
  }
  async function copy(v: string) {
    try { await navigator.clipboard.writeText(v); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {}
  }

  const next = LADDER.find(l => approved < l.at)

  return (
    <div className="animate-fade-up" style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.thi }}>رفیقتو بیار 🎟</div>
        <div style={{ fontSize: 12.5, color: C.tbody, lineHeight: 1.9, marginTop: 6 }}>
          رفیق‌هات با کدِ تو اکانت بسازن؛ هر وقت ثبت‌نامِ مسابقه‌شون <b style={{ color: C.thi }}>تایید</b> شد، به پاداش نزدیک‌تر می‌شی. کمپین تا شبِ قرعه‌کشی فعاله.
        </div>
      </div>

      {/* my code — the hero */}
      <div style={{ background: C.sf1, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: C.tmut, marginBottom: 6 }}>کدِ دعوتِ تو</div>
        <button onClick={() => copy(link)} dir="ltr" style={{ all: 'unset', cursor: 'pointer', fontFamily: DISP, fontSize: 30, fontWeight: 800, color: C.gold, letterSpacing: '.04em' }}>@{tag}</button>
        <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 4 }}>{copied ? '✓ لینک کپی شد' : 'بزن روش تا لینکش کپی شه'}</div>
        <button onClick={share} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', minHeight: 48, marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.accent, color: C.ink, borderRadius: 12, fontWeight: 800, fontSize: 14.5 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
          فرستادنِ لینکِ دعوت
        </button>
      </div>

      {/* progress + ladder (the roadmap everyone can see) */}
      <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: C.thi }}>مسیرِ پاداشِ تو</span>
          <span style={{ fontSize: 11.5, color: C.tmut }}><span className="gl-num" style={{ color: C.win }}>{faDigits(approved)}</span> تاییدشده از <span className="gl-num">{faDigits(invited)}</span> دعوتی</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LADDER.map(l => {
            const done = approved >= l.at
            const pct = Math.min(100, (approved / l.at) * 100)
            return (
              <div key={l.at}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                  <span style={{ color: done ? C.win : C.tbody, fontWeight: 700 }}>{done ? '✓ ' : ''}{l.label}</span>
                  <span style={{ color: done ? C.win : C.gold, fontWeight: 700 }}>{l.reward}</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: C.sf2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: done ? C.win : C.gold, borderRadius: 4 }} />
                </div>
              </div>
            )
          })}
        </div>
        {next && (
          <div style={{ fontSize: 11.5, color: C.tbody, marginTop: 12, lineHeight: 1.8 }}>
            <span className="gl-num" style={{ color: C.gold, fontWeight: 800 }}>{faDigits(next.at - approved)}</span> دعوتِ تاییدشده‌ی دیگه تا {next.reward}!
          </div>
        )}
        {freeTickets > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: C.win, background: C.winSoft, border: `1px solid ${C.win}44`, borderRadius: 10, padding: '9px 12px' }}>
            🎟 الان <span className="gl-num">{faDigits(freeTickets)}</span> سهمِ رایگان داری — تو ثبت‌نامِ بعدی خودکار حساب می‌شه.
          </div>
        )}
      </div>

      {/* campaign leaderboard */}
      <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.thi, marginBottom: 4 }}>لیدربردِ دعوت</div>
        <div style={{ fontSize: 11, color: C.tmut, marginBottom: 12 }}>نفرِ اول در پایانِ کمپین: سهمِ کامل تا سقفِ ۶ + معرفی تو پیجِ گیم‌لند</div>
        {board.length === 0 ? (
          <div style={{ fontSize: 12, color: C.tmut, textAlign: 'center', padding: '14px 0' }}>هنوز کسی دعوتِ تاییدشده نداره — تو اولین نفر باش!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {board.map((r, i) => (
              <div key={r.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, background: r.isMe ? C.accentSoft : 'transparent', border: `1px solid ${r.isMe ? C.accent : 'transparent'}`, borderRadius: 10, padding: '7px 9px' }}>
                <span className="gl-num" style={{ width: 20, textAlign: 'center', fontWeight: 800, fontSize: 15, color: i === 0 ? C.gold : C.tmut }}>{i + 1}</span>
                <GamerAvatar uid={r.uid} tag={r.tag} hasPhoto={r.hasPhoto} card={null} size={34} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.isMe ? ' · تو' : ''}</span>
                <span style={{ fontSize: 11, color: C.tmut }}><span className="gl-num" style={{ fontSize: 15, fontWeight: 800, color: C.thi }}>{faDigits(r.count)}</span> دعوت</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 10.5, color: C.tmut, lineHeight: 1.9, textAlign: 'center' }}>
        فقط ثبت‌نام‌هایی که پرداختشون توسط ادمین تایید شه شمرده می‌شن · خوددعوتی و اکانتِ تکراری باطله · سقفِ پاداش ۳ سهم (به‌جز نفرِ اولِ لیدربرد)
      </div>
    </div>
  )
}
