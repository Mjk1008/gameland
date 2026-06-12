// Design-system mock data — matches Claude Design prototype exactly.
// Replace with DB queries once Postgres/Supabase is wired (docs/12).

export type Disc = 'valorant' | 'cs2' | 'pubgm' | 'fc'

export const DISC: Record<Disc, { name: string; short: string; color: string }> = {
  valorant: { name: 'ولورنت',       short: 'VAL',   color: '#fb7185' },
  cs2:      { name: 'کانتر ۲',      short: 'CS2',   color: '#fbbf24' },
  pubgm:    { name: 'پابجی موبایل', short: 'PUBGM', color: '#34d399' },
  fc:       { name: 'EA FC',        short: 'FC',    color: '#38bdf8' },
}

export interface Player {
  rank: number; name: string; tag: string; disc: Disc
  points: number; winrate: number; matches: number; trend: number
  color: string; city: string
}

const RAW: [string, string, Disc, number, number, number, number, string, string][] = [
  ['آرش رستمی',    'ZEUS',    'valorant', 2847, 68, 412,  2, '#22d3ee', 'تهران'],
  ['سینا کاظمی',   'v1per',   'cs2',      2790, 71, 389, -1, '#f5c84b', 'کرج'],
  ['مهدی نوری',    'Phantom', 'valorant', 2731, 64, 366,  1, '#a78bfa', 'مشهد'],
  ['علی موسوی',    'RAGE',    'pubgm',    2655, 59, 501,  3, '#34d399', 'اصفهان'],
  ['رضا احمدی',    'Shadow',  'cs2',      2602, 66, 344, -2, '#38bdf8', 'شیراز'],
  ['امیر صادقی',   'Falcon',  'valorant', 2554, 61, 298,  0, '#fb7185', 'تبریز'],
  ['حسین کریمی',   'Maestro', 'fc',       2498, 73, 255,  1, '#fbbf24', 'اهواز'],
  ['پارسا یزدانی', 'Frost',   'pubgm',    2447, 57, 433, -1, '#22d3ee', 'رشت'],
  ['نیما رحیمی',   'Blaze',   'valorant', 2390, 60, 312,  4, '#a3e635', 'قم'],
  ['سامان فلاحی',  'Vortex',  'cs2',      2350, 63, 287, -1, '#a78bfa', 'یزد'],
  ['کیان مرادی',   'Echo',    'fc',       2299, 69, 221,  2, '#34d399', 'کرمان'],
  ['آرمان بهرامی', 'Nyx',     'pubgm',    2245, 55, 398, -3, '#fb7185', 'ارومیه'],
]

export const PLAYERS: Player[] = RAW.map((r, i) => ({
  rank: i + 1, name: r[0], tag: r[1], disc: r[2],
  points: r[3], winrate: r[4], matches: r[5], trend: r[6], color: r[7], city: r[8],
}))

export function getPlayer(tag: string): Player | undefined {
  return PLAYERS.find((p) => p.tag.toLowerCase() === tag.toLowerCase())
}

export function tierOf(rank: number): { label: string; color: string } {
  if (rank <= 3)  return { label: 'افسانه', color: '#f5c84b' }
  if (rank <= 10) return { label: 'الماس',  color: '#22d3ee' }
  return                 { label: 'استاد',  color: '#94a3b8' }
}

export function rankColor(rank: number): string {
  if (rank <= 3)  return '#f5c84b'
  if (rank <= 10) return '#22d3ee'
  return '#64748b'
}

export function trendOf(t: number): { label: string; color: string } {
  if (t > 0) return { label: `▲ ${t}`, color: '#34d399' }
  if (t < 0) return { label: `▼ ${-t}`, color: '#fb7185' }
  return           { label: '—',        color: '#475569' }
}

export function avatarBg(color: string): string { return color + '22' }

export interface Competition {
  id: string; title: string; season: string; disc: Disc
  prize: number; teams: number
  status: 'live' | 'open' | 'soon' | 'done'
  statusLabel: string; format: string; date: string
}

