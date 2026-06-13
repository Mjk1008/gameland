import { allSponsors } from '@/lib/store'
import SponsorsClient from './client'
export const dynamic = 'force-dynamic'
export default function SponsorsAdmin() {
  return <SponsorsClient initial={allSponsors()}/>
}
