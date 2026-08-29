import { allRegistrations, getUserById, getEvent, hasReceipt, isTeamPartnerReg } from '@/lib/store'
import { C, BackHeader } from '@/components/ui'
import HistoryList from './list'

export const dynamic = 'force-dynamic'

// Reviewed registrations (approved / rejected) — the reconciliation trail.
// Admin-only via app/admin/layout.tsx guard.
export default function RequestHistoryPage() {
  const rows = allRegistrations()
    .filter(r => r.status !== 'pending' && !isTeamPartnerReg(r))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(r => {
      const u = getUserById(r.userId)
      return {
        regId: r.id,
        status: r.status as 'approved' | 'rejected',
        attempts: r.attempts,
        name: u?.name ?? 'کاربر حذف‌شده',
        tag: u?.tag ?? '—',
        phone: u?.phone ?? '',
        city: u?.city ?? '',
        event: getEvent(r.compId)?.title ?? 'مسابقهٔ حذف‌شده',
        hasReceipt: hasReceipt(r.id),
        at: r.createdAt,
      }
    })

  return (
    <div className="animate-fade-up">
      <BackHeader title="سوابق درخواست‌ها" href="/admin/requests" />
      <HistoryList rows={rows} />
    </div>
  )
}
