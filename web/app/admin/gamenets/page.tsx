import { allGamenets, getUserById, gamenetPhotoIdsFor } from '@/lib/store'
import GamenetReviewList from './review-list'

export const dynamic = 'force-dynamic'

export default function GamenetsAdmin() {
  const list = allGamenets()
  const rows = list.map(g => {
    const owner = getUserById(g.ownerId)
    const photoIds = gamenetPhotoIdsFor(g.id)
    return {
      id: g.id, name: g.name, city: g.city, province: g.province, address: g.address, phone: g.phone,
      status: g.status, rejectReason: g.rejectReason, stations: g.stations,
      ownerName: owner?.name ?? 'ناشناس', ownerTag: owner?.tag ?? '?',
      photoCount: photoIds.length, coverPhotoId: photoIds[0],
    }
  })

  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <GamenetReviewList rows={rows} />
    </div>
  )
}
