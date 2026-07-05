import { allUsers } from '@/lib/store'
import { C, DISP, Num, EmptyState } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function GamersAdmin() {
  const users = allUsers()
  const byRole = users.reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {})

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.thi, marginBottom: 14 }}>گیمرها</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 16 }}>
        <Stat label="کل" value={users.length} color={C.accent} />
        <Stat label="گیمر" value={byRole.gamer || 0} color={C.win} />
        <Stat label="کادر" value={(byRole.admin || 0) + (byRole.organizer || 0)} color={C.gold} />
      </div>

      {users.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}><EmptyState text="هنوز کاربری نیست." /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.line, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.thi }}>{u.tag[0]?.toUpperCase() || '?'}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.thi }}>{u.name}</span>
                  {u.role !== 'gamer' && <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, background: C.goldSoft, padding: '2px 6px', borderRadius: 5 }}>{u.role}</span>}
                </div>
                <div dir="ltr" style={{ fontFamily: DISP, fontSize: 11, color: C.tmut, marginTop: 2 }}>@{u.tag}{u.city ? ` · ${u.city}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 13, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <Num size={22} color={color}>{value}</Num>
      <span style={{ fontSize: 10, color: C.tmut }}>{label}</span>
    </div>
  )
}
