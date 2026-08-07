#!/usr/bin/env npx tsx
/**
 * Smoke eval for assistant FAQ + prize labels (no API key needed).
 * Run: npm run assistant:eval
 */
import { prizeMillionLabel, tomanFull } from '../lib/payment'
import { buildAssistantEntities, userRankLine } from '../lib/assistant-context'
import { tryAssistantFaq, normalizeAssistantQuery } from '../lib/assistant-faq'

const uid = 'u_eval'
const ent = buildAssistantEntities(uid)

const samples = [
  'چه مسابقاتی بازه؟',
  'چرا ثبت‌نامم تایید نشده؟',
  'چه خبر؟',
  'رتبه‌ام چنده؟',
  'قرعه‌کشی چطوری انجام می‌شه؟',
  'سهم رایگان چیه؟',
  'چند نفر ثبت نام کردن؟',
  'جایزه PES چنده؟',
  'مسابقات آنلاینه؟',
  'یه تریک FC26 بده',
]

let faqHits = 0
console.log('── prize labels ──')
for (const m of [100, 122, 80]) {
  console.log(`  ${m}M → ${prizeMillionLabel(m)}`)
}
console.log(`  ticket → ${tomanFull(500_000)}`)

console.log('\n── FAQ coverage ──')
for (const q of samples) {
  const ans = tryAssistantFaq(uid, q, ent)
  const hit = ans ? 'FAQ' : 'LLM'
  if (ans) faqHits++
  console.log(`  [${hit}] ${q}`)
  if (ans) console.log(`       → ${ans.slice(0, 90)}${ans.length > 90 ? '…' : ''}`)
}

console.log(`\n── summary ──`)
console.log(`  FAQ hit rate: ${faqHits}/${samples.length}`)
console.log(`  rank line: ${userRankLine(uid)}`)
console.log(`  normalize: "${normalizeAssistantQuery('  سلام!!!  ')}"`)

if (prizeMillionLabel(100).includes('100') && prizeMillionLabel(100).includes('میلیون')) {
  console.log('\n✓ prize fix OK')
} else {
  console.error('\n✗ prize label broken')
  process.exit(1)
}
