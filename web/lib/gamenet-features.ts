// Curated amenity catalog for gamenet profiles — chips, not free text, so the
// data stays filterable. Freeform detail goes in the address/note text instead.
export interface GamenetFeature { id: string; name: string }

export const GAMENET_FEATURES: GamenetFeature[] = [
  { id: 'cafe',            name: 'کافه' },
  { id: 'counter',         name: 'کانتر/فروشگاه' },
  { id: 'vip_room',        name: 'اتاق VIP' },
  { id: 'tournament_room', name: 'سالن مسابقات' },
  { id: 'streaming_setup', name: 'امکان استریم' },
  { id: 'parking',         name: 'پارکینگ' },
  { id: 'ac',              name: 'تهویه/کولر' },
  { id: 'wifi',            name: 'وای‌فای' },
  { id: 'women_hours',     name: 'ساعاتِ ویژهٔ بانوان' },
  { id: 'late_night',      name: 'شبانه‌روزی' },
]

// Console/setup types for the "چند تا از چی داری" builder.
export interface ConsoleKind { id: string; name: string }
export const CONSOLE_KINDS: ConsoleKind[] = [
  { id: 'ps5',         name: 'PS5' },
  { id: 'ps4',         name: 'PS4' },
  { id: 'xbox',        name: 'ایکس‌باکس' },
  { id: 'pc',          name: 'کامپیوتر' },
  { id: 'vr',          name: 'VR' },
  { id: 'racing_sim',  name: 'صندلی/فرمان مسابقه' },
]
