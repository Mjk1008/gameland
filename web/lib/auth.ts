import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserByPhone, verifyOtp } from './store'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
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
          // OTP verified but no account yet — caller must redirect to /signup
          return {
            id: '__new__',
            name: phone,
            email: phone,
            phone, role: 'gamer', tag: '',
          } as any
        }
        return {
          id: u.id, name: u.name, email: u.phone,
          phone: u.phone, role: u.role, tag: u.tag,
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid   = (user as any).id
        token.phone = (user as any).phone
        token.role  = (user as any).role
        token.tag   = (user as any).tag
      }
      return token
    },
    async session({ session, token }) {
      ;(session as any).uid   = token.uid
      ;(session as any).phone = token.phone
      ;(session as any).role  = token.role
      ;(session as any).tag   = token.tag
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-prod',
}
