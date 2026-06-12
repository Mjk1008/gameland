import Link from 'next/link'
import { disciplines, players } from '@/lib/seed'

export default function PlayersIndex() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">بانک گیمرها</h1>
      <p className="text-muted">{players.length.toLocaleString('fa-IR')} بازیکن ثبت‌شده. (دادهٔ کامل ~۲٬۰۰۰ نفره در فاز بعدی ingest می‌شود.)</p>
      <div className="bg-panel rounded-2xl glow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-muted">
            <tr className="border-b divider">
              <th className="text-right px-5 py-3">نیک‌نیم</th>
              <th className="text-right px-5 py-3">نام</th>
              <th className="text-right px-5 py-3">شهر</th>
              <th className="text-right px-5 py-3">رشته‌ها</th>
              <th className="text-right px-5 py-3">سبک</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b divider last:border-b-0 hover:bg-bg/40">
                <td className="px-5 py-3 font-semibold">
                  <Link href={`/players/${p.id}`} className="hover:text-accent">{p.nickname}</Link>
                </td>
                <td className="px-5 py-3 text-muted">{p.fullName}</td>
                <td className="px-5 py-3 text-muted">{p.city}</td>
                <td className="px-5 py-3 text-muted">
                  {p.disciplines.map((dId) => disciplines.find((x) => x.id === dId)?.nameFa).join('، ')}
                </td>
                <td className="px-5 py-3 text-muted">{p.playStyle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
