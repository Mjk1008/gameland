// Official ranking player cards (in /public/cards/<tag>.jpg). Keyed by lowercase
// tag. Shown as the hero on a player's profile when present.
const CARDS = new Set([
  'nimasadeghilm101', 'jt26', 'mahyartahvilian', 'vahidkooshki', 'matinmp',
  'ferifcone', 'mahdigezderazi', 'adamant', 'hammer', 'sajjadrashidi81',
])

export function playerCard(tag: string): string | null {
  const t = (tag || '').toLowerCase()
  return CARDS.has(t) ? `/cards/${t}.jpg` : null
}
