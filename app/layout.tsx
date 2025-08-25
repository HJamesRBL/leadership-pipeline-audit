import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import SessionProvider from '@/components/SessionProvider'
import { getServerSession } from 'next-auth'
import './globals.css'

// Dynamically import Navigation with no SSR to avoid useSession during build
const Navigation = dynamic(() => import('@/components/Navigation'), {
  ssr: false
})

export const metadata: Metadata = {
  title: 'Leadership Pipeline Audit Platform | The RBL Group',
  description: 'Leadership Pipeline Audit Platform - The RBL Group',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

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