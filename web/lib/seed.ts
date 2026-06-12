// Mock seed data. Patterned after the real Gameland (Amol, eFootball/EA FC).
// Replace with founder's ~2,000-gamer DB ingestion (docs/13) when delivered.

import type {
  Competition,
  Discipline,
  Placement,
  Player,
  Sponsor,
} from './schema'

export const disciplines: Discipline[] = [
  { id: 'efootball', name: 'eFootball', nameFa: 'ای‌فوتبال' },
  { id: 'eafc', name: 'EA FC', nameFa: 'EA FC' },
  { id: 'cs2', name: 'Counter-Strike 2', nameFa: 'کانتر استرایک ۲' },
]

const PERSIAN_FIRSTS = [
  'نیما','آرین','رضا','علی','محمد','حسین','امیر','مهدی','پارسا','سینا',
  'سارا','زهرا','مریم','نگار','شیما','الناز','مهسا','یاسمن','رومینا','ندا',
  'بهزاد','کیان','فرهاد','احسان','بنیامین','سامیار','ایلیا','آراد','نوید','عرفان',
]
const PERSIAN_LASTS = [
  'صادقی','کردی','محمدی','حسینی','رضایی','احمدی','کریمی','جعفری','نوری','شریفی',
  'موسوی','قاسمی','عباسی','رحیمی','اکبری','هاشمی','مرادی','صالحی','افشار','طاهری',
]
const CITIES = ['آمل','بابل','ساری','تهران','کرج','قائم‌شهر','رشت','نوشهر','چالوس','بابلسر']

function rand<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

export const players: Player[] = Array.from({ length: 36 }, (_, i) => {
  const first = rand(PERSIAN_FIRSTS, i * 7 + 3)
  const last = rand(PERSIAN_LASTS, i * 11 + 5)
  const nick = ['Pro','King','Master','Legend','Sniper','Striker','Captain','Ace'][i % 8] + (i + 1)
  return {
    id: `p${(i + 1).toString().padStart(3, '0')}`,
    nickname: nick,
    fullName: `${first} ${last}`,
    phone: `0912${(1000000 + i * 137).toString().slice(-7)}`,
    city: rand(CITIES, i * 3 + 1),
    province: i % 3 === 0 ? 'مازندران' : 'تهران',
    disciplines: i % 5 === 0 ? ['efootball', 'eafc'] : ['efootball'],
    playStyle: ['حمله‌ای','تاکتیکی','دفاعی','کانتر-اتک','کنترل بازی'][i % 5],
    bio: i < 8 ? 'بازیکن قدیمی Gameland، چندین قهرمانی منطقه‌ای.' : undefined,
    joinedAt: '2023-09-01T00:00:00Z',
  }
})

export const sponsors: Sponsor[] = [
  { id: 's-cube',    name: 'Cube Gaming' },
  { id: 's-oxin',    name: 'OxinGame' },
  { id: 's-tapsell', name: 'Tapsell' },
]

export const competitions: Competition[] = [
  {
    id: 'c-aftab-1402-summer',
    name: 'جام تابستان آفتاب ۱۴۰۲',
    disciplineId: 'efootball',
    tier: 'A',
    date: '2024-08-15T18:00:00Z',
    city: 'آمل',
    venue: 'گیم‌نت آفتاب',
    organizer: 'Gameland',
    format: 'six-prelim-128-final',
    prizePoolToman: 30_000_000,
    sponsorIds: ['s-cube'],
  },
  {
    id: 'c-allstar-1403-spring',
    name: 'آل‌استار بهار ۱۴۰۳',
    disciplineId: 'efootball',
    tier: 'B',
    date: '2025-04-20T18:00:00Z',
    city: 'آمل',
    venue: 'گیم‌نت آفتاب',
    organizer: 'Gameland',
    format: 'six-prelim-128-final',
    prizePoolToman: 10_000_000,
    sponsorIds: ['s-tapsell'],
  },
  {
    id: 'c-major-1403-autumn',
    name: 'جام بزرگ پاییز ۱۴۰۳',
    disciplineId: 'efootball',
    tier: 'S',
    date: '2025-11-05T18:00:00Z',
    city: 'آمل',
    venue: 'سالن همایش شهرداری',
    organizer: 'Gameland × IRCG',
    format: 'six-prelim-128-final',
    prizePoolToman: 100_000_000,
    sponsorIds: ['s-cube', 's-oxin'],
  },
  {
    id: 'c-gltech-1404-winter',
    name: 'گیم‌لند تکنیکال زمستان ۱۴۰۴',
    disciplineId: 'efootball',
    tier: 'A',
    date: '2026-02-10T18:00:00Z',
    city: 'آمل',
    venue: 'گیم‌نت آفتاب',
    organizer: 'Gameland',
    format: 'six-prelim-128-final',
    prizePoolToman: 40_000_000,
    sponsorIds: ['s-cube'],
  },
]

// Deterministic placements — make a believable top-tier
function makePlacements(compId: string, topIds: string[]): Placement[] {
  return topIds.map((pid, i) => ({ competitionId: compId, playerId: pid, rank: i + 1 }))
}

export const placements: Placement[] = [
  ...makePlacements('c-aftab-1402-summer',
    ['p001','p002','p003','p004','p005','p006','p007','p008','p011','p014','p016','p018']),
  ...makePlacements('c-allstar-1403-spring',
    ['p002','p001','p005','p003','p009','p007','p012','p008','p015','p020','p022','p025']),
  ...makePlacements('c-major-1403-autumn',
    ['p001','p003','p002','p006','p004','p008','p005','p010','p013','p011','p017','p019']),
  ...makePlacements('c-gltech-1404-winter',
    ['p003','p002','p001','p005','p004','p007','p009','p011','p014','p016','p018','p021']),
]
