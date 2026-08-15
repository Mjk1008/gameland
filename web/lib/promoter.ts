// Promoter / affiliate discount codes — isolated from home promos and referral @tag.
import { persist } from './db/persistence'
import { ticketPriceFor } from './ticket-price'
import { getUserById, unpaidAttempts, allRegistrations, getEvent, allUsers, type Registration, type User } from './store'

export interface PromoterCode {
  id: string
  code: string
  promoterUserId: string
  discountPercent: number
  commissionPercent: number
  compId?: string
  maxUses?: number
  useCount: number
  active: boolean
  expiresAt?: number
  note?: string
  createdAt: number
}

export type EarningStatus = 'pending' | 'paid'

export interface PromoterEarning {
  id: string
  codeId: string
  regId: string
  promoterUserId: string
  paidTickets: number
  buyerPaidTotal: number
  commissionAmount: number
  status: EarningStatus
  paidAt?: number
  paidNote?: string
  createdAt: number
}

export type CodeRequestStatus = 'pending' | 'approved' | 'rejected'

/** Promoter asks admin for a new code — admin must approve before code goes live. */
export interface PromoterCodeRequest {
  id: string
  promoterUserId: string
  requestedCode?: string
  compId?: string
  note?: string
  status: CodeRequestStatus
  rejectReason?: string
  reviewedBy?: string
  reviewedAt?: number
  approvedCodeId?: string
  createdAt: number
}

const MAX_CODES_PER_PROMOTER = 5
const MAX_PENDING_REQUESTS = 1

const codes = new Map<string, PromoterCode>()
const codeByStr = new Map<string, string>()
const earnings = new Map<string, PromoterEarning>()
const codeRequests = new Map<string, PromoterCodeRequest>()

function ms(v: unknown): number {
  return v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.now()
}

function normCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '')
}

function cid(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 10)
}

export function hydratePromoterCode(row: {
  id: string; code: string; promoterUserId: string; discountPercent: number; commissionPercent: number
  compId?: string | null; maxUses?: number | null; useCount?: number | null; active?: boolean | null
  expiresAt?: unknown; note?: string | null; createdAt: unknown
}) {
  const c: PromoterCode = {
    id: row.id,
    code: row.code,
    promoterUserId: row.promoterUserId,
    discountPercent: row.discountPercent,
    commissionPercent: row.commissionPercent,
    compId: row.compId ?? undefined,
    maxUses: row.maxUses ?? undefined,
    useCount: row.useCount ?? 0,
    active: row.active !== false,
    expiresAt: row.expiresAt ? ms(row.expiresAt) : undefined,
    note: row.note ?? undefined,
    createdAt: ms(row.createdAt),
  }
  codes.set(c.id, c)
  codeByStr.set(c.code, c.id)
}

export function hydratePromoterEarning(row: {
  id: string; codeId: string; regId: string; promoterUserId: string
  paidTickets: number; buyerPaidTotal: number; commissionAmount: number
  status: string; paidAt?: unknown; paidNote?: string | null; createdAt: unknown
}) {
  const e: PromoterEarning = {
    id: row.id,
    codeId: row.codeId,
    regId: row.regId,
    promoterUserId: row.promoterUserId,
    paidTickets: row.paidTickets,
    buyerPaidTotal: row.buyerPaidTotal,
    commissionAmount: row.commissionAmount,
    status: row.status as EarningStatus,
    paidAt: row.paidAt ? ms(row.paidAt) : undefined,
    paidNote: row.paidNote ?? undefined,
    createdAt: ms(row.createdAt),
  }
  earnings.set(e.id, e)
}

export function hydratePromoterCodeRequest(row: {
  id: string; promoterUserId: string; requestedCode?: string | null; compId?: string | null
  note?: string | null; status: string; rejectReason?: string | null; reviewedBy?: string | null
  reviewedAt?: unknown; approvedCodeId?: string | null; createdAt: unknown
}) {
  const r: PromoterCodeRequest = {
    id: row.id,
    promoterUserId: row.promoterUserId,
    requestedCode: row.requestedCode ?? undefined,
    compId: row.compId ?? undefined,
    note: row.note ?? undefined,
    status: row.status as CodeRequestStatus,
    rejectReason: row.rejectReason ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt ? ms(row.reviewedAt) : undefined,
    approvedCodeId: row.approvedCodeId ?? undefined,
    createdAt: ms(row.createdAt),
  }
  codeRequests.set(r.id, r)
}

