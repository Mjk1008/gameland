'use client'
import { useRouter } from 'next/navigation'
import CoverUploader from '@/components/CoverUploader'
import { competitionCoverUrl } from '@/lib/store'

export default function CompetitionCoverPanel({ id, hasCover }: { id: string; hasCover: boolean }) {
  const router = useRouter()
  const preview = hasCover ? competitionCoverUrl(id) : undefined

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
      label="کاور رویداد — روی کارت مسابقه در صفحهٔ اول و لیست مسابقات"
      hint="۱۶:۹ · مثلاً پوستر رویداد یا بنر اسپانسری"
      previewSrc={preview}
      onUpload={upload}
      onRemove={hasCover ? remove : undefined}
    />
  )
}
