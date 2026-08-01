import Link from 'next/link'
import { allGamenets, getUserById, hasGamenetPhoto } from '@/lib/store'
import { DISC } from '@/lib/mock-data'
import { GAMENET_FEATURES, CONSOLE_KINDS } from '@/lib/gamenet-features'
import { GAMENET_GAMES } from '@/lib/gamenet-games'
import { C, Card } from '@/components/ui'
import VerifyBtn from './verify-btn'

export const dynamic = 'force-dynamic'

export default function GamenetsAdmin() {
  const list = allGamenets()
  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.thi, marginBottom: 12 }}>گیم‌نت‌ها</div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: C.tmut, fontSize: 13 }}>هنوز گیم‌نتی ثبت نشده</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(g => {
            const owner = getUserById(g.ownerId)
            const photo = hasGamenetPhoto(g.id)
            return (
              <Card key={g.id} style={{ padding: '11px 13px' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {photo && (
                    <img src={`/api/gamenet-photo/${g.id}`} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.line}` }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{g.name}</span>
                      <VerifyBtn id={g.id} verified={g.verified}/>
                    </div>
                    <div style={{ fontSize: 12, color: C.tbody }}>{g.province ? `${g.province}، ` : ''}{g.city} · {g.stations} دستگاه</div>
                    <div style={{ fontSize: 11, color: C.tbody, marginTop: 3 }}>{g.address}</div>
                    {g.phone && <div dir="ltr" style={{ fontSize: 11, color: C.tbody, marginTop: 3, textAlign: 'right' }}>{g.phone}</div>}
                    {g.instagramUrl && <div dir="ltr" style={{ fontSize: 11, color: C.accent, marginTop: 3, textAlign: 'right' }}>{g.instagramUrl}</div>}
                    {g.consoles.length > 0 && (
                      <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 4 }}>
                        {g.consoles.map(c => `${CONSOLE_KINDS.find(k => k.id === c.kind)?.name ?? c.kind} ×${c.count}`).join('، ')}
                      </div>
                    )}
                    {g.features.length > 0 && (
                      <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 3 }}>
                        {g.features.map(f => GAMENET_FEATURES.find(x => x.id === f)?.name ?? f).join('، ')}
                      </div>
                    )}
                    {g.disciplines.length > 0 && (
                      <div style={{ fontSize: 10.5, color: C.thi, marginTop: 3 }}>
                        رشته‌ها: {g.disciplines.map(d => DISC[d as keyof typeof DISC]?.name ?? d).join('، ')}
                      </div>
                    )}
                    {g.games.length > 0 && (
                      <div style={{ fontSize: 10.5, color: C.tmut, marginTop: 3 }}>
                        سایر بازی‌ها: {g.games.map(x => GAMENET_GAMES.find(gg => gg.id === x)?.name ?? x).join('، ')}
                      </div>
                    )}
                    {!photo && (
                      <div style={{ fontSize: 10.5, color: C.live, marginTop: 4 }}>⚠ بدون عکسِ محل — ثبتِ قدیمی</div>
                    )}
                    <div style={{ fontSize: 11, color: C.tbody, marginTop: 4 }}>ثبت‌کننده: {owner?.name ?? 'ناشناس'} ({owner?.tag ?? '?'})</div>
                    <Link href={`/gamenets/${g.id}`} style={{ all: 'unset', cursor: 'pointer', display: 'block', marginTop: 6, fontSize: 12, color: C.accent }}>دیدن صفحهٔ عمومی ›</Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
