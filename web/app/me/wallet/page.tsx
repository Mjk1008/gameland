import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserById, coinBalance, coinTxnsForUser } from '@/lib/store'
import TopupButtons from './topup-buttons'

export const dynamic = 'force-dynamic'

const REASON_FA: Record<string, string> = {
  topup:   'شارژ',
  attempt: 'ثبت‌نام مسابقه',
  refund:  'بازگشت',
  bonus:   'هدیه',
  fee:     'کارمزد',
}

export default async function WalletPage() {
  const session = await getServerSession(authOptions)
  const uid = (session as any)?.uid
  if (!uid || !getUserById(uid)) redirect('/login?callbackUrl=/me/wallet')

  const balance = coinBalance(uid)
  const txns = coinTxnsForUser(uid).slice(0, 20)

  return (
    <div className="animate-fade-up">
      <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(11,15,20,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b' }}>
        <Link href="/me" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 11, background: '#121821', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </Link>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>کیف پول</span>
      </div>

      <div style={{ padding: '18px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        <div style={{ background: 'linear-gradient(135deg, rgba(245,200,75,.12), #121821)', border: '1px solid rgba(245,200,75,.3)', borderRadius: 18, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>موجودی فعلی</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 46, lineHeight: 1, color: '#f5c84b', textShadow: '0 0 22px rgba(245,200,75,.35)' }}>{balance.toLocaleString('en-US')}</span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>سکه</span>
          </div>
          <span style={{ fontSize: 10, color: '#475569' }}>سکه غیرقابل تبدیل به پول · فقط برای ورودی مسابقات</span>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>شارژ سریع</div>
          <TopupButtons/>
          <div style={{ marginTop: 9, padding: '10px 12px', background: '#0b0f14', border: '1px solid #1e293b', borderRadius: 11, fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
            در نسخهٔ زنده، شارژ از طریق درگاه شاپرک انجام می‌شه. این نسخه نمایشیه.
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>تاریخچهٔ تراکنش</span>
            <span dir="ltr" style={{ fontSize: 11, color: '#64748b' }}>{txns.length}</span>
          </div>
          {txns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b', fontSize: 12 }}>هنوز تراکنشی نداری</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {txns.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 11 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: t.delta > 0 ? '#34d39922' : '#fb718522', color: t.delta > 0 ? '#34d399' : '#fb7185', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{t.delta > 0 ? '+' : '−'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0' }}>{REASON_FA[t.reason] ?? t.reason}</div>
                    <div dir="ltr" style={{ fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'Rajdhani, sans-serif' }}>{new Date(t.createdAt).toLocaleString('fa-IR')}</div>
                  </div>
                  <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 16, color: t.delta > 0 ? '#34d399' : '#fb7185' }}>{t.delta > 0 ? '+' : ''}{t.delta}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
