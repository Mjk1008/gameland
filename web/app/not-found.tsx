import { C, DISP, Button } from '@/components/ui'

export default function NotFound() {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 14 }}>
      <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 700, fontSize: 84, color: C.accent, lineHeight: 1 }}>404</span>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.thi }}>این صفحه پیدا نشد</div>
      <div style={{ fontSize: 12.5, color: C.tmut }}>آدرس اشتباهه یا صفحه حذف شده. برگرد خونه.</div>
      <Button href="/" style={{ marginTop: 8, maxWidth: 220 }}>بازگشت به خانه</Button>
    </div>
  )
}
