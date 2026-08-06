import { getGamenet } from './store'
import type { GamenetStatus, GroupMode, PrelimVenue } from './store'

export function userGroupKey(city?: string, province?: string, mode: GroupMode = 'city'): string {
  const val = (mode === 'province' ? province : city) || 'نامشخص'
  return `${mode}:${val}`
}

export interface PrelimVenueDisplay {
  name: string
  address?: string
  mapUrl?: string
  fromDate?: string
  toDate?: string
  scheduleNote?: string
  contactPhone?: string
  gamenetId?: string
}

export function resolvePrelimVenue(venue: PrelimVenue | undefined): PrelimVenueDisplay | null {
  if (!venue) return null
  if (venue.gamenetId) {
    const g = getGamenet(venue.gamenetId)
    if (g) {
      return {
        gamenetId: g.id,
        name: g.name,
        address: venue.venueAddress || g.address,
        mapUrl: venue.mapUrl || g.mapUrl,
        fromDate: venue.fromDate,
        toDate: venue.toDate,
        scheduleNote: venue.scheduleNote,
        contactPhone: venue.contactPhone || g.phone,
      }
    }
  }
  if (!venue.venueName) return null
  return {
    name: venue.venueName,
    address: venue.venueAddress,
    mapUrl: venue.mapUrl,
    fromDate: venue.fromDate,
    toDate: venue.toDate,
    scheduleNote: venue.scheduleNote,
    contactPhone: venue.contactPhone,
  }
}

export function prelimVenueForUser(
  prelimVenues: Record<string, PrelimVenue> | undefined,
  city: string | undefined,
  province: string | undefined,
  mode: GroupMode,
): PrelimVenueDisplay | null {
  if (!prelimVenues) return null
  const gk = userGroupKey(city, province, mode)
  return resolvePrelimVenue(prelimVenues[gk])
}
export function prelimVenueForGroupKey(
  prelimVenues: Record<string, PrelimVenue> | undefined,
  groupKey: string,
): PrelimVenueDisplay | null {
  if (!prelimVenues) return null
  return resolvePrelimVenue(prelimVenues[groupKey])
}
