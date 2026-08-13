'use client'
import { useRouter } from 'next/navigation'
import CoverUploader from '@/components/CoverUploader'

export default function CompetitionCoverPanel({ id, hasCover }: { id: string; hasCover: boolean }) {
  const router = useRouter()
  const preview = hasCover ? `/api/competition-cover/${id}` : undefined

  async function upload(imageData: string) {
    const res = await fetch('/api/admin/competition-cover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, imageData }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'ذخیره نشد')
    router.refresh()
  }

  async function remove() {
    const res = await fetch('/api/admin/competition-cover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'remove' }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'حذف نشد')
    router.refresh()
  }

  return (
    <CoverUploader
      label="کاور رویداد — صفحهٔ اول، لیست مسابقات و بالای صفحهٔ رویداد"
      hint="۱۶:۹ · یک منبع برای همهٔ جاها — پوستر رشته‌ها جداگانه از پنل هر رشته"
      previewSrc={preview}
      onUpload={upload}
      onRemove={hasCover ? remove : undefined}
    />
  )
}
