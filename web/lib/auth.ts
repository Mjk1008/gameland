import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserByPhone, upsertGoogleUser, userNeedsProfile, getUserById, isAdminPhone, setUserRole } from './store'
import { verifyPassword } from './password'

// Admin allow-list: Google accounts whose email is here get role=admin on login.
// Set ADMIN_EMAILS="you@gmail.com,other@gmail.com" in env.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

// Google is only usable when the server can reach Google's OAuth endpoints.
// From Iran-hosted infra (Liara) those server-to-server calls are blocked
// (403 / timeout), so the callback fails and the user bounces back to /login.
// Keep the creds but only register the provider when explicitly switched on
// (GOOGLE_OAUTH_ENABLED=true), e.g. once an outbound proxy exists. Off by
// default → button hidden, no broken flow.
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  && process.env.GOOGLE_OAUTH_ENABLED === 'true'

// Basic in-memory brute-force guard for password login (single-instance Liara).
// Max 8 failed attempts per phone per 15 min window.
const loginAttempts = new Map<string, { n: number; ts: number }>()
const WINDOW = 15 * 60 * 1000
function loginBlocked(phone: string): boolean {
  const rec = loginAttempts.get(phone)
  if (!rec || Date.now() - rec.ts > WINDOW) return false
  return rec.n >= 8
}
function noteFail(phone: string) {
  const rec = loginAttempts.get(phone)
  if (!rec || Date.now() - rec.ts > WINDOW) loginAttempts.set(phone, { n: 1, ts: Date.now() })
  else rec.n++
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    // Google — primary path for real users. Only registered when creds are set.
    ...(googleEnabled ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })] : []),

    // Phone + OTP — kept for the seeded admin/test accounts (OTP 123456 in dev).
    CredentialsProvider({
      name: 'phone-password',
      credentials: {
        phone:    { label: 'موبایل', type: 'tel' },
        password: { label: 'گذرواژه', type: 'password' },
      },
      async authorize(credentials) {
        const phone = credentials?.phone?.trim() ?? ''
        const password = credentials?.password ?? ''
        if (!phone || !password) return null
        if (loginBlocked(phone)) return null
        const u = getUserByPhone(phone)
        if (!u || !u.passwordHash || !verifyPassword(password, u.passwordHash)) { noteFail(phone); return null }
        loginAttempts.delete(phone)
        return { id: u.id, name: u.name, phone: u.phone, role: u.role, tag: u.tag } as any
      },
    }),
  ],
  callbacks: {
    // Upsert our internal user for Google sign-ins. Runs once per sign-in.
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && profile) {
        const p = profile as any
        if (!p.email) return false
        upsertGoogleUser({
          googleSub: p.sub,
          email: p.email,
          name: p.name || p.email.split('@')[0],
          avatarUrl: p.picture,
          isAdmin: adminEmails().includes(String(p.email).toLowerCase()),
        })
      }
      return true
    },
    async jwt({ token, user, account, profile }) {
      // Google first sign-in: resolve our internal user from the profile.
      if (account?.provider === 'google' && profile) {
        const gu = upsertGoogleUser({
          googleSub: (profile as any).sub,
          email: (profile as any).email,
          name: (profile as any).name || '',
          avatarUrl: (profile as any).picture,
          isAdmin: adminEmails().includes(String((profile as any).email).toLowerCase()),
        })
        token.uid = gu.id
      } else if (user) {
        // Credentials path
        token.uid   = (user as any).id
        token.phone = (user as any).phone
      }
      // Always refresh role/tag/needsProfile from the store (kept current after
      // profile completion, role changes, etc.). Only overwrite when found.
      if (token.uid) {
        let u = getUserById(token.uid as string)
        // Promote allow-listed admin phones that registered as regular users.
        if (u && u.phone && u.role !== 'admin' && isAdminPhone(u.phone)) {
          setUserRole(u.id, 'admin')
          u = getUserById(token.uid as string)
        }
        if (u) {
          token.role         = u.role
          token.tag          = u.tag
          token.name         = u.name
          token.needsProfile = userNeedsProfile(u)
        }
      }
      return token
    },
    async session({ session, token }) {
      ;(session as any).uid          = token.uid
      ;(session as any).phone        = token.phone
      ;(session as any).role         = token.role
      ;(session as any).tag          = token.tag
      ;(session as any).needsProfile = token.needsProfile ?? false
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-prod',
}
