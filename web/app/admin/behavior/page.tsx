import { BackHeader } from '@/components/ui'
import BehaviorContent from './content'

export const dynamic = 'force-dynamic'

export default function BehaviorPage() {
  return (
    <div className="animate-fade-up">
      <BackHeader title="رفتار کاربران" href="/admin" />
      <BehaviorContent />
    </div>
  )
}
