import { PLAYERS } from '@/lib/mock-data'
import LeaderboardClient from './client'

export default function LeaderboardPage() {
  return <LeaderboardClient initial={PLAYERS}/>
}
