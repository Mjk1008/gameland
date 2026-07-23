'use client'
import { useState } from 'react'
import { C, DISP, GamerAvatar } from '@/components/ui'
import { faDigits } from '@/lib/jalali'

interface BoardRow { uid: string; name: string; tag: string; count: number; hasPhoto: boolean; isMe: boolean }
interface Props { tag: string; approved: number; invited: number; freeTickets: number; milestone: number; board: BoardRow[] }

// Reward ladder — keep in sync with grantReferralRewards in lib/store.ts
const LADDER = [
  { at: 3, reward: '۱ سهمِ رایگان', icon: '🎟' },
  { at: 6, reward: '۲ سهمِ دیگه + نشانِ سفیر', icon: '👑' },
]

const GOLD = '#F5C84B'
const PURPLE = '#A855F7'

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
  const trackPct = Math.min(100, (approved / 6) * 100)

  return (
    <div style={{ position: 'relative', padding: '20px 16px 30px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
      {/* ambient glow field */}
      <div aria-hidden style={{ position: 'absolute', top: -140, insetInlineStart: -80, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${PURPLE}2E, transparent 70%)`, pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', top: 120, insetInlineEnd: -120, width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}1F, transparent 70%)`, pointerEvents: 'none' }} />

      {/* headline */}
      <div className="inv-in" style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{ fontFamily: DISP, fontSize: 11, fontWeight: 800, letterSpacing: '.34em', color: GOLD, marginBottom: 8 }}>REFERRAL SEASON</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.thi, lineHeight: 1.6 }}>
          رفیقتو بیار،<br />
          <span style={{ background: `linear-gradient(92deg, ${GOLD}, #FFE9A8, ${GOLD})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>سهمِ رایگان</span> بگیر
        </h1>
        <p style={{ margin: '10px auto 0', maxWidth: 300, fontSize: 12, color: C.tbody, lineHeight: 2 }}>
          هر سهمی که دعوتی‌هات بخرن و تایید شه، یه قدم به جایزه نزدیک‌تری. فقط تا شبِ قرعه‌کشی.
        </p>
      </div>

      {/* ═══ THE TICKET ═══ */}
      <div className="inv-in inv-d1" style={{ position: 'relative' }}>
        <div className="inv-float" style={{ position: 'relative', borderRadius: 20, padding: 1.5, background: `linear-gradient(135deg, ${GOLD}AA, ${GOLD}22 30%, ${PURPLE}66 65%, ${GOLD}AA)` }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 19, background: `linear-gradient(160deg, #221C13, #171310 55%, #1B1426)`, padding: '22px 18px 20px', textAlign: 'center' }}>
            {/* shimmer sweep */}
            <span aria-hidden className="inv-shimmer" />
            {/* perforation holes */}
            <span aria-hidden style={{ position: 'absolute', top: '50%', insetInlineStart: -9, width: 18, height: 18, borderRadius: '50%', background: '#14110D', border: `1.5px solid ${GOLD}44` }} />
            <span aria-hidden style={{ position: 'absolute', top: '50%', insetInlineEnd: -9, width: 18, height: 18, borderRadius: '50%', background: '#14110D', border: `1.5px solid ${GOLD}44` }} />

            <div style={{ fontFamily: DISP, fontSize: 10, fontWeight: 800, letterSpacing: '.3em', color: C.tmut }}>GAMELAND · INVITE PASS</div>

            <button onClick={() => copy(link)} dir="ltr" style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', margin: '14px 0 4px' }}>
              <span style={{ fontFamily: DISP, fontSize: 38, fontWeight: 800, letterSpacing: '.03em', background: `linear-gradient(180deg, #FFF3CF, ${GOLD})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none' }}>@{tag}</span>
            </button>
            <div style={{ fontSize: 10.5, color: copied ? '#3ECF8E' : C.tmut, fontWeight: 700, transition: 'color .2s' }}>{copied ? '✓ لینکِ دعوت کپی شد' : 'کدِ توئه — بزن روش تا لینک کپی شه'}</div>

            {/* dashed tear line */}
            <div style={{ margin: '16px -18px', borderTop: `1.5px dashed ${GOLD}33` }} />

            <button onClick={share} className="inv-cta" style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%', minHeight: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, background: `linear-gradient(92deg, ${GOLD}, #E8B429)`, color: '#1A1508', fontWeight: 800, fontSize: 14.5, boxShadow: `0 6px 24px -6px ${GOLD}66` }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></svg>
              فرستادنِ لینکِ دعوت
            </button>
          </div>
        </div>
      </div>

      {/* free balance flash */}
      {freeTickets > 0 && (
        <div className="inv-in inv-d1 inv-pulse" style={{ display: 'flex', alignItems: 'center', gap: 10, background: `linear-gradient(92deg, ${GOLD}1C, transparent)`, border: `1px solid ${GOLD}55`, borderRadius: 13, padding: '12px 15px' }}>
          <span style={{ fontSize: 20 }}>🎟</span>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: GOLD }}>
            {faDigits(freeTickets)} سهمِ رایگان داری — تو ثبت‌نامِ بعدیت خودکار حساب می‌شه.
          </span>
        </div>
      )}

      {/* ═══ QUEST TRACK ═══ */}
      <div className="inv-in inv-d2" style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 18, padding: '18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>مسیرِ جایزه‌ت</span>
          <span style={{ fontSize: 11, color: C.tmut }}>
            <b className="gl-num" style={{ color: '#3ECF8E', fontSize: 14 }}>{faDigits(approved)}</b> سهمِ تاییدشده · <span className="gl-num">{faDigits(invited)}</span> دعوتی
          </span>
        </div>

        {/* track */}
        <div style={{ position: 'relative', margin: '26px 6px 8px' }}>
          <div style={{ height: 8, borderRadius: 5, background: C.sf2, overflow: 'hidden' }}>
            <div className="inv-track" style={{ height: '100%', width: `${trackPct}%`, borderRadius: 5, background: `linear-gradient(90deg, ${PURPLE}, ${GOLD})` }} />
          </div>
          {/* milestone nodes at 3 and 6 */}
          {LADDER.map(l => {
            const done = approved >= l.at
            return (
              <div key={l.at} style={{ position: 'absolute', top: '50%', insetInlineStart: `${(l.at / 6) * 100}%`, transform: 'translate(50%, -50%)' }}>
                <div className={done ? 'inv-node-done' : undefined} style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: done ? `linear-gradient(135deg, ${GOLD}, #E8B429)` : C.sf2, border: `2px solid ${done ? GOLD : C.line2}`, boxShadow: done ? `0 0 16px ${GOLD}66` : 'none' }}>
                  {done ? '✓' : l.icon}
                </div>
              </div>
            )
          })}
        </div>

        {/* ladder rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          {LADDER.map(l => {
            const done = approved >= l.at
            return (
              <div key={l.at} style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, padding: '10px 12px', background: done ? `${GOLD}10` : C.sf2, border: `1px solid ${done ? GOLD + '44' : C.line}` }}>
                <span style={{ fontSize: 16 }}>{l.icon}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: done ? GOLD : C.tbody }}>
                  <b className="gl-num">{faDigits(l.at)}</b> سهمِ تاییدشده
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: done ? '#3ECF8E' : C.thi }}>{done ? '✓ گرفتی' : l.reward}</span>
              </div>
            )
          })}
        </div>

        {next && (
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11.5, color: C.tbody }}>
            فقط <b className="gl-num" style={{ color: GOLD, fontSize: 14 }}>{faDigits(next.at - approved)}</b> سهمِ دیگه تا {next.reward} 🔥
          </div>
        )}
      </div>

      {/* ═══ LEADERBOARD ═══ */}
      <div className="inv-in inv-d3" style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 18, padding: '18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.thi }}>لیدربردِ دعوت</span>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}44, transparent)` }} />
        </div>
        <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 5, marginBottom: 14 }}>🏆 نفرِ اول: <b style={{ color: GOLD }}>۶ سهمِ کامل</b> + معرفی تو پیجِ گیم‌لند</div>

        {board.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '18px 0 8px' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🥇</div>
            <div style={{ fontSize: 12, color: C.tbody }}>سکو خالیه — <b style={{ color: GOLD }}>اولین نفر باش!</b></div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {board.map((r, i) => {
              const medal = i === 0 ? GOLD : i === 1 ? '#C9CDD6' : i === 2 ? '#C98A5A' : null
              return (
                <div key={r.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, padding: '8px 10px', background: r.isMe ? `${PURPLE}14` : i === 0 ? `${GOLD}0E` : 'transparent', border: `1px solid ${r.isMe ? PURPLE + '55' : i === 0 ? GOLD + '33' : 'transparent'}` }}>
                  <span className="gl-num" style={{ width: 22, textAlign: 'center', fontFamily: DISP, fontWeight: 800, fontSize: 15, color: medal ?? C.tmut }}>{i + 1}</span>
                  <span style={{ borderRadius: 999, padding: 2, background: medal ? `linear-gradient(135deg, ${medal}, transparent)` : 'transparent' }}>
                    <GamerAvatar uid={r.uid} tag={r.tag} hasPhoto={r.hasPhoto} card={null} size={34} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: C.thi, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.isMe ? ' · تو' : ''}</span>
                  <span style={{ fontSize: 10.5, color: C.tmut }}><b className="gl-num" style={{ fontSize: 15, fontWeight: 800, color: medal ?? C.thi }}>{faDigits(r.count)}</b> سهم</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="inv-in inv-d3" style={{ fontSize: 10, color: C.tmut, lineHeight: 2, textAlign: 'center', padding: '0 10px' }}>
        فقط سهم‌هایی که پرداختشون توسط ادمین تایید شه شمرده می‌شن · خوددعوتی و اکانتِ تکراری باطله · سقفِ پاداش ۳ سهم (به‌جز نفرِ اول)
      </div>

      <style jsx global>{`
        @keyframes invIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .inv-in { animation: invIn .55s cubic-bezier(.2,.8,.3,1) both }
        .inv-d1 { animation-delay: .1s } .inv-d2 { animation-delay: .2s } .inv-d3 { animation-delay: .3s }

        @keyframes invFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        .inv-float { animation: invFloat 5s ease-in-out infinite }

        .inv-shimmer { position: absolute; top: 0; bottom: 0; width: 55%; pointer-events: none;
          background: linear-gradient(105deg, transparent 20%, rgba(255,235,180,.09) 48%, rgba(255,235,180,.16) 52%, transparent 80%);
          animation: invSweep 3.4s ease-in-out infinite; }
        @keyframes invSweep { 0% { inset-inline-start: -60% } 60%,100% { inset-inline-start: 120% } }

        @keyframes invGrow { from { width: 0 } }
        .inv-track { animation: invGrow 1.1s .35s cubic-bezier(.2,.8,.3,1) both }

        @keyframes invNode { 0%,100% { box-shadow: 0 0 10px #F5C84B55 } 50% { box-shadow: 0 0 22px #F5C84B99 } }
        .inv-node-done { animation: invNode 2.4s ease-in-out infinite }

        @keyframes invPulse { 0%,100% { border-color: #F5C84B55 } 50% { border-color: #F5C84BAA } }
        .inv-pulse { animation: invIn .55s .15s cubic-bezier(.2,.8,.3,1) both, invPulse 2.6s ease-in-out infinite }

        .inv-cta:active { transform: scale(.98) }
      `}</style>
    </div>
  )
}
