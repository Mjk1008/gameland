import { redirect } from 'next/navigation'

// The full profile editor lives at /welcome (single source of truth for the
// gamer profile). Keep this path working by redirecting there.
export default function MeEditPage() {
  redirect('/welcome')
}