export function allPromoterCodes(): PromoterCode[] {
  return [...codes.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export function getPromoterCode(id: string): PromoterCode | undefined {
  return codes.get(id)
}

export function getPromoterCodeByStr(raw: string): PromoterCode | undefined {
  const id = codeByStr.get(normCode(raw))
  return id ? codes.get(id) : undefined
}

export function codesForPromoter(userId: string): PromoterCode[] {
  return allPromoterCodes().filter(c => c.promoterUserId === userId && c.active)
}

export function earningsForPromoter(userId: string): PromoterEarning[] {
  return [...earnings.values()].filter(e => e.promoterUserId === userId).sort((a, b) => b.createdAt - a.createdAt)
}

export function pendingEarningsTotal(userId?: string): number {
  return [...earnings.values()]
    .filter(e => e.status === 'pending' && (!userId || e.promoterUserId === userId))
    .reduce((s, e) => s + e.commissionAmount, 0)
}

/** Buyer-facing price — promo stacks on ticketPriceFor().price; totalOffPercent vs original. */
export function buyerTicketPricing(compId: string, promoDiscountPercent = 0) {
  const { price, original, offPercent } = ticketPriceFor(compId)
  const promo = Math.max(0, Math.round(promoDiscountPercent))
  const unitPrice = promo > 0 ? Math.round(price * (1 - promo / 100)) : price
  const totalOffPercent = original > unitPrice ? Math.round((1 - unitPrice / original) * 100) : 0
  return { listPrice: price, original, baseOffPercent: offPercent, promoDiscountPercent: promo, unitPrice, totalOffPercent }
}

/** Per-ticket price after promo snapshot on the registration row. */
export function unitPriceForReg(reg: Registration): number {
  return buyerTicketPricing(reg.compId, reg.discountPercent ?? 0).unitPrice
}

/** Single pricing source — register, pay, admin requests must all use this. */
export function regPayableAmount(reg: Registration) {
  const ticketCount = unpaidAttempts(reg)
  const pricing = buyerTicketPricing(reg.compId, reg.discountPercent ?? 0)
  const code = reg.promoterCodeId ? codes.get(reg.promoterCodeId) : undefined
  return {
    ticketCount,
    unitPrice: pricing.unitPrice,
    total: ticketCount * pricing.unitPrice,
    discountPercent: reg.discountPercent ?? 0,
    totalOffPercent: pricing.totalOffPercent,
    originalUnitPrice: pricing.original,
    codeLabel: code?.code,
    commissionPercent: code?.commissionPercent,
  }
}

export type TicketSlotKind = 'settled' | 'free' | 'promo' | 'full'

export interface TicketSlot {
  n: number
  kind: TicketSlotKind
  unitPrice: number
  fullPrice: number
}

/** Admin review — per-seat breakdown + promoter context. Same pricing as regPayableAmount. */
export function regAdminReview(reg: Registration) {
  const pay = regPayableAmount(reg)
  const fullPrice = ticketPriceFor(reg.compId).price
  const code = reg.promoterCodeId ? codes.get(reg.promoterCodeId) : undefined
  const promoter = code ? getUserById(code.promoterUserId) : undefined
  const paid = reg.paidAttempts ?? 0
  const free = reg.freeAttempts ?? 0
  const slots: TicketSlot[] = []

  for (let i = 1; i <= reg.attempts; i++) {
    if (i <= paid) {
      slots.push({ n: i, kind: 'settled', unitPrice: unitPriceForReg(reg), fullPrice })
    } else if (i <= paid + free) {
      slots.push({ n: i, kind: 'free', unitPrice: 0, fullPrice })
    } else if (pay.discountPercent > 0) {
      slots.push({ n: i, kind: 'promo', unitPrice: pay.unitPrice, fullPrice })
    } else {
      slots.push({ n: i, kind: 'full', unitPrice: fullPrice, fullPrice })
    }
  }

  const newPaid = slots.filter(s => s.kind === 'promo' || s.kind === 'full')
  return {
    ...pay,
    slots,
    fullUnitPrice: fullPrice,
    expectedTotal: pay.total,
    promoterName: promoter?.name,
    promoterTag: promoter?.tag,
    newPaidCount: newPaid.length,
    freeCount: free,
    settledCount: paid,
    revenueTotal: newPaid.reduce((s, t) => s + t.unitPrice, 0),
  }
}

export function isPromoter(userId: string): boolean {
  const u = getUserById(userId)
  return !!u?.promoterActive
}

function defaultCodeForUser(u: User): string {
  let base = normCode(u.tag)
  if (base.length < 3) base = normCode('P' + u.id.slice(-8))
  if (!codeByStr.has(base)) return base
  for (let i = 2; i < 99; i++) {
    const cand = `${base}${i}`.slice(0, 24)
    if (!codeByStr.has(cand)) return cand
  }
  throw new Error('CODE_EXISTS')
}

function persistPromoterUser(u: User) {
  persist.user.update(u.id, {
    promoterActive: u.promoterActive,
    promoterDiscountPercent: u.promoterDiscountPercent,
    promoterCommissionPercent: u.promoterCommissionPercent,
    promoterActivatedAt: u.promoterActivatedAt,
  })
}

/** Admin activates partner — terms only; codes need separate approval or admin create. */
export function activatePromoter(userId: string, discountPercent: number, commissionPercent: number) {
  const u = getUserById(userId)
  if (!u || u.role !== 'gamer') throw new Error('USER_NOT_FOUND')
  const d = Math.round(discountPercent)
  const c = Math.round(commissionPercent)
  if (d < 1 || d > 90) throw new Error('DISCOUNT_RANGE')
  if (c < 0 || c > 50) throw new Error('COMMISSION_RANGE')

  u.promoterActive = true
  u.promoterDiscountPercent = d
  u.promoterCommissionPercent = c
  u.promoterActivatedAt = Date.now()
  persistPromoterUser(u)
  return u
}

export function deactivatePromoter(userId: string) {
  const u = getUserById(userId)
  if (!u) throw new Error('USER_NOT_FOUND')
  u.promoterActive = false
  persistPromoterUser(u)
  for (const pc of allPromoterCodes().filter(c => c.promoterUserId === userId && c.active)) {
    updatePromoterCode(pc.id, { active: false })
  }
}

export function statsForCode(codeId: string) {
  const regs = allRegistrations().filter(r => r.promoterCodeId === codeId && r.status !== 'rejected')
  const approved = regs.filter(r => r.status === 'approved').length
  const pending = regs.filter(r => r.status === 'pending').length
  const conversionPercent = (approved + pending) > 0 ? Math.round(approved / (approved + pending) * 100) : 0
  const code = codes.get(codeId)
  const mine = [...earnings.values()].filter(e => e.codeId === codeId)
  return {
    useCount: code?.useCount ?? 0,
    totalUses: regs.length,
    approved,
    pending,
    conversionPercent,
    pendingCommission: mine.filter(e => e.status === 'pending').reduce((s, e) => s + e.commissionAmount, 0),
  }
}

export function pendingCodeRequests() {
  return [...codeRequests.values()].filter(r => r.status === 'pending').sort((a, b) => a.createdAt - b.createdAt)
}

export function requestsForPromoter(userId: string) {
  return [...codeRequests.values()].filter(r => r.promoterUserId === userId).sort((a, b) => b.createdAt - a.createdAt)
}

function assertCanAddCode(promoterUserId: string) {
  const active = allPromoterCodes().filter(c => c.promoterUserId === promoterUserId && c.active)
  if (active.length >= MAX_CODES_PER_PROMOTER) throw new Error('CODE_LIMIT')
}

function assertNoPendingRequest(promoterUserId: string) {
  if (pendingCodeRequests().some(r => r.promoterUserId === promoterUserId)) throw new Error('REQUEST_PENDING')
}

/** Promoter submits a code request — admin must approve. */
export function submitCodeRequest(promoterUserId: string, input: { code?: string; note?: string; compId?: string }) {
  const u = getUserById(promoterUserId)
  if (!u?.promoterActive) throw new Error('NOT_ACTIVE')
  assertCanAddCode(promoterUserId)
  assertNoPendingRequest(promoterUserId)

  let requestedCode: string | undefined
  if (input.code?.trim()) {
    requestedCode = normCode(input.code)
    if (requestedCode.length < 3 || requestedCode.length > 24) throw new Error('CODE_LENGTH')
    if (codeByStr.has(requestedCode)) throw new Error('CODE_EXISTS')
  }

  const r: PromoterCodeRequest = {
    id: cid('pcr_'),
    promoterUserId,
    requestedCode,
    compId: input.compId || undefined,
    note: input.note?.trim() || undefined,
    status: 'pending',
    createdAt: Date.now(),
  }
  codeRequests.set(r.id, r)
  persist.promoterCodeRequest.insert(r)
  return r
}

/** Admin creates code directly (no request) or approves a pending request. */
export function adminIssueCode(
  promoterUserId: string,
  adminId: string,
  input: { code?: string; compId?: string; note?: string; requestId?: string },
) {
  const u = getUserById(promoterUserId)
  if (!u?.promoterActive) throw new Error('NOT_ACTIVE')

  let req: PromoterCodeRequest | undefined
  if (input.requestId) {
    req = codeRequests.get(input.requestId)
    if (!req || req.promoterUserId !== promoterUserId) throw new Error('NOT_FOUND')
    if (req.status !== 'pending') throw new Error('ALREADY_REVIEWED')
  } else {
    assertCanAddCode(promoterUserId)
  }

  const codeStr = input.code
    ? normCode(input.code)
    : req?.requestedCode
      ? normCode(req.requestedCode)
      : defaultCodeForUser(u)

  const c = createPromoterCode({
    code: codeStr,
    promoterUserId,
    discountPercent: u.promoterDiscountPercent ?? 20,
    commissionPercent: u.promoterCommissionPercent ?? 10,
    compId: input.compId ?? req?.compId,
    note: input.note ?? req?.note,
  })

  if (req) {
    req.status = 'approved'
    req.reviewedBy = adminId
    req.reviewedAt = Date.now()
    req.approvedCodeId = c.id
    persist.promoterCodeRequest.update(req)
  }
  return c
}

export function rejectCodeRequest(requestId: string, adminId: string, reason?: string) {
  const req = codeRequests.get(requestId)
  if (!req || req.status !== 'pending') throw new Error('NOT_FOUND')
  req.status = 'rejected'
  req.reviewedBy = adminId
  req.reviewedAt = Date.now()
  req.rejectReason = reason?.trim() || 'رد شد'
  persist.promoterCodeRequest.update(req)
  return req
}

export function deactivatePromoterCode(codeId: string) {
  const c = codes.get(codeId)
  if (!c) throw new Error('NOT_FOUND')
  return updatePromoterCode(codeId, { active: false })
}

export function reactivatePromoterCode(codeId: string) {
  const c = codes.get(codeId)
  if (!c) throw new Error('NOT_FOUND')
  if (c.active) return c
  assertCanAddCode(c.promoterUserId)
  return updatePromoterCode(codeId, { active: true })
}

export function updatePromoterTerms(userId: string, discountPercent: number, commissionPercent: number) {
  const u = getUserById(userId)
  if (!u?.promoterActive) throw new Error('NOT_ACTIVE')
  const d = Math.round(discountPercent)
  const c = Math.round(commissionPercent)
  if (d < 1 || d > 90) throw new Error('DISCOUNT_RANGE')
  if (c < 0 || c > 50) throw new Error('COMMISSION_RANGE')
  u.promoterDiscountPercent = d
  u.promoterCommissionPercent = c
  persistPromoterUser(u)
}

export function primaryCodeForPromoter(userId: string): PromoterCode | undefined {
  return allPromoterCodes().find(c => c.promoterUserId === userId && c.active)
    ?? allPromoterCodes().find(c => c.promoterUserId === userId)
}

export interface PromoterActivityRow {
  regId: string
  buyerTag: string
  buyerName: string
  eventTitle: string
  status: 'pending' | 'approved' | 'rejected'
  attempts: number
  createdAt: number
}

export function promoterDashboard(userId: string) {
  const u = getUserById(userId)
  if (!u?.promoterActive) return null

  const myCodes = allPromoterCodes().filter(c => c.promoterUserId === userId).sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt - a.createdAt)
  const activeCodes = myCodes.filter(c => c.active)
  const inactiveCodes = myCodes.filter(c => !c.active)
  const codeIds = new Set(myCodes.map(c => c.id))
  const regs = allRegistrations()
    .filter(r => r.promoterCodeId && codeIds.has(r.promoterCodeId) && r.status !== 'rejected')
    .sort((a, b) => b.createdAt - a.createdAt)

  const approved = regs.filter(r => r.status === 'approved').length
  const pending = regs.filter(r => r.status === 'pending').length
  const totalUses = regs.length
  const conversionPercent = (approved + pending) > 0 ? Math.round(approved / (approved + pending) * 100) : 0

  const mine = earningsForPromoter(userId)
  const pendingCommission = mine.filter(e => e.status === 'pending').reduce((s, e) => s + e.commissionAmount, 0)
  const paidCommission = mine.filter(e => e.status === 'paid').reduce((s, e) => s + e.commissionAmount, 0)

  const mapCode = (c: PromoterCode) => {
    const st = statsForCode(c.id)
    const activity = regs.filter(r => r.promoterCodeId === c.id).slice(0, 20).map(r => {
      const buyer = getUserById(r.userId)
      const ev = getEvent(r.compId)
      return {
        regId: r.id,
        buyerTag: buyer?.tag ?? '?',
        buyerName: buyer?.name ?? '?',
        eventTitle: ev?.title ?? r.compId,
        status: r.status as 'pending' | 'approved' | 'rejected',
        attempts: r.attempts,
        createdAt: r.createdAt,
      }
    })
    return {
      id: c.id,
      code: c.code,
      active: c.active,
      discountPercent: c.discountPercent,
      commissionPercent: c.commissionPercent,
      shareLink: `https://gamelandteam.ir/?code=${encodeURIComponent(c.code)}`,
      ...st,
      activity,
    }
  }

  const codes = activeCodes.map(mapCode)
  const inactive = inactiveCodes.map(mapCode)

  const myRequests = requestsForPromoter(userId)
  const pendingRequest = myRequests.find(r => r.status === 'pending') ?? null
  const lastRejected = myRequests.find(r => r.status === 'rejected') ?? null
  const canRequestNew = activeCodes.length < MAX_CODES_PER_PROMOTER && !pendingRequest

  return {
    discountPercent: u.promoterDiscountPercent ?? 0,
    commissionPercent: u.promoterCommissionPercent ?? 0,
    codes,
    inactiveCodes: inactive,
    primaryCodeId: codes[0]?.id ?? inactive[0]?.id,
    totalUses,
    approved,
    pending,
    conversionPercent,
    pendingCommission,
    paidCommission,
    pendingRequest: pendingRequest ? {
      id: pendingRequest.id,
      requestedCode: pendingRequest.requestedCode,
      note: pendingRequest.note,
      createdAt: pendingRequest.createdAt,
    } : null,
    lastRejected: lastRejected?.status === 'rejected' && lastRejected.reviewedAt && lastRejected.reviewedAt > Date.now() - 7 * 86400000
      ? { reason: lastRejected.rejectReason, at: lastRejected.reviewedAt }
      : null,
    canRequestNew,
    maxCodes: MAX_CODES_PER_PROMOTER,
  }
}

export function listActivePromoters() {
  return allUsers()
    .filter(u => u.promoterActive && u.role === 'gamer')
    .sort((a, b) => (b.promoterActivatedAt ?? 0) - (a.promoterActivatedAt ?? 0))
}

export function validatePromoCode(raw: string, buyerId: string, compId: string): PromoterCode {
  const c = getPromoterCodeByStr(raw)
  if (!c) throw new Error('PROMO_INVALID')
  if (!c.active) throw new Error('PROMO_INACTIVE')
  const promoter = getUserById(c.promoterUserId)
  if (!promoter?.promoterActive) throw new Error('PROMO_INACTIVE')
  if (c.expiresAt && c.expiresAt < Date.now()) throw new Error('PROMO_EXPIRED')
  if (c.maxUses != null && c.useCount >= c.maxUses) throw new Error('PROMO_EXHAUSTED')
  if (c.compId && c.compId !== compId) throw new Error('PROMO_WRONG_EVENT')
  if (c.promoterUserId === buyerId) throw new Error('PROMO_SELF')
  return c
}

const PROMO_ERRORS: Record<string, string> = {
  PROMO_INVALID: 'کد تخفیف معتبر نیست',
  PROMO_INACTIVE: 'این کد غیرفعال شده',
  PROMO_EXPIRED: 'مهلت این کد تمام شده',
  PROMO_EXHAUSTED: 'ظرفیت این کد پر شده',
  PROMO_WRONG_EVENT: 'این کد برای این رشته نیست',
  PROMO_SELF: 'نمی‌تونی از کد خودت استفاده کنی',
  PROMO_TOPUP: 'کد تخفیف فقط برای ثبت‌نام اول کار می‌کنه',
}

export function promoErrorMessage(code: string): string {
  return PROMO_ERRORS[code] ?? 'کد تخفیف معتبر نیست'
}

export function createPromoterCode(input: {
  code: string
  promoterUserId: string
  discountPercent: number
  commissionPercent: number
  compId?: string
  maxUses?: number
  expiresAt?: number
  note?: string
}): PromoterCode {
  const u = getUserById(input.promoterUserId)
  if (!u) throw new Error('USER_NOT_FOUND')
  const code = normCode(input.code)
  if (code.length < 3 || code.length > 24) throw new Error('CODE_LENGTH')
  if (codeByStr.has(code)) throw new Error('CODE_EXISTS')
  const discountPercent = Math.round(input.discountPercent)
  const commissionPercent = Math.round(input.commissionPercent)
  if (discountPercent < 1 || discountPercent > 90) throw new Error('DISCOUNT_RANGE')
  if (commissionPercent < 0 || commissionPercent > 50) throw new Error('COMMISSION_RANGE')

  const c: PromoterCode = {
    id: cid('pc_'),
    code,
    promoterUserId: input.promoterUserId,
    discountPercent,
    commissionPercent,
    compId: input.compId || undefined,
    maxUses: input.maxUses != null && input.maxUses > 0 ? Math.round(input.maxUses) : undefined,
    useCount: 0,
    active: true,
    expiresAt: input.expiresAt,
    note: input.note?.trim() || undefined,
    createdAt: Date.now(),
  }
  codes.set(c.id, c)
  codeByStr.set(c.code, c.id)
  persist.promoterCode.insert(c)
  return c
}

export function updatePromoterCode(id: string, patch: Partial<Pick<PromoterCode, 'active' | 'note' | 'maxUses' | 'expiresAt' | 'discountPercent' | 'commissionPercent'>>) {
  const c = codes.get(id)
  if (!c) throw new Error('NOT_FOUND')
  if (patch.active !== undefined) c.active = patch.active
  if (patch.note !== undefined) c.note = patch.note?.trim() || undefined
  if (patch.maxUses !== undefined) c.maxUses = patch.maxUses != null && patch.maxUses > 0 ? Math.round(patch.maxUses) : undefined
  if (patch.expiresAt !== undefined) c.expiresAt = patch.expiresAt
  if (patch.discountPercent !== undefined) {
    const d = Math.round(patch.discountPercent)
    if (d < 1 || d > 90) throw new Error('DISCOUNT_RANGE')
    c.discountPercent = d
  }
  if (patch.commissionPercent !== undefined) {
    const cp = Math.round(patch.commissionPercent)
    if (cp < 0 || cp > 50) throw new Error('COMMISSION_RANGE')
    c.commissionPercent = cp
  }
  persist.promoterCode.update(id, c)
  return c
}

export function attachPromoToRegistration(reg: Registration, promo: PromoterCode) {
  reg.promoterCodeId = promo.id
  reg.discountPercent = promo.discountPercent
  promo.useCount += 1
  persist.reg.update(reg.id, { promoterCodeId: promo.id, discountPercent: promo.discountPercent } as any)
  persist.promoterCode.update(promo.id, promo)
}

/** Call on admin approve — idempotent per reg attempt total. */
export function recordPromoterEarning(reg: Registration, prevPaidAttempts: number) {
  if (!reg.promoterCodeId) return
  const earningId = `pe_${reg.id}_${reg.attempts}`
  if (earnings.has(earningId)) return

  const promo = codes.get(reg.promoterCodeId)
  if (!promo) return

  const newlySettled = reg.attempts - prevPaidAttempts
  if (newlySettled <= 0) return

  const freeLeft = Math.max(0, (reg.freeAttempts ?? 0) - prevPaidAttempts)
  const paidTickets = Math.max(0, newlySettled - freeLeft)
  if (paidTickets <= 0) return

  const unitPrice = unitPriceForReg(reg)
  const buyerPaidTotal = paidTickets * unitPrice
  const commissionAmount = Math.round(buyerPaidTotal * promo.commissionPercent / 100)
  if (commissionAmount <= 0) return

  const e: PromoterEarning = {
    id: earningId,
    codeId: promo.id,
    regId: reg.id,
    promoterUserId: promo.promoterUserId,
    paidTickets,
    buyerPaidTotal,
    commissionAmount,
    status: 'pending',
    createdAt: Date.now(),
  }
  earnings.set(e.id, e)
  persist.promoterEarning.insert(e)
}

export function markEarningPaid(earningId: string, note?: string) {
  const e = earnings.get(earningId)
  if (!e) throw new Error('NOT_FOUND')
  e.status = 'paid'
  e.paidAt = Date.now()
  e.paidNote = note?.trim() || undefined
  persist.promoterEarning.update(e.id, e)
  return e
}

export function allPromoterEarnings(): PromoterEarning[] {
  return [...earnings.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export interface PromoterAnalyticsRow {
  at: number
  status: 'pending' | 'approved' | 'rejected'
  promoterUserId: string
  promoterName: string
  promoterTag: string
  codeId: string
  code: string
  attempts: number
  revenue: number
  commission: number
  commissionStatus?: EarningStatus
}

export interface PromoterAnalyticsRequestRow {
  at: number
  status: CodeRequestStatus
  promoterUserId: string
}

/** Admin analytics — serializable rows for client-side filtering. */
export function promoterAnalyticsSnap() {
  const partners = listActivePromoters()
  const activeCodes = allPromoterCodes().filter(c => c.active)
  const promoRegs = allRegistrations().filter(r => r.promoterCodeId)
  const allEarn = allPromoterEarnings()

  const rows: PromoterAnalyticsRow[] = promoRegs.map(r => {
    const code = codes.get(r.promoterCodeId!)
    const promoter = code ? getUserById(code.promoterUserId) : undefined
    const review = regAdminReview(r)
    const earning = allEarn.find(e => e.regId === r.id)
    return {
      at: r.createdAt,
      status: r.status,
      promoterUserId: code?.promoterUserId ?? '',
      promoterName: promoter?.name ?? '?',
      promoterTag: promoter?.tag ?? '?',
      codeId: r.promoterCodeId!,
      code: code?.code ?? '?',
      attempts: r.attempts,
      revenue: r.status === 'approved' ? review.revenueTotal : 0,
      commission: earning?.commissionAmount ?? 0,
      commissionStatus: earning?.status,
    }
  })

  const requestRows: PromoterAnalyticsRequestRow[] = [...codeRequests.values()].map(r => ({
    at: r.createdAt,
    status: r.status,
    promoterUserId: r.promoterUserId,
  }))

  return {
    activePromoters: partners.length,
    activeCodes: activeCodes.length,
    pendingCodeRequests: pendingCodeRequests().length,
    rows,
    requestRows,
  }
}
