export type CenterPlayer = {
  uid: string
  tag: string
  name: string
  city: string
  hasPhoto: boolean
  rank: number | null
  here: boolean
  ready: boolean
}

export type CenterMatch = {
  id: string
  num: number
  eventId: string
  eventTitle: string
  disc: string
  format: string
  stageLabel: string
  roundLabel: string
  groupLabel: string
  venueName?: string
  venueAddress?: string
  mapUrl?: string
  scheduleLabel?: string
  station?: number
  calledAt?: number
  status: 'pending' | 'ready' | 'done'
  cancelled?: boolean
  gamesAhead: number
  qualify: string
  path: string
  p1?: CenterPlayer
  p2?: CenterPlayer
  winnerUid?: string
  score?: string
  playing: boolean
  refAt?: number
}

export type CenterSnapshot = {
  isAdmin: boolean
  meUid?: string
  defaultTab: string
  next?: CenterMatch
  mine: CenterMatch[]
  live: CenterMatch[]
  recent: CenterMatch[]
  provinces: { key: string; label: string; live: number; done: number }[]
  players: { uid: string; tag: string; name: string; city: string; hasPhoto: boolean; nextLabel: string; followed: boolean }[]
  events: { id: string; title: string; disc: string }[]
  followed: string[]
  rules: Record<string, string[]>
  desk?: {
    waiting: CenterMatch[]
    playing: CenterMatch[]
    late: CenterMatch[]
    refs: CenterMatch[]
    absent: CenterMatch[]
    stations: { n: number; current?: string; next?: string; status: string }[]
  }
}
