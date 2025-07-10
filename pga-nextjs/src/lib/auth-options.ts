import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import { createClient } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const supabase = createClient()
          
          // Check if user already exists
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single()

          if (!existingUser && fetchError?.code === 'PGRST116') {
            // User doesn't exist, create a new one
            // Generate a default nickname from email (user can change it later)
            const defaultNickname = user.email.split('@')[0].slice(0, 20)
            
            // Make sure nickname is unique by appending random numbers if needed
            let nickname = defaultNickname
            let counter = 1
            
            while (counter < 100) { // Safety limit
              const { data: nicknameCheck } = await supabase
                .from('users')
                .select('id')
                .eq('nickname', nickname)
                .single()
              
              if (!nicknameCheck) {
                break // Nickname is available
              }
              
              nickname = `${defaultNickname}${counter}`
              counter++
            }

            // Create the user record
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                email: user.email,
                nickname: nickname,
              })

            if (insertError) {
              console.error('Error creating user record:', insertError)
              // Still allow sign in even if user creation fails
              // They can set up their profile manually later
            } else {
              console.log(`Auto-created user record for ${user.email} with nickname ${nickname}`)
            }
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          // Still allow sign in even if there's an error
        }
      }
      
      return true
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Add custom properties safely
        Object.assign(session, { accessToken: token.accessToken });
        Object.assign(session.user, { id: token.userId as string })
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
} 