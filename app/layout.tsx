import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'

export const metadata: Metadata = {
  title: 'Leadership Pipeline Audit Platform | The RBL Group',
  description: 'Leadership Pipeline Audit Platform - The RBL Group',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav>
          <div className="nav-content">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Image
                src="/rbl-logo.png" // Update this to match your logo filename
                alt="The RBL Group"
                width={250}  // Increased width for landscape
                height={100} // Reduced height for landscape
                style={{ height: 'auto', width: 'auto', maxHeight: '50px', maxWidth: '180px' }}
                priority
              />
              <span style={{ 
                borderLeft: '1px solid #d1d5db',  // Thin gray line
                height: '40px',                    // Height of the line
                marginLeft: '0.5rem',              // Space before line
                marginRight: '0.5rem'              // Space after line
              }}></span>
              Leadership Pipeline Audit Platform
            </h1>
            <div className="space-x-4">
              <a href="/">Dashboard</a>
              <a href="/create">Create Audit</a>
              <a href="/results">View Results</a>
            </div>
          </div>
        </nav>
        <main style={{ minHeight: 'calc(100vh - 73px)', paddingTop: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  )
}