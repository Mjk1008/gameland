'use client'
import { C, DISP } from '@/components/ui'
import type { StationCard } from '@/lib/today-snapshot'

export default function StationGrid({ stations }: { stations: StationCard[] }) {
  if (stations.length === 0) {
    return <div style={{ fontSize: 12.5, color: C.tmut, textAlign: 'center', padding: '14px 0' }}>هنوز هیچ ایستگاهی صدا نشده</div>
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {stations.map(s => {
        const color = s.status === 'late' ? C.gold : C.live
        return (
          <div key={s.station} style={{ background: C.sf1, border: `1px solid ${color}`, borderRadius: 11, padding: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span dir="ltr" style={{ fontFamily: DISP, fontWeight: 800, fontSize: 32, color: C.thi, lineHeight: 1 }}>{s.station}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, paddingTop: 2, minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color }}>{s.status === 'late' ? 'دیرکرده' : 'درحالِ‌اجرا'}</span>
              <span style={{ fontSize: 11, color: C.thi, lineHeight: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.current}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
