'use client'
import { useRouter } from 'next/navigation'
import CoverUploader from '@/components/CoverUploader'
import { eventCoverUrl } from '@/lib/store'

export default function EventCoverPanel({ id, hasCover }: { id: string; hasCover: boolean }) {
  const router = useRouter()
  const preview = hasCover ? eventCoverUrl(id) : undefined

  async function upload(imageData: string) {
    const res = await fetch('/api/admin/event-cover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, imageData }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'ذخیره نشد')
    router.refresh()
  }

  async function remove() {
    const res = await fetch('/api/admin/event-cover', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'remove' }),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'حذف نشد')
    router.refresh()
  }

  return (
    <CoverUploader
      label="کاور رشته — روی کارت این رشته در اپ"
      hint="۱۶:۹ · مثلاً کاور بازی یا پوستر رشته"
      previewSrc={preview}
      onUpload={upload}
      onRemove={hasCover ? remove : undefined}
    />
  )
}
