'use client'

type Variant = 'default' | 'leaderboard' | 'admin'

export default function PageLoading({ variant = 'default' }: { variant?: Variant }) {
  if (variant === 'leaderboard') {
    return (
      <div style={{ padding: '14px 16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="gl-skel" style={{ width: 120, height: 26, borderRadius: 8 }} />
          <div className="gl-skel" style={{ width: 48, height: 14, borderRadius: 6 }} />
        </div>
        <div className="gl-skel" style={{ height: 52, marginBottom: 12 }} />
        <div className="gl-skel" style={{ height: 42, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="gl-skel" style={{ width: 64, height: 32, borderRadius: 999, flexShrink: 0 }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="gl-skel" style={{ height: 76, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'admin') {
    return (
      <div style={{ padding: '16px 16px 28px' }}>
        <div className="gl-skel" style={{ width: 100, height: 24, marginBottom: 16, borderRadius: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="gl-skel" style={{ height: 72, borderRadius: 13 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="gl-skel" style={{ height: 96, borderRadius: 14 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 28px' }}>
      <div className="gl-skel" style={{ width: '55%', height: 28, marginBottom: 14, borderRadius: 8 }} />
      <div className="gl-skel" style={{ height: 140, marginBottom: 14, borderRadius: 14 }} />
      <div className="gl-skel" style={{ height: 88, marginBottom: 14, borderRadius: 14 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map(i => <div key={i} className="gl-skel" style={{ height: 64, borderRadius: 12 }} />)}
      </div>
    </div>
  )
}
