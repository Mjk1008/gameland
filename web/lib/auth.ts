import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserByPhone, verifyOtp, upsertGoogleUser, userNeedsProfile, getUserById } from './store'

// Admin allow-list: Google accounts whose email is here get role=admin on login.
// Set ADMIN_EMAILS="you@gmail.com,other@gmail.com" in env.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

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
      name: 'phone-otp',
      credentials: {
        phone: { label: 'موبایل', type: 'tel' },
        code:  { label: 'کد یک‌بار مصرف', type: 'text' },
      },
      async authorize(credentials) {
        const phone = credentials?.phone?.trim() ?? ''
        const code  = credentials?.code?.trim()  ?? ''
        if (!phone || !code) return null
        if (!verifyOtp(phone, code)) return null

        const u = getUserByPhone(phone)
        if (!u) {
          return { id: '__new__', name: phone, email: phone, phone, role: 'gamer', tag: '' } as any
        }
        return { id: u.id, name: u.name, email: u.phone, phone: u.phone, role: u.role, tag: u.tag } as any
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
        const u = getUserById(token.uid as string)
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
