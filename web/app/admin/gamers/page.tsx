import Link from 'next/link'
import { allUsers } from '@/lib/store'
import { DISC, avatarBg } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default function GamersAdmin() {
  const users = allUsers()
  // multi-account guard: surface phones / national IDs that look duplicated.
  // For now since we have unique constraints at create-time, just flag missing national ID
  // and surface a count summary by role.
  const byRole = users.reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {})
  const missingNid = users.filter(u => u.role === 'gamer' && !u.nationalId).length

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginBottom: 12 }}>گیمرها</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 16 }}>
        <Stat label="کل"        value={users.length} color="#22d3ee"/>
        <Stat label="گیمر"      value={byRole.gamer || 0} color="#34d399"/>
        <Stat label="بدون کد ملی" value={missingNid} color="#f5c84b"/>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', background: '#121821', border: '1px solid #1e293b', borderRadius: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: avatarBg('#22d3ee'), border: '1px solid #22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: '#22d3ee' }}>{u.tag[0]?.toUpperCase() || '?'}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{u.name}</span>
                {u.role !== 'gamer' && <span style={{ fontSize: 9, fontWeight: 700, color: '#f5c84b', background: '#f5c84b22', padding: '2px 6px', borderRadius: 5 }}>{u.role}</span>}
              </div>
              <div dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>@{u.tag} · {u.phone}</div>
            </div>
            {!u.nationalId && u.role === 'gamer' && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#f5c84b' }}>بدون کد ملی</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#121821', border: '1px solid #1e293b', borderRadius: 13, padding: '13px 0', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <span dir="ltr" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 22, color }}>{value}</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
    </div>
  )
}
