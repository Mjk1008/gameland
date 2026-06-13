import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 14 }}>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 84, color: '#22d3ee', lineHeight: 1 }}>404</span>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>صفحه پیدا نشد</div>
      <div style={{ fontSize: 12, color: '#64748b' }}>این آدرس وجود نداره یا حذف شده</div>
      <Link href="/" style={{ all: 'unset', cursor: 'pointer', marginTop: 8, padding: '10px 18px', background: '#22d3ee', color: '#0b0f14', fontWeight: 700, fontSize: 13, borderRadius: 10 }}>بازگشت به خانه</Link>
    </div>
  )
}
