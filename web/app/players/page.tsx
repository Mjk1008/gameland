import { redirect } from 'next/navigation'

// The old «گیمرها» page (an endless join-order grid) is superseded by the
// leaderboard, which does discovery properly (search, discipline filter,
// city league, your own rank). Old links land there.
export default function PlayersIndex() {
  redirect('/leaderboard')
}
