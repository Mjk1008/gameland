export const BEHAVIOR_VIEWS = [
  { key: 'overview', label: 'روند' },
  { key: 'funnel', label: 'قیف' },
  { key: 'retention', label: 'ماندگاری' },
  { key: 'paths', label: 'مسیرها' },
  { key: 'raw', label: 'رویدادها' },
] as const

export type BehaviorView = typeof BEHAVIOR_VIEWS[number]['key']
