'use client'
import { useState } from 'react'
import { C, DISP } from '@/components/ui'
import type { AdminTodaySnapshot } from '@/lib/today-snapshot'
import StationGrid from './station-grid'
import QueueTabs from './queue-tabs'
import GroupAnnounceForm from './group-announce-form'

export default function TodayAdminClient({ initial }: { initial: AdminTodaySnapshot }) {
  const [data, setData] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const res = await fetch('/api/admin/today')
      if (res.ok) setData(await res.json())
    } catch {}
  }

  async function call(matchId: string) {
    const station = prompt('شماره‌ی ایستگاه؟')?.trim()
    if (!station) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/today/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, station }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      await refresh()
    } catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }

  async function resolveRef(matchId: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/today', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve-ref', matchId }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'انجام نشد')
      await refresh()
    } catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }

  const lateCount = data.counts.late + data.counts.absent
  const refCount = data.counts.ref

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.thi }}>تختهٔ روز</span>
          <span style={{ fontSize: 11, color: C.tmut }}>{data.stations.length} ایستگاه · {data.counts.playing + data.counts.late + data.counts.absent} بازیِ فعال</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {lateCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.live, background: C.liveSoft, borderRadius: 8, padding: '5px 9px' }}>{lateCount} دیرکرده</span>}
          {refCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, background: C.goldSoft, borderRadius: 8, padding: '5px 9px' }}>{refCount} داور</span>}
        </div>
      </div>

      <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.12em', fontWeight: 700 }}>STATIONS · ایستگاه‌ها</span>
          <StationGrid stations={data.stations} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: C.tmut, fontFamily: DISP, letterSpacing: '.12em', fontWeight: 700 }}>QUEUE · صف</span>
          <QueueTabs data={data} busy={busy} onCall={call} onResolveRef={resolveRef} />
        </div>

        <GroupAnnounceForm />
      </div>
    </div>
  )
}