export const COMPS: Competition[] = [
  { id: 'val-cl',   title: 'لیگ قهرمانان ولورنت', season: 'فصل ۵',   disc: 'valorant', prize: 250, teams: 64,  status: 'live', statusLabel: 'در حال برگزاری', format: 'حذفی دوگانه',   date: '۱۲ – ۲۸ تیر ۱۴۰۵' },
  { id: 'cs2-cup',  title: 'کاپ پاییزهٔ CS2',      season: 'دورهٔ ۳', disc: 'cs2',      prize: 120, teams: 32,  status: 'open', statusLabel: 'ثبت‌نام باز',    format: 'سوئیسی + حذفی', date: '۵ مهر ۱۴۰۵' },
  { id: 'pubgm-ml', title: 'مستر لیگ پابجی',        season: 'فصل ۲',   disc: 'pubgm',    prize:  80, teams: 48,  status: 'soon', statusLabel: 'به‌زودی',         format: 'امتیازی',        date: '۲۰ مهر ۱۴۰۵' },
  { id: 'fc-cup',   title: 'جام EA FC',              season: '۱۴۰۴',    disc: 'fc',       prize:  40, teams: 128, status: 'done', statusLabel: 'پایان‌یافته',     format: 'حذفی تک',        date: 'اسفند ۱۴۰۴' },
]

export function getComp(id: string): Competition | undefined {
  return COMPS.find((c) => c.id === id)
}

export function statusColor(s: Competition['status']): string {
  return s === 'live' ? '#34d399' : s === 'open' ? '#22d3ee' : s === 'soon' ? '#f5c84b' : '#64748b'
}

export function prizeBreakdown(prize: number) {
  const places = ['۱', '۲', '۳', '۴']
  const colors  = ['#f5c84b', '#cbd5e1', '#d6a77a', '#475569']
  return [0.5, 0.25, 0.15, 0.1].map((q, i) => ({
    place: places[i], color: colors[i],
    amount: `${(prize * q).toFixed(0)}M`,
  }))
}

export function sparkline(points: number): string {
  const arr: number[] = []
  const step = (points % 40) + 16
  for (let i = 7; i >= 0; i--) arr.push(Math.round(points - i * step + (i % 2 ? 14 : -10)))
  arr[7] = points
  const min = Math.min(...arr), max = Math.max(...arr)
  return arr.map((v, i) => {
    const x = (i / 7) * 100
    const y = 30 - ((v - min) / (max - min || 1)) * 26 - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export function honorsFor(rank: number) {
  const all = [
    { place: '۱', title: 'لیگ ملی ای‌اسپورت',     year: '۱۴۰۴', color: '#f5c84b' },
    { place: '۲', title: 'کاپ غرب آسیا',            year: '۱۴۰۴', color: '#cbd5e1' },
    { place: '۱', title: 'مستر کاپ زمستانه',        year: '۱۴۰۳', color: '#f5c84b' },
    { place: '۳', title: 'جام باشگاه‌های تهران',    year: '۱۴۰۳', color: '#d6a77a' },
    { place: '۴', title: 'دورهٔ تابستانهٔ آنلاین', year: '۱۴۰۲', color: '#475569' },
  ]
  if (rank === 1)   return all
  if (rank <= 3)    return all.slice(0, 4)
  if (rank <= 6)    return [all[1], all[3], all[4]]
  if (rank <= 10)   return [all[3], all[4]]
  return [all[4]]
}

export function recentMatches(p: Player) {
  const opps = PLAYERS.filter((o) => o.disc === p.disc && o.rank !== p.rank).slice(0, 5)
  const scoreMap: Record<Disc, string[]> = {
    valorant: ['13-8', '13-10', '11-13', '13-6', '9-13'],
    cs2:      ['16-12', '13-16', '16-9', '16-14', '10-16'],
    pubgm:    ['#1 · 18k', '#3 · 11k', '#5 · 8k', '#2 · 14k', '#7 · 6k'],
    fc:       ['3-1', '2-2', '0-2', '4-2', '1-3'],
  }
  return opps.map((o, i) => {
    const win = i !== 2 && i !== 4
    return { oppAt: '@' + o.tag, oppColor: o.color, score: scoreMap[p.disc][i],
      resLabel: win ? 'برد' : 'باخت',
      resColor: win ? '#34d399' : '#fb7185',
      resBg:    win ? '#34d39922' : '#fb718522' }
  })
}

export function roadmapStages(status: Competition['status']) {
  const stages = ['مرحلهٔ گروهی', 'یک‌هشتم نهایی', 'یک‌چهارم نهایی', 'نیمه‌نهایی', 'فینال']
  const curIdx = status === 'live' ? 1 : status === 'done' ? 5 : 0
  return stages.map((st, i) => {
    const done = i < curIdx, live = i === curIdx
    return {
      stage: st,
      label:  done ? 'پایان‌یافته' : live ? 'در جریان' : 'پیش‌رو',
      color:  done ? '#34d399'     : live ? '#22d3ee'   : '#475569',
      dotBg:  done || live ? (done ? '#34d399' : '#22d3ee') : '#1e293b',
    }
  })
}
