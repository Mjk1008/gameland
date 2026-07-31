import { BackHeader } from '@/components/ui'
import MonitorContent from './monitor-content'

export const dynamic = 'force-dynamic'

export default function AiMonitorPage() {
  return (
    <div className="animate-fade-up">
      <BackHeader title="مانیتورینگ AI" href="/admin" />
      <MonitorContent />
    </div>
  )
}
