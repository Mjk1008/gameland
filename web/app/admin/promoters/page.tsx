import PromotersClient from './client'

export const dynamic = 'force-dynamic'

export default function PromotersAdminPage() {
  return (
    <div style={{ padding: '14px 16px 28px' }}>
      <PromotersClient />
    </div>
  )
}
