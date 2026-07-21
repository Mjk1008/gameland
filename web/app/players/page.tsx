import Link from 'next/link'
import { allUsers, hasAvatar } from '@/lib/store'
import { playerCard } from '@/lib/player-cards'
import { DISC } from '@/lib/mock-data'
import { C, DISP, EmptyState, GameBadge, GamerAvatar } from '@/components/ui'

export const dynamic = 'force-dynamic'

export default function PlayersPage() {
  const players = allUsers().filter(u => u.role === 'gamer').map(u => ({
    id: u.id, name: u.name, tag: u.tag, city: u.city, disc: u.primaryDisc,
    hasPhoto: hasAvatar(u.id), card: playerCard(u.tag),
  }))

  return (
    <div className="animate-fade-up" style={{ padding: '16px 16px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.thi }}>گیمرها</span>
        <span style={{ fontSize: 12.5, color: C.tmut }}><span className="gl-num">{players.length}</span> گیمر</span>
      </div>

      {players.length === 0 ? (
        <div style={{ background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14 }}>
          <EmptyState text="هنوز گیمری ثبت‌نام نکرده — اولین نفر باش." />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {players.map(p => {
            const d = p.disc ? DISC[p.disc as keyof typeof DISC] : null
            return (
              <Link key={p.id} href={`/players/${p.tag.toLowerCase()}`} style={{ all: 'unset', cursor: 'pointer', boxSizing: 'border-box', background: C.sf1, border: `1px solid ${C.line}`, borderRadius: 14, padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, textAlign: 'center' }}>
                <GamerAvatar uid={p.id} tag={p.tag} hasPhoto={p.hasPhoto} card={p.card} size={56} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.thi }}>{p.name}</div>
                  <div dir="ltr" style={{ fontFamily: DISP, fontSize: 12, color: C.tmut, marginTop: 2 }}>@{p.tag}</div>
                </div>
                {d && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, color: C.thi, background: C.sf2, border: `1px solid ${C.line}`, padding: '4px 10px 4px 5px', borderRadius: 999 }}>
                    <GameBadge disc={p.disc!} size={18} />{d.name}
                  </span>
                )}
                <div style={{ fontSize: 11, color: C.tmut }}>{p.city}</div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
