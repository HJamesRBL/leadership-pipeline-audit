import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'

export const metadata: Metadata = {
  title: 'Leadership Pipeline Audit Platform | The RBL Group',
  description: 'Leadership Pipeline Audit Platform - The RBL Group',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200">
          <div className="nav-content px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-0">
              {/* Logo and Title */}
              <h1 className="flex items-center gap-2 sm:gap-4">
                <Image
                  src="/rbl-logo.png"
                  alt="The RBL Group"
                  width={250}
                  height={100}
                  className="h-8 sm:h-10 lg:h-12 w-auto"
                  style={{ maxWidth: '120px' }}
                  priority
                />
                <span className="hidden sm:block border-l border-gray-300 h-8 lg:h-10"></span>
                <span className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">
                  <span className="hidden lg:inline">Leadership Pipeline Audit Platform</span>
                  <span className="lg:hidden">Pipeline Audit</span>
                </span>
              </h1>
              
              {/* Navigation Links */}
              <div className="flex gap-2 sm:gap-4 mt-2 sm:mt-0">
                <a 
                  href="/" 
                  className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <span className="sm:hidden">Home</span>
                  <span className="hidden sm:inline">Dashboard</span>
                </a>
                <a 
                  href="/create" 
                  className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <span className="sm:hidden">Create</span>
                  <span className="hidden sm:inline">Create Audit</span>
                </a>
                <a 
                  href="/results" 
                  className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <span className="sm:hidden">Results</span>
                  <span className="hidden sm:inline">View Results</span>
                </a>
              </div>
            </div>
          </div>
        </nav>
        
        <main className="min-h-screen bg-gray-50" style={{ paddingTop: '0' }}>
          {children}
        </main>
      </body>
    </html>
  )
}