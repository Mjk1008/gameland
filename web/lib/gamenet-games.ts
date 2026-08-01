// Broader "what else do you have" game catalog for gamenet profiles — cosmetic
// only, never used for tournament/feeder eligibility (that stays on the 5
// disciplines in lib/mock-data.ts DISC). A gamenet can offer far more games
// than Gameland runs official competitions for; this is informational.
export interface CatalogGame { id: string; name: string }

export const GAMENET_GAMES: CatalogGame[] = [
  { id: 'pubg_mobile',  name: 'پابجی موبایل' },
  { id: 'pubg_pc',      name: 'پابجی PC' },
  { id: 'free_fire',    name: 'فری‌فایر' },
  { id: 'valorant',     name: 'ولورانت' },
  { id: 'cs2',          name: 'کانتر استرایک ۲' },
  { id: 'fortnite',     name: 'فورتنایت' },
  { id: 'apex',         name: 'اپکس لجندز' },
  { id: 'cod',          name: 'کالاف‌دیوتی' },
  { id: 'r6',           name: 'رینبو سیکس' },
  { id: 'rocket_league', name: 'راکت لیگ' },
  { id: 'gta5',         name: 'GTA V' },
  { id: 'mortal_kombat', name: 'مورتال کمبت' },
  { id: 'tekken',       name: 'تکن' },
  { id: 'street_fighter', name: 'استریت فایتر' },
  { id: 'wwe2k',        name: 'WWE 2K' },
  { id: 'forza',        name: 'فورتزا' },
  { id: 'god_of_war',   name: 'گاد آو وار' },
  { id: 'spiderman',    name: 'اسپایدرمن' },
  { id: 'minecraft',    name: 'ماینکرفت' },
  { id: 'among_us',     name: 'اِمانگ اس' },
]
