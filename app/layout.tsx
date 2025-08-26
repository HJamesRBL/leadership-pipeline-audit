import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import SessionProvider from '@/components/SessionProvider'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import './globals.css'

export const metadata: Metadata = {
  title: 'Leadership Pipeline Audit Platform | The RBL Group',
  description: 'Leadership Pipeline Audit Platform - The RBL Group',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <Navigation />
          <main style={{ minHeight: 'calc(100vh - 73px)', paddingTop: '2rem' }}>
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  )
}