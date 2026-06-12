// Standalone demo of the ranking engine. Run: `npm run ranking:demo`
import { competitions, placements, players } from '../lib/seed'
import { computeRanking, honorsFor, TIER_LABEL_FA } from '../lib/ranking'

const ranks = computeRanking({
  players, competitions, placements,
  disciplineId: 'efootball',
  windowDays: 7 * 52 * 5,
})
const playerMap = new Map(players.map((p) => [p.id, p]))

console.log('\n🏆  GAMELAND — eFootball National Ranking (demo)\n')
console.log('Rank  Nickname    Name                       City        Points  Events  Best')
console.log('────  ──────────  ─────────────────────────  ──────────  ──────  ──────  ────')
ranks.slice(0, 15).forEach((e, i) => {
  const p = playerMap.get(e.playerId)!
  const rank = String(i + 1).padEnd(4)
  const nick = p.nickname.padEnd(10)
  const name = p.fullName.padEnd(26)
  const city = (p.city ?? '').padEnd(10)
  const pts = String(e.points).padStart(6)
  const evs = String(e.events).padStart(6)
  console.log(`${rank}  ${nick}  ${name}  ${city}  ${pts}  ${evs}  rank ${e.bestPlacement} (${TIER_LABEL_FA[e.bestTier]})`)
})

const champ = ranks[0]
if (champ) {
  const h = honorsFor(champ.playerId, competitions, placements)
  console.log(`\n🎖  Honors page for ${playerMap.get(champ.playerId)!.nickname}:\n`)
  h.forEach((x) => {
    const medal = x.rank === 1 ? '🏆' : x.rank === 2 ? '🥈' : x.rank === 3 ? '🥉' : `  #${x.rank}`
    console.log(`  ${medal}  ${x.date.slice(0,10)}  ${x.competitionName}  (${TIER_LABEL_FA[x.tier]})`)
  })
}
console.log()
